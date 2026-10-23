"""Hybrid recommender used by training (notebook), retraining (script) and the API.

It lives in its own module (not in the notebook) because pickle stores a reference to the
class: a model saved from a notebook could not be loaded by FastAPI. Run everything from
the ai/ folder so `import recommender` works.

How it scores items for one user, given the items they engaged with (and a weight each):
  content score : cosine similarity between each item and the user's taste profile,
                  where the profile is the weighted sum of their items' vectors
  cf score      : "fold-in" through a truncated SVD of the user x item matrix, so
                  items liked by similar users score higher
  popularity    : small log-scaled boost
  preferences   : small boost for content types the user picked at sign-up
Users with fewer than `min_warm` known interactions get the cold-start path
(popularity, ranked first within their preferred types).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Mapping

import joblib
import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.decomposition import TruncatedSVD

AI_ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = AI_ROOT / "models" / "recommendation_v1.pkl"

# Starting weights for turning engagement flags into one implicit score.
SCORE_WEIGHTS = {"like": 1.0, "comment": 2.0, "save": 3.0, "follow": 2.0}


# --------------------------------------------------------------------------
# Data preparation
# --------------------------------------------------------------------------
def build_interactions(eng: pd.DataFrame, weights: Mapping[str, float] = SCORE_WEIGHTS) -> pd.DataFrame:
    """engagements rows -> one row per (userid, contentid) with a positive `score`."""
    e = eng.copy()
    for col in ("like", "save", "follow"):
        e[col] = e[col].fillna(False).astype(bool)
    e["has_comment"] = e["comment"].fillna("").astype(str).str.strip().ne("")
    e["score"] = (
        e["like"] * weights["like"]
        + e["has_comment"] * weights["comment"]
        + e["save"] * weights["save"]
        + e["follow"] * weights["follow"]
    )
    out = e.groupby(["userid", "contentid"], as_index=False)["score"].max()  # merge duplicates
    return out[out["score"] > 0].reset_index(drop=True)


def split_interactions(
    inter: pd.DataFrame, test_frac: float = 0.2, min_interactions: int = 5, seed: int = 42
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Per-user random hold-out. Users below `min_interactions` stay entirely in train."""
    rng = np.random.default_rng(seed)
    train_parts, test_parts = [], []
    for _, g in inter.groupby("userid"):
        if len(g) < min_interactions:
            train_parts.append(g)
            continue
        n_test = max(1, int(round(len(g) * test_frac)))
        order = rng.permutation(len(g))
        test_parts.append(g.iloc[order[:n_test]])
        train_parts.append(g.iloc[order[n_test:]])
    train = pd.concat(train_parts, ignore_index=True)
    test = pd.concat(test_parts, ignore_index=True) if test_parts else inter.iloc[0:0]
    return train, test


def _clean_prefs(p) -> list[str]:
    if p is None:
        return []
    if isinstance(p, str):
        return [p]
    try:
        return [str(x) for x in p]
    except TypeError:  # NaN or other scalar
        return []


def _minmax(x: np.ndarray) -> np.ndarray:
    lo, hi = float(x.min()), float(x.max())
    return (x - lo) / (hi - lo) if hi > lo else np.zeros_like(x)


