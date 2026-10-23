"""Turn content metadata into embedding vectors.

    uv run python -m scripts.generate_vectors            # from Postgres
    uv run python -m scripts.generate_vectors --fake     # from data/fake/content.csv

Outputs (in ai/models/):
  vector_embeddings.h5   /content/ids, /content/vectors, /content/types  (+ attrs)
  vectorizer.joblib      fitted TF-IDF + SVD + type encoder, so NEW content (uploaded
                         after this run) can be embedded the same way with embed_new()

Method: text (title + description + tags) -> TF-IDF -> truncated SVD (dense, `dim`
dimensions), plus a weighted one-hot of the content type; every vector is L2-normalised,
so a dot product between two vectors is their cosine similarity.
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

AI_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_H5 = AI_ROOT / "models" / "vector_embeddings.h5"
DEFAULT_TRANSFORMER = AI_ROOT / "models" / "vectorizer.joblib"
TAG_REPEAT = 3  # tags are the strongest topical signal, so repeat them in the text


# --------------------------------------------------------------------------
# Text features
# --------------------------------------------------------------------------
def _as_dict(meta) -> dict:
    if isinstance(meta, dict):
        return meta
    if isinstance(meta, str):
        try:
            parsed = json.loads(meta)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def build_text(row: pd.Series) -> str:
    meta = _as_dict(row.get("metadata"))
    tags = meta.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    parts = [str(row.get("title") or ""), str(meta.get("description") or "")]
    parts += [" ".join(str(t) for t in tags)] * TAG_REPEAT
    return " ".join(p for p in parts if p).lower()


# --------------------------------------------------------------------------
# Fit / transform
# --------------------------------------------------------------------------
class ContentEmbedder:
    """TF-IDF -> SVD on text, concatenated with weighted one-hot content type."""

    def __init__(self, dim: int = 64, type_weight: float = 0.5):
        self.dim = dim
        self.type_weight = type_weight
        self.tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
        self.svd: TruncatedSVD | None = None
        self.types: list[str] = []

    def fit(self, content: pd.DataFrame) -> "ContentEmbedder":
        X = self.tfidf.fit_transform(content.apply(build_text, axis=1))
        n_comp = max(1, min(self.dim, X.shape[1] - 1, X.shape[0] - 1))
        self.svd = TruncatedSVD(n_components=n_comp, random_state=42).fit(X)
        self.types = sorted(content["type"].dropna().astype(str).unique())
        return self

    def transform(self, content: pd.DataFrame) -> np.ndarray:
        X = self.tfidf.transform(content.apply(build_text, axis=1))
        text_vec = normalize(self.svd.transform(X))
        onehot = np.zeros((len(content), len(self.types)))
        idx = {t: i for i, t in enumerate(self.types)}
        for r, t in enumerate(content["type"].astype(str)):
            if t in idx:  # unseen type -> all zeros
                onehot[r, idx[t]] = self.type_weight
        return normalize(np.hstack([text_vec, onehot])).astype(np.float32)


# --------------------------------------------------------------------------
# Storage
# --------------------------------------------------------------------------
def save_h5(path: Path, ids: np.ndarray, vectors: np.ndarray, types: list[str]) -> None:
    import h5py

    path.parent.mkdir(parents=True, exist_ok=True)
    with h5py.File(path, "w") as f:
        g = f.create_group("content")
        g.create_dataset("ids", data=np.asarray(ids, dtype=np.int64))
        g.create_dataset("vectors", data=vectors, compression="gzip")
        g.create_dataset("types", data=np.array(types, dtype=h5py.string_dtype()))
        f.attrs["dim"] = vectors.shape[1]
        f.attrs["n_items"] = vectors.shape[0]
        f.attrs["created_at"] = datetime.now(timezone.utc).isoformat()
        f.attrs["method"] = "tfidf-svd+type"


def load_h5(path: Path = DEFAULT_H5) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Returns (ids, vectors, types). Reused by training (Part 4) and the API (Part 5)."""
    import h5py

    with h5py.File(path, "r") as f:
        ids = f["content/ids"][:]
        vectors = f["content/vectors"][:]
        types = [t.decode() if isinstance(t, bytes) else str(t) for t in f["content/types"][:]]
    return ids, vectors, types


def embed_new(content: pd.DataFrame, transformer_path: Path = DEFAULT_TRANSFORMER) -> np.ndarray:
    """Embed content uploaded after the last run, using the saved transformer."""
    return joblib.load(transformer_path).transform(content)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def load_content_df(fake: bool) -> pd.DataFrame:
    if fake:
        return pd.read_csv(AI_ROOT / "data" / "fake" / "content.csv")
    from api.dependencies import load_content

    return load_content()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fake", action="store_true", help="read data/fake/content.csv")
    ap.add_argument("--dim", type=int, default=64)
    ap.add_argument("--type-weight", type=float, default=0.5)
    ap.add_argument("--out", type=Path, default=DEFAULT_H5)
    ap.add_argument("--transformer-out", type=Path, default=DEFAULT_TRANSFORMER)
    args = ap.parse_args()

    content = load_content_df(args.fake).dropna(subset=["id", "type"]).reset_index(drop=True)
    if len(content) < 3:
        raise SystemExit(f"Need at least 3 content rows to build vectors, got {len(content)}.")

    embedder = ContentEmbedder(dim=args.dim, type_weight=args.type_weight).fit(content)
    vectors = embedder.transform(content)

    save_h5(args.out, content["id"].to_numpy(), vectors, content["type"].astype(str).tolist())
    args.transformer_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(embedder, args.transformer_out)
    print(f"Saved {vectors.shape[0]} vectors x {vectors.shape[1]} dims -> {args.out}")
    print(f"Saved transformer -> {args.transformer_out}")

    # Quick sanity check: nearest neighbours of one random item
    rng = np.random.default_rng(0)
    i = int(rng.integers(len(content)))
    sims = vectors @ vectors[i]
    top = np.argsort(-sims)[1:4]
    print(f"\nSanity check, most similar to: {content['title'][i]} [{content['type'][i]}]")
    for j in top:
        print(f"  {sims[j]:.2f}  {content['title'][j]} [{content['type'][j]}]")


if __name__ == "__main__":
    main()
