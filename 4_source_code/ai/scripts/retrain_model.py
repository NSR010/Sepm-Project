"""Retrain the recommender on fresh data. Meant to be run by CRON (or Task Scheduler).

    uv run python -m scripts.retrain_model --reload-url http://localhost:8000
    uv run python -m scripts.retrain_model --fake --dry-run        # try it on fake data

Steps:
  1. Load users, content, engagements (Postgres, or data/fake with --fake)
  2. Rebuild content vectors (so newly uploaded content is included)
  3. Re-tune the hybrid's settings on a validation split (the current model's settings
     are always among the candidates)
  4. Quality gate on a separate test split: the new model must beat the popularity
     baseline. Otherwise nothing is replaced.
  5. Refit on all data, back up the old model, swap files in atomically
  6. Tell the running API to reload (POST /api/v1/model/reload)

Exit codes: 0 deployed (or dry run finished), 1 error, 2 skipped (not enough data,
gate failed, or another retrain is running). A summary is written to
models/last_retrain.json.

Example crontab (every night at 03:00):
  0 3 * * * cd /path/to/ai && uv run python -m scripts.retrain_model --reload-url http://localhost:8000 >> retrain.log 2>&1
"""
import argparse
import itertools
import json
import logging
import os
import shutil
import sys
import time
import urllib.request
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

from recommender import (
    DEFAULT_MODEL_PATH,
    HybridRecommender,
    as_rec_fn,
    build_interactions,
    evaluate,
    load_model,
    save_model,
    split_interactions,
)
from scripts import generate_vectors as gv

AI_ROOT = Path(__file__).resolve().parent.parent
K = 10
EXIT_OK, EXIT_ERROR, EXIT_SKIPPED = 0, 1, 2
log = logging.getLogger("retrain")


class Skipped(Exception):
    """Not an error: the run decided not to deploy."""


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
@contextmanager
def single_instance(lock_path: Path, stale_after_s: int = 2 * 3600):
    """Stop two retrains from running at once (e.g. a slow run overlapping the next cron tick)."""
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    if lock_path.exists() and time.time() - lock_path.stat().st_mtime > stale_after_s:
        log.warning("Removing stale lock %s", lock_path)
        lock_path.unlink()
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise Skipped("another retrain is already running (lock file exists)")
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        lock_path.unlink(missing_ok=True)


def load_frames(fake: bool) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if fake:
        d = AI_ROOT / "data" / "fake"
        users = pd.read_csv(d / "users.csv")
        users["preferences"] = users["preferences"].map(json.loads)
        return users, pd.read_csv(d / "content.csv"), pd.read_csv(d / "engagements.csv")
    from api.dependencies import load_content, load_engagements, load_users

    return load_users(), load_content(), load_engagements()


def previous_settings(model_path: Path) -> dict:
    """Settings of the model currently in production, or {} if there is none."""
    if not model_path.exists():
        return {}
    try:
        m = load_model(model_path)
    except Exception as e:  # e.g. the class changed since it was pickled
        log.warning("Could not read current model (%s), using default settings", e)
        return {}
    return {k: getattr(m, k) for k in
            ("alpha", "cf_dim", "pop_weight", "pref_boost", "cold_pref_boost", "min_warm")}


def candidate_settings(old: dict) -> list[dict]:
    base = {k: old[k] for k in ("cf_dim", "cold_pref_boost", "min_warm") if k in old}
    triples = set(itertools.product([0.3, 0.6], [1.0, 2.0, 4.0], [0.5, 1.0]))
    if old:
        triples.add((old["alpha"], old["pop_weight"], old["pref_boost"]))
    return [{**base, "alpha": a, "pop_weight": p, "pref_boost": b} for a, p, b in sorted(triples)]


def atomic_replace(write_fn, final: Path) -> None:
    """Write to a temporary file next to `final`, then rename over it."""
    final.parent.mkdir(parents=True, exist_ok=True)
    tmp = final.with_name(final.name + ".tmp")
    write_fn(tmp)
    os.replace(tmp, final)


def backup_and_prune(model_path: Path, keep: int) -> None:
    if not model_path.exists():
        return
    backups = model_path.parent / "backups"
    backups.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    shutil.copy2(model_path, backups / f"{model_path.stem}_{stamp}.pkl")
    old = sorted(backups.glob(f"{model_path.stem}_*.pkl"))
    for f in old[:-keep] if keep > 0 else old:
        f.unlink()