# --------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------
class HybridRecommender:
    def __init__(
        self,
        alpha: float = 0.5,        # 1.0 = content only, 0.0 = collaborative only
        cf_dim: int = 32,
        pop_weight: float = 1.0,
        pref_boost: float = 0.5,
        cold_pref_boost: float = 0.5,
        min_warm: int = 3,
    ):
        self.alpha = alpha
        self.cf_dim = cf_dim
        self.pop_weight = pop_weight
        self.pref_boost = pref_boost
        self.cold_pref_boost = cold_pref_boost
        self.min_warm = min_warm
        self.version = "v1"
        self.trained_at: str | None = None

    # ---- training ----
    def fit(
        self,
        interactions: pd.DataFrame,          # userid, contentid, score
        content_ids: np.ndarray,
        vectors: np.ndarray,                 # (n_items, d), row i belongs to content_ids[i]
        content_types: list[str],
    ) -> "HybridRecommender":
        self.content_ids = np.asarray(content_ids, dtype=np.int64)
        self.index = {int(c): i for i, c in enumerate(self.content_ids)}
        self.vectors = np.asarray(vectors, dtype=np.float32)
        self.types = np.asarray(content_types).astype(str)
        n_items = len(self.content_ids)

        inter = interactions[interactions["contentid"].isin(self.index.keys())]
        u_idx, _ = pd.factorize(inter["userid"])
        i_idx = inter["contentid"].map(self.index).to_numpy()
        R = sparse.csr_matrix(
            (inter["score"].to_numpy(dtype=np.float32), (u_idx, i_idx)),
            shape=(int(u_idx.max()) + 1 if len(u_idx) else 0, n_items),
        )

        pop = np.asarray(R.sum(axis=0)).ravel()
        self.pop = np.log1p(pop) / np.log1p(pop).max() if pop.max() > 0 else np.zeros(n_items)

        self.item_factors = None
        k = min(self.cf_dim, n_items - 1, R.shape[0] - 1)
        if k >= 2:
            svd = TruncatedSVD(n_components=k, random_state=42).fit(R)
            self.item_factors = svd.components_.T.astype(np.float32)  # (n_items, k)

        self.trained_at = datetime.now(timezone.utc).isoformat()
        return self

    # ---- scoring ----
    def _user_vec(self, known: Mapping[int, float]) -> np.ndarray:
        u = np.zeros(len(self.content_ids), dtype=np.float32)
        for cid, s in known.items():
            u[self.index[cid]] = s
        return u

    def _pref_mask(self, prefs: list[str]) -> np.ndarray:
        return np.isin(self.types, prefs).astype(np.float32) if prefs else np.zeros(len(self.types), np.float32)

    def _score_warm(self, u: np.ndarray, prefs: list[str], alpha: float) -> np.ndarray:
        content = self.vectors @ (self.vectors.T @ u)
        if self.item_factors is not None:
            cf = self.item_factors @ (self.item_factors.T @ u)
        else:
            cf, alpha = np.zeros_like(content), 1.0
        s = alpha * _minmax(content) + (1 - alpha) * _minmax(cf)
        return s + self.pop_weight * self.pop + self.pref_boost * self._pref_mask(prefs)

    def _score_cold(self, prefs: list[str]) -> np.ndarray:
        return self.pop + self.cold_pref_boost * self._pref_mask(prefs)

    # ---- public API ----
    def recommend(
        self,
        interactions: Mapping[int, float] | None,
        preferences=None,
        k: int = 10,
        exclude_seen: bool = True,
        alpha: float | None = None,
    ) -> dict:
        """-> {"algoType": "hybrid" | "cold_start", "items": [{"contentId", "score"}, ...]}"""
        known = {int(c): float(s) for c, s in (interactions or {}).items() if int(c) in self.index}
        prefs = _clean_prefs(preferences)
        u = self._user_vec(known)
        warm = len(known) >= self.min_warm
        scores = (
            self._score_warm(u, prefs, self.alpha if alpha is None else alpha)
            if warm else self._score_cold(prefs)
        ).astype(np.float64)
        if exclude_seen:
            scores[u > 0] = -np.inf
        top = [i for i in np.argsort(-scores)[:k] if np.isfinite(scores[i])]
        return {
            "algoType": "hybrid" if warm else "cold_start",
            "items": [{"contentId": int(self.content_ids[i]), "score": float(scores[i])} for i in top],
        }

    def recommend_popular(self, interactions: Mapping[int, float] | None, k: int = 10) -> list[int]:
        """Popularity baseline, for comparison only."""
        seen = {int(c) for c in (interactions or {}) if int(c) in self.index}
        scores = self.pop.copy()
        for c in seen:
            scores[self.index[c]] = -np.inf
        return [int(self.content_ids[i]) for i in np.argsort(-scores)[:k] if np.isfinite(scores[i])]


# --------------------------------------------------------------------------
# Evaluation
# --------------------------------------------------------------------------
RecFn = Callable[[Mapping[int, float], list, int], list]  # (train items, prefs, k) -> content ids


def as_rec_fn(model: HybridRecommender, alpha: float | None = None) -> RecFn:
    return lambda inter, prefs, k: [
        r["contentId"] for r in model.recommend(inter, prefs, k, alpha=alpha)["items"]
    ]


def evaluate(
    rec_fn: RecFn, train: pd.DataFrame, test: pd.DataFrame, users: pd.DataFrame,
    n_items: int, k: int = 10,
) -> dict:
    """Precision@k, Recall@k, NDCG@k, hit rate, catalogue coverage over users with held-out items."""
    train_by_user = {u: dict(zip(g["contentid"], g["score"])) for u, g in train.groupby("userid")}
    test_by_user = {u: set(g["contentid"]) for u, g in test.groupby("userid")}
    prefs = users.set_index("id")["preferences"].to_dict()

    P, R, N, H, seen_items = [], [], [], [], set()
    for uid, relevant in test_by_user.items():
        recs = rec_fn(train_by_user.get(uid, {}), prefs.get(uid), k)
        seen_items.update(recs)
        hits = [1 if c in relevant else 0 for c in recs]
        n_hit = sum(hits)
        dcg = sum(h / np.log2(r + 2) for r, h in enumerate(hits))
        idcg = sum(1 / np.log2(r + 2) for r in range(min(len(relevant), k)))
        P.append(n_hit / k)
        R.append(n_hit / len(relevant))
        N.append(dcg / idcg if idcg else 0.0)
        H.append(1.0 if n_hit else 0.0)

    return {
        f"precision@{k}": float(np.mean(P)), f"recall@{k}": float(np.mean(R)),
        f"ndcg@{k}": float(np.mean(N)), "hit_rate": float(np.mean(H)),
        "coverage": len(seen_items) / n_items, "users_evaluated": len(test_by_user),
    }


# --------------------------------------------------------------------------
# Persistence
# --------------------------------------------------------------------------
def save_model(model: HybridRecommender, path: Path = DEFAULT_MODEL_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
    return path


def load_model(path: Path = DEFAULT_MODEL_PATH) -> HybridRecommender:
    return joblib.load(path)
