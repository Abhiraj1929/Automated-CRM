"""
FastAPI Application — Multi-tenant lead scoring API.
Supports vertical-specific model loading, prediction, training, and model info.
"""
import os
import sys
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .models.scorer import get_scorer, LeadScorer
from .models.vertical_config import SUPPORTED_VERTICALS, get_vertical_config, get_feature_names
from .models.train_vertical import train_tenant_model, train_all_verticals

# ============================================================
# App
# ============================================================
app = FastAPI(
    title="OptiRev Lead Scoring API",
    description="Multi-tenant ML lead scoring engine supporting B2B, Real Estate, E-Commerce, and Professional Services verticals.",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Pydantic Models
# ============================================================
class LeadScoreRequest(BaseModel):
    lead_id: Optional[str] = None
    vertical_type: Optional[str] = Field(None, description="Industry vertical: b2b, real_estate, ecommerce, services")
    email: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[int] = None
    lead_source: Optional[str] = None
    page_views: Optional[int] = None
    time_on_site: Optional[int] = None
    email_opened: Optional[bool] = None
    form_submitted: Optional[bool] = None
    demo_requested: Optional[bool] = None
    status: Optional[str] = None
    rating: Optional[str] = None
    activity_count: Optional[int] = None
    completed_activities: Optional[int] = None
    overdue_activities: Optional[int] = None
    has_opportunity: Optional[bool] = None
    opp_value: Optional[float] = None
    # Real Estate fields
    budget: Optional[float] = None
    property_type: Optional[str] = None
    pre_approved_mortgage: Optional[bool] = None
    property_views: Optional[int] = None
    scheduled_tours: Optional[int] = None
    location_match_score: Optional[float] = None
    days_since_inquiry: Optional[int] = None
    # E-Commerce fields
    cart_value: Optional[float] = None
    items_in_cart: Optional[int] = None
    items_viewed: Optional[int] = None
    cart_abandoned: Optional[bool] = None
    past_orders_count: Optional[int] = None
    avg_order_value: Optional[float] = None
    loyalty_member: Optional[bool] = None
    days_since_last_visit: Optional[int] = None
    # Services fields
    project_budget: Optional[float] = None
    timeline_urgency: Optional[str] = None
    service_type: Optional[str] = None
    form_complexity: Optional[int] = None
    consultation_requested: Optional[bool] = None
    engagement_score: Optional[float] = None

    class Config:
        extra = "allow"


class ScoreFactor(BaseModel):
    feature: str
    importance: float
    value: Any
    impact: str


class LeadScoreResponse(BaseModel):
    score: float
    category: str
    confidence: float
    factors: List[ScoreFactor]
    model_version: str
    vertical_type: str
    method: str
    lead_id: Optional[str] = None
    timestamp: str


class BatchScoreRequest(BaseModel):
    leads: List[LeadScoreRequest]
    vertical_type: Optional[str] = None


class BatchScoreResponse(BaseModel):
    results: List[LeadScoreResponse]
    count: int
    average_score: float
    vertical_type: str


class TrainRequest(BaseModel):
    vertical_type: str
    force_synthetic: bool = False


class TrainResponse(BaseModel):
    vertical_type: str
    model_version: str
    training_accuracy: float
    cv_accuracy: float
    trained_on_real_data: bool
    n_samples: int
    n_features: int


class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: Dict[str, bool]
    available_verticals: List[str]
    timestamp: str


# ============================================================
# Startup
# ============================================================
@app.on_event("startup")
async def startup_event():
    """Load all available models on startup."""
    scorer = get_scorer()
    results = scorer.load_all_models()
    loaded = [v for v, ok in results.items() if ok]
    print(f"[STARTUP] Loaded models for verticals: {loaded or 'none (training required)'}")
    print(f"[STARTUP] Supported verticals: {SUPPORTED_VERTICALS}")


# ============================================================
# Endpoints
# ============================================================
@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check with model load status per vertical."""
    scorer = get_scorer()
    model_info = scorer.get_model_info()
    return HealthResponse(
        status="healthy",
        version="4.0.0",
        models_loaded={v: scorer.is_loaded(v) for v in SUPPORTED_VERTICALS},
        available_verticals=SUPPORTED_VERTICALS,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/predict-score", response_model=LeadScoreResponse)
async def predict_score(request: LeadScoreRequest):
    """
    Score a single lead. Pass vertical_type for vertical-specific scoring,
    or omit for auto-detection based on lead fields.
    Non-blocking: CPU work runs in thread pool via asyncio.to_thread.
    """
    scorer = get_scorer()
    lead_data = request.model_dump(exclude_none=True)
    vertical_type = request.vertical_type

    result = await scorer.predict_async(lead_data, vertical_type=vertical_type)

    return LeadScoreResponse(
        score=result["score"],
        category=result["category"],
        confidence=result["confidence"],
        factors=[ScoreFactor(**f) for f in result["factors"]],
        model_version=result["model_version"],
        vertical_type=result["vertical_type"],
        method=result["method"],
        lead_id=request.lead_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/predict-score/batch", response_model=BatchScoreResponse)
async def predict_score_batch(request: BatchScoreRequest):
    """Score multiple leads. Non-blocking parallel execution."""
    scorer = get_scorer()
    vertical = request.vertical_type or "b2b"

    leads_data = []
    for lead in request.leads:
        ld = lead.model_dump(exclude_none=True)
        if not ld.get("vertical_type"):
            ld["vertical_type"] = vertical
        leads_data.append(ld)

    results_raw = await scorer.predict_batch_async(leads_data, vertical_type=vertical)

    results = []
    for lead_id, result in zip([l.lead_id for l in request.leads], results_raw):
        results.append(LeadScoreResponse(
            score=result["score"],
            category=result["category"],
            confidence=result["confidence"],
            factors=[ScoreFactor(**f) for f in result["factors"]],
            model_version=result["model_version"],
            vertical_type=result["vertical_type"],
            method=result["method"],
            lead_id=lead_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    avg_score = sum(r.score for r in results) / len(results) if results else 0

    return BatchScoreResponse(
        results=results,
        count=len(results),
        average_score=round(avg_score, 1),
        vertical_type=vertical,
    )


@app.get("/model/info")
async def model_info(vertical_type: Optional[str] = Query(None)):
    """Get model metadata. Omit vertical_type to get info for all loaded models."""
    scorer = get_scorer()
    return scorer.get_model_info(vertical_type)


@app.get("/verticals")
async def list_verticals():
    """List all supported industry verticals with their feature definitions."""
    verticals = []
    for v in SUPPORTED_VERTICALS:
        config = get_vertical_config(v)
        verticals.append({
            "vertical_type": v,
            "display_name": config.display_name,
            "description": config.description,
            "features": [f.name for f in config.features],
            "feature_count": len(config.features),
            "categorical_values": config.categorical_values,
            "target_mapping": config.target_mapping,
        })
    return {"verticals": verticals, "count": len(verticals)}


@app.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """Train a model for a specific vertical with atomic hot-swap."""
    if request.vertical_type not in SUPPORTED_VERTICALS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown vertical: {request.vertical_type}. Supported: {SUPPORTED_VERTICALS}",
        )

    result = await asyncio.to_thread(
        train_tenant_model,
        request.vertical_type,
        force_synthetic=request.force_synthetic,
    )

    # Hot-swap the new model atomically
    scorer = get_scorer()
    await asyncio.to_thread(scorer.load_model, request.vertical_type)

    return TrainResponse(**result)


@app.post("/train/all")
async def train_all(force_synthetic: bool = False):
    """Train models for all supported verticals."""
    results = await asyncio.to_thread(train_all_verticals, force_synthetic=force_synthetic)

    scorer = get_scorer()
    for r in results:
        await asyncio.to_thread(scorer.load_model, r["vertical_type"])

    return {"results": results, "count": len(results)}