def call_reload(base_url: str, key: str | None) -> dict:
    req = urllib.request.Request(
        base_url.rstrip("/") + "/api/v1/model/reload",
        data=b"", method="POST", headers={"X-Internal-Key": key} if key else {},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


# --------------------------------------------------------------------------
# Main workflow
# --------------------------------------------------------------------------
def run(args: argparse.Namespace) -> dict:
    models_dir: Path = args.models_dir
    model_path = models_dir / DEFAULT_MODEL_PATH.name
    h5_path = models_dir / gv.DEFAULT_H5.name
    transformer_path = models_dir / gv.DEFAULT_TRANSFORMER.name

    users, content, eng = load_frames(args.fake)
    content = content.dropna(subset=["id", "type"]).reset_index(drop=True)
    inter = build_interactions(eng)
    log.info("Loaded %d users, %d content, %d interactions", len(users), len(content), len(inter))
    if len(content) < 3 or len(inter) < args.min_interactions:
        raise Skipped(f"not enough data (need >= {args.min_interactions} interactions and 3 content items)")

    embedder = gv.ContentEmbedder(dim=args.dim).fit(content)
    vectors = embedder.transform(content)
    ids = content["id"].to_numpy()
    types = content["type"].astype(str).tolist()
    n_items = len(ids)

    train_full, test = split_interactions(inter, seed=42)
    train, val = split_interactions(train_full, seed=7)
    if test.empty or val.empty:
        raise Skipped("too few active users to build validation and test splits")

    # ---- tune on validation ----
    old = previous_settings(model_path)
    best, best_ndcg = None, -1.0
    for params in candidate_settings(old):
        m = HybridRecommender(**params).fit(train, ids, vectors, types)
        ndcg = evaluate(as_rec_fn(m), train, val, users, n_items, K)[f"ndcg@{K}"]
        if ndcg > best_ndcg:
            best, best_ndcg = params, ndcg
    log.info("Best settings %s (validation NDCG@%d = %.3f)", best, K, best_ndcg)

    # ---- quality gate on test ----
    cand = HybridRecommender(**best).fit(train_full, ids, vectors, types)
    cand_test = evaluate(as_rec_fn(cand), train_full, test, users, n_items, K)
    pop_test = evaluate(lambda i, p, k: cand.recommend_popular(i, k), train_full, test, users, n_items, K)
    ndcg_c, ndcg_p = cand_test[f"ndcg@{K}"], pop_test[f"ndcg@{K}"]
    passed = ndcg_c >= ndcg_p * args.min_lift
    log.info("Test NDCG@%d: new model %.3f vs popularity %.3f -> gate %s",
             K, ndcg_c, ndcg_p, "passed" if passed else "FAILED")

    summary = {
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "deployed": False,
        "reason": None,
        "settings": best,
        "validationNdcg": best_ndcg,
        "testMetrics": cand_test,
        "popularityTestMetrics": pop_test,
        "counts": {"users": len(users), "content": n_items, "interactions": len(inter)},
    }
    if not passed and not args.force:
        summary["reason"] = "gate failed: new model does not beat the popularity baseline"
        return summary
    if args.dry_run:
        summary["reason"] = "dry run, nothing written"
        return summary

    # ---- refit on everything and deploy ----
    final = HybridRecommender(**best).fit(inter, ids, vectors, types)
    final.version = "v1-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")

    backup_and_prune(model_path, args.keep_backups)
    atomic_replace(lambda p: gv.save_h5(p, ids, vectors, types), h5_path)
    atomic_replace(lambda p: joblib.dump(embedder, p), transformer_path)
    atomic_replace(lambda p: save_model(final, p), model_path)  # model last
    summary.update(deployed=True, reason="deployed" if passed else "deployed with --force",
                   modelVersion=final.version)
    log.info("Deployed %s -> %s", final.version, model_path)
    return summary


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fake", action="store_true", help="use data/fake/*.csv instead of Postgres")
    ap.add_argument("--dry-run", action="store_true", help="train and evaluate, write nothing")
    ap.add_argument("--force", action="store_true", help="deploy even if the quality gate fails")
    ap.add_argument("--models-dir", type=Path, default=AI_ROOT / "models")
    ap.add_argument("--reload-url", help="base URL of the running API, e.g. http://localhost:8000")
    ap.add_argument("--reload-key", default=os.environ.get("INTERNAL_API_KEY"))
    ap.add_argument("--min-interactions", type=int, default=50)
    ap.add_argument("--min-lift", type=float, default=1.0,
                    help="new NDCG must be >= this x popularity NDCG to deploy")
    ap.add_argument("--dim", type=int, default=64)
    ap.add_argument("--keep-backups", type=int, default=5)
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    summary_path = args.models_dir / "last_retrain.json"

    try:
        with single_instance(args.models_dir / ".retrain.lock"):
            summary = run(args)
    except Skipped as e:
        log.warning("Skipped: %s", e)
        return EXIT_SKIPPED
    except Exception:
        log.exception("Retraining failed")
        return EXIT_ERROR

    if not args.dry_run:
        args.models_dir.mkdir(parents=True, exist_ok=True)
        summary_path.write_text(json.dumps(summary, indent=2))
    else:
        print(json.dumps(summary, indent=2))
        return EXIT_OK  # a dry run that finished is a success

    if not summary["deployed"]:
        log.warning("Not deployed: %s", summary["reason"])
        return EXIT_SKIPPED

    if args.reload_url:
        key = args.reload_key
        if key is None and not args.fake:
            try:
                from api.dependencies import get_settings

                key = get_settings().internal_api_key
            except Exception:
                key = None
        try:
            log.info("API reload: %s", call_reload(args.reload_url, key))
        except Exception as e:
            log.error("Model deployed, but API reload failed (%s). It will load the new model on restart.", e)
            return EXIT_ERROR
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
