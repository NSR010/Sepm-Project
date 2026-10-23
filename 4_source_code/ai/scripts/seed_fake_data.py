"""Generate realistic fake data so the AI part can be built before the app has users.

    uv run python -m scripts.seed_fake_data --users 300 --content 1200 --seed 42

Writes users.csv, content.csv and engagements.csv to ai/data/fake/.
The columns match the class diagram (users, content, engagements).

Built-in patterns, so the model has something real to learn:
  * popularity is long-tailed (few hits, many unseen works)
  * users engage more with content types listed in their `preferences`
  * ~15% of users are cold-start (0-2 interactions)
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "fake"

CATEGORIES = ["art", "photography", "writing", "performance"]
TAGS = {
    "art": ["watercolor", "digital", "sketch", "abstract", "portrait", "sculpture"],
    "photography": ["landscape", "street", "macro", "portrait", "night", "travel"],
    "writing": ["poetry", "story", "essay", "memoir", "fantasy", "diary"],
    "performance": ["dance", "music", "theatre", "comedy", "singing", "cover"],
}
COMMENTS = [
    "Love this!", "Beautiful work", "So inspiring", "Great colors",
    "This made my day", "Amazing detail", "Keep creating!", "Wow",
]


def make_users(rng: np.random.Generator, n: int) -> pd.DataFrame:
    prefs = [
        rng.choice(CATEGORIES, size=int(rng.integers(1, 3)), replace=False).tolist()
        for _ in range(n)
    ]
    return pd.DataFrame(
        {
            "id": np.arange(1, n + 1),
            "name": [f"user_{i}" for i in range(1, n + 1)],
            "email": [f"user_{i}@example.com" for i in range(1, n + 1)],
            "preferences": [json.dumps(p) for p in prefs],
        }
    )


def make_content(rng: np.random.Generator, n: int, n_users: int) -> pd.DataFrame:
    types = rng.choice(CATEGORIES, size=n)
    rows = []
    for i, t in enumerate(types, start=1):
        tags = rng.choice(TAGS[t], size=int(rng.integers(1, 4)), replace=False).tolist()
        rows.append(
            {
                "id": i,
                "creatoruserid": int(rng.integers(1, n_users + 1)),
                "title": f"{t.title()} piece #{i} ({tags[0]})",
                "type": t,
                "metadata": json.dumps(
                    {"tags": tags, "description": f"A {tags[0]} {t} work.", "year": int(rng.integers(2018, 2027))}
                ),
            }
        )
    return pd.DataFrame(rows)


def make_engagements(
    rng: np.random.Generator, users: pd.DataFrame, content: pd.DataFrame
) -> pd.DataFrame:
    n_content = len(content)
    popularity = rng.pareto(1.3, n_content) + 1.0  # long tail
    ctype = content["type"].to_numpy()
    rows = []

    for uid, prefs_json in zip(users["id"], users["preferences"]):
        prefs = set(json.loads(prefs_json))
        if rng.random() < 0.15:
            k = int(rng.integers(0, 3))  # cold-start user
        else:
            k = int(np.clip(rng.lognormal(mean=3.0, sigma=0.7), 3, n_content // 2))
        if k == 0:
            continue

        match = np.array([t in prefs for t in ctype])
        weights = popularity * np.where(match, 4.0, 1.0)
        chosen = rng.choice(n_content, size=k, replace=False, p=weights / weights.sum())

        for idx in chosen:
            m = bool(match[idx])
            like = rng.random() < (0.65 if m else 0.25)
            save = rng.random() < (0.22 if m else 0.05)
            comment = rng.random() < (0.09 if m else 0.02)
            follow = rng.random() < (0.05 if m else 0.01)
            if not (like or save or comment or follow):
                continue  # view-only: tracked by analytics, not an engagement row
            rows.append(
                {
                    "userid": int(uid),
                    "contentid": int(content["id"].iloc[idx]),
                    "like": like,
                    "save": save,
                    "comment": str(rng.choice(COMMENTS)) if comment else None,
                    "follow": follow,
                }
            )

    df = pd.DataFrame(rows)
    df.insert(0, "id", np.arange(1, len(df) + 1))
    return df


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--users", type=int, default=300)
    ap.add_argument("--content", type=int, default=1200)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path, default=OUT_DIR)
    args = ap.parse_args()

    rng = np.random.default_rng(args.seed)
    users = make_users(rng, args.users)
    content = make_content(rng, args.content, args.users)
    engagements = make_engagements(rng, users, content)

    args.out.mkdir(parents=True, exist_ok=True)
    users.to_csv(args.out / "users.csv", index=False)
    content.to_csv(args.out / "content.csv", index=False)
    engagements.to_csv(args.out / "engagements.csv", index=False)
    print(
        f"Wrote {len(users)} users, {len(content)} content, "
        f"{len(engagements)} engagements to {args.out}"
    )


if __name__ == "__main__":
    main()
