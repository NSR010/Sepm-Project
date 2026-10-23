"""Sanity check for Part 1. Run from the ai/ folder:

    uv run python -m scripts.check_db
"""
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from api.dependencies import (
    get_engine,
    load_content,
    load_engagements,
    load_users,
)


def main() -> None:
    with get_engine().connect() as conn:
        print("Connected:", conn.execute(text("SELECT version()")).scalar())

    for name, loader in [
        ("users", load_users),
        ("content", load_content),
        ("engagements", load_engagements),
    ]:
        df = loader()
        print(f"\n{name}: {len(df)} rows")
        print(df.dtypes.to_string())

    # A write must fail. The WHERE clause matches nothing, so this is harmless
    # even if read-only protection were somehow missing.
    try:
        with get_engine().begin() as conn:
            conn.execute(text("UPDATE users SET name = name WHERE false"))
        print("\nWARNING: write succeeded, connection is NOT read-only!")
    except DBAPIError:
        print("\nRead-only check passed: write was rejected.")


if __name__ == "__main__":
    main()
