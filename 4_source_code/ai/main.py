"""FastAPI entry point for the Gallery of Wonders AI service.

Run from the ai/ folder:
    uv run uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.dependencies import get_settings, load_model_into_state
from api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = None
    load_model_into_state(app)  # a missing model is not fatal, /health reports it
    if not get_settings().internal_api_key:
        log.warning("INTERNAL_API_KEY is not set: the API is open. Fine for local dev only.")
    yield


app = FastAPI(title="Gallery of Wonders AI", version="1.0.0", lifespan=lifespan)
app.include_router(router)


@app.get("/health")
def health():
    model = app.state.model
    return {
        "status": "ok",
        "modelLoaded": model is not None,
        "modelVersion": getattr(model, "version", None),
        "trainedAt": getattr(model, "trained_at", None),
    }
