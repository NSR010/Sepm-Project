"""HTTP endpoints. The Node backend (mlServiceClient.js) calls these."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.dependencies import (
    fetch_user_context,
    get_db,
    get_model,
    load_model_into_state,
    require_internal_key,
)
from recommender import HybridRecommender

router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_internal_key)])


class RecommendedItem(BaseModel):
    contentId: int
    score: float


class RecommendationResponse(BaseModel):
    userId: int
    algoType: str          # "hybrid" or "cold_start", stored in recommendations.algoType
    modelVersion: str
    items: list[RecommendedItem]


@router.get("/recommendations/{userid}", response_model=RecommendationResponse)
def get_recommendations(
    userid: int,
    k: int = Query(10, ge=1, le=50, description="How many items to return"),
    exclude_seen: bool = Query(True, description="Hide content the user already engaged with"),
    model: HybridRecommender = Depends(get_model),
    db: Session = Depends(get_db),
):
    ctx = fetch_user_context(db, userid)
    if ctx is None:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")

    result = model.recommend(ctx.interactions, ctx.preferences, k=k, exclude_seen=exclude_seen)
    return RecommendationResponse(
        userId=userid,
        algoType=result["algoType"],
        modelVersion=model.version,
        items=result["items"],
    )


@router.post("/model/reload")
def reload_model(request: Request):
    """Called after retraining so the running service picks up the new pickle."""
    if not load_model_into_state(request.app):
        raise HTTPException(status_code=500, detail="Reload failed, previous model (if any) kept")
    model = request.app.state.model
    return {"status": "reloaded", "modelVersion": model.version, "trainedAt": model.trained_at}
