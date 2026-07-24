# ============================================================
# AI CRM ML Service - FastAPI Application
# ============================================================
# This service provides lead scoring predictions using a trained
# scikit-learn model. The model analyzes lead features and outputs
# a score between 0-100 indicating lead quality.
# ============================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import numpy as np
import uvicorn
import logging
from datetime import datetime

# Import the scoring engine
from app.models.scorer import LeadScorer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI CRM Lead Scoring Service",
    description="Machine learning-powered lead scoring API",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the lead scorer
lead_scorer = LeadScorer()


# ============================================================
# Pydantic Models for Request/Response
# ============================================================

class LeadScoreRequest(BaseModel):
    """Request model for lead scoring prediction"""
    lead_id: str
    email: str
    company: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[int] = None
    lead_source: Optional[str] = None
    page_views: Optional[int] = None
    time_on_site: Optional[float] = None
    email_opened: Optional[bool] = None
    form_submitted: Optional[bool] = None
    demo_requested: Optional[bool] = None
    status: Optional[str] = None
    rating: Optional[str] = None
    activity_count: Optional[int] = 0
    completed_activities: Optional[int] = 0
    overdue_activities: Optional[int] = 0
    has_opportunity: Optional[int] = 0
    opp_value: Optional[float] = 0


class ScoreFactor(BaseModel):
    """Individual factor contributing to the score"""
    feature: str
    impact: float
    description: str


class LeadScoreResponse(BaseModel):
    """Response model for lead scoring prediction"""
    lead_id: str
    score: int  # 0-100
    category: str  # "high", "moderate", "low"
    confidence: float  # 0-1
    factors: List[ScoreFactor]
    model_version: str
    timestamp: str


class BatchScoreRequest(BaseModel):
    """Request model for batch scoring"""
    leads: List[LeadScoreRequest]


class BatchScoreResponse(BaseModel):
    """Response model for batch scoring"""
    results: List[LeadScoreResponse]
    total_processed: int
    average_score: float


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_version: str
    timestamp: str


# ============================================================
# API Endpoints
# ============================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for the ML service"""
    return HealthResponse(
        status="healthy",
        model_loaded=lead_scorer.is_loaded,
        model_version=lead_scorer.model_version,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/predict-score", response_model=LeadScoreResponse)
async def predict_score(request: LeadScoreRequest):
    """
    Predict lead score based on features.
    
    The model analyzes various lead attributes and engagement metrics
    to produce a score from 0-100:
    - 70-100: High-value lead (priority outreach)
    - 40-69: Medium-value lead (nurture campaign)
    - 0-39: Low-value lead (automated engagement)
    """
    try:
        logger.info(f"Scoring lead: {request.lead_id}")
        
        # Run prediction
        prediction = lead_scorer.predict(
            email=request.email,
            company=request.company,
            industry=request.industry,
            company_size=request.company_size,
            lead_source=request.lead_source,
            page_views=request.page_views,
            time_on_site=request.time_on_site,
            email_opened=request.email_opened,
            form_submitted=request.form_submitted,
            demo_requested=request.demo_requested,
            status=request.status,
            rating=request.rating,
            activity_count=request.activity_count,
            completed_activities=request.completed_activities,
            overdue_activities=request.overdue_activities,
            has_opportunity=request.has_opportunity,
            opp_value=request.opp_value,
        )
        
        # Category comes directly from the model
        score = prediction["score"]
        category = prediction.get("category", "low")
        
        return LeadScoreResponse(
            lead_id=request.lead_id,
            score=score,
            category=category,
            confidence=prediction["confidence"],
            factors=prediction["factors"],
            model_version=lead_scorer.model_version,
            timestamp=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict-score/batch", response_model=BatchScoreResponse)
async def predict_score_batch(request: BatchScoreRequest):
    """
    Batch score multiple leads in a single request.
    Useful for scoring all leads at once or processing imports.
    """
    try:
        results = []
        
        for lead in request.leads:
            prediction = lead_scorer.predict(
                email=lead.email,
                company=lead.company,
                industry=lead.industry,
                company_size=lead.company_size,
                lead_source=lead.lead_source,
                page_views=lead.page_views,
                time_on_site=lead.time_on_site,
            )
            
            score = prediction["score"]
            category = prediction.get("category", "low")
            
            results.append(LeadScoreResponse(
                lead_id=lead.lead_id,
                score=score,
                category=category,
                confidence=prediction["confidence"],
                factors=prediction["factors"],
                model_version=lead_scorer.model_version,
                timestamp=datetime.utcnow().isoformat(),
            ))
        
        avg_score = sum(r.score for r in results) / len(results) if results else 0
        
        return BatchScoreResponse(
            results=results,
            total_processed=len(results),
            average_score=round(avg_score, 2),
        )
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.get("/model/info")
async def get_model_info():
    """Get information about the current model"""
    return {
        "model_version": lead_scorer.model_version,
        "model_type": "GradientBoostingClassifier",
        "features_used": lead_scorer.feature_names,
        "is_loaded": lead_scorer.is_loaded,
        "categories": ["high", "moderate", "low"],
        "accuracy": "see training logs",
    }


# ============================================================
# Application Startup
# ============================================================

@app.on_event("startup")
async def startup_event():
    """Initialize resources on application startup"""
    logger.info("🚀 Starting AI CRM ML Service...")
    lead_scorer.load_model()
    logger.info("✅ ML Service ready for predictions")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on application shutdown"""
    logger.info("👋 Shutting down ML Service...")


# ============================================================
# Run the application
# ============================================================

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
