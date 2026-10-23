"""Settings, read-only database access, data loaders and model loading for the AI service.

Used by three kinds of callers:
  * FastAPI routes      -> Depends(get_db), Depends(get_model), fetch_user_context()
  * notebooks / scripts -> load_users(), load_content(), load_engagements()
"""
import json
import logging
import re
import secrets
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Iterator

import pandas as pd
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session

from recommender import HybridRecommender, build_interactions, load_model

log = logging.getLogger("ai")

AI_ROOT = Path(__file__).resolve().parent.parent  # the ai/ folder
_PLAIN_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=AI_ROOT / ".env", extra="ignore")

    database_url: str  # postgresql+psycopg://user:pass@host:5432/dbname
    model_path: str = "models/recommendation_v1.pkl"
    vectors_path: str = "models/vector_embeddings.h5"
    # Shared secret the Node backend sends as the X-Internal-Key header.
    # Leave unset for local development only.
    internal_api_key: str | None = None
    # Name of the user-id column in the engagements table ("userId" or "userid").
    engagements_user_col: str = "userId"

    @field_validator("engagements_user_col")
    @classmethod
    def _must_be_plain_identifier(cls, v: str) -> str:
        if not _PLAIN_IDENTIFIER.match(v):
            raise ValueError("ENGAGEMENTS_USER_COL must be a plain column name")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_engine() -> Engine:
    """One shared engine. If not using a pooler, transactions can default read-only."""
    url = get_settings().database_url
    # Supabase PgBouncer (pooler port 6543) does not allow session -c startup options
    is_pgbouncer = "6543" in url or "pgbouncer=true" in url or "supabase" in url
    connect_args = {} if is_pgbouncer else {"options": "-c default_transaction_read_only=on"}

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        connect_args=connect_args,
    )


def get_db() -> Iterator[Session]:
    """FastAPI dependency: `db: Session = Depends(get_db)`."""
    with Session(get_engine()) as session:
        yield session


# --------------------------------------------------------------------------
# Security: the AI service is internal, only the Node backend should call it
# --------------------------------------------------------------------------
def require_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_api_key
    if not expected:
        return  # dev mode, startup logs a warning
    if not x_internal_key or not secrets.compare_digest(
        x_internal_key.encode(), expected.encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key")


# --------------------------------------------------------------------------
# Model loading (held on app.state so every request shares one copy)
# --------------------------------------------------------------------------
def resolve_model_path() -> Path:
    p = Path(get_settings().model_path)
    return p if p.is_absolute() else AI_ROOT / p


def load_model_into_state(app: FastAPI) -> bool:
    """Load the pickle and swap it in. On failure the previous model (if any) is kept."""
    path = resolve_model_path()
    if not path.exists():
        log.warning("Model file not found at %s; recommendations return 503 until it exists", path)
        return False
    try:
        model = load_model(path)
    except Exception:
        log.exception("Could not load model from %s", path)
        return False
    app.state.model = model  # one reference swap, safe while requests are running
    log.info("Loaded model %s (trained %s) from %s", model.version, model.trained_at, path)
    return True


def get_model(request: Request) -> HybridRecommender:
    model = getattr(request.app.state, "model", None)
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Recommendation model is not loaded. Train it (notebook or retrain script) first.",
        )
    return model


# --------------------------------------------------------------------------
# Per-request user data
# --------------------------------------------------------------------------
@dataclass
class UserContext:
    interactions: dict[int, float] = field(default_factory=dict)  # contentid -> implicit score
    preferences: list[str] = field(default_factory=list)


def _norm_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case and drop underscores so "userId", userid and user_id all become `userid`."""
    df.columns = df.columns.str.lower().str.replace("_", "", regex=False)
    return df


def fetch_user_context(db: Session, user_id: int) -> UserContext | None:
    """The user's preferences and engagement history, or None if the user does not exist."""
    row = db.execute(
        text("SELECT preferences FROM users WHERE id = :uid"), {"uid": user_id}
    ).first()
    if row is None:
        return None

    prefs = row[0]
    if isinstance(prefs, str):
        try:
            prefs = json.loads(prefs)
        except json.JSONDecodeError:
            prefs = [prefs]
    preferences = [str(p) for p in prefs] if isinstance(prefs, (list, tuple)) else []

    col = get_settings().engagements_user_col  # validated plain identifier
    rows = db.execute(
        text(f'SELECT * FROM engagements WHERE "{col}" = :uid'), {"uid": user_id}
    ).mappings().all()
    if not rows:
        return UserContext(preferences=preferences)

    eng = _norm_cols(pd.DataFrame([dict(r) for r in rows]))
    eng["userid"] = user_id
    inter = build_interactions(eng)
    interactions = dict(zip(inter["contentid"].astype(int), inter["score"].astype(float)))
    return UserContext(interactions=interactions, preferences=preferences)


# --------------------------------------------------------------------------
# DataFrame loaders (for notebooks, vector generation, training, retraining)
# --------------------------------------------------------------------------
def _read(query: str, params: dict | None = None) -> pd.DataFrame:
    with get_engine().connect() as conn:
        df = pd.read_sql_query(text(query), conn, params=params)
    return _norm_cols(df)


def load_users() -> pd.DataFrame:
    """id, name, preferences. The password column is deliberately never selected."""
    return _read("SELECT id, name, preferences FROM users")


def load_content() -> pd.DataFrame:
    """id, title, metadata, type (plus any other content columns)."""
    return _read("SELECT * FROM content")


def load_engagements() -> pd.DataFrame:
    """id, userid, contentid, like, comment, save, follow."""
    return _read("SELECT * FROM engagements")
