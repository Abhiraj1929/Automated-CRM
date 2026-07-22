# ============================================================
# Lead Scorer - ML Model for Lead Quality Prediction
# ============================================================
# This module implements the scoring logic using a trained
# scikit-learn model. If no trained model is available,
# it falls back to a rule-based scoring system.
# ============================================================

import numpy as np
import os
import joblib
import logging
from typing import Optional, Dict, List, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class LeadScorer:
    """
    Lead scoring engine that predicts lead quality (0-100).
    
    Uses a trained RandomForestClassifier when available,
    otherwise falls back to heuristic-based scoring.
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.is_loaded = False
        self.model_version = "1.0.0"
        self.feature_names = [
            "company_size",
            "industry_encoded",
            "lead_source_encoded",
            "page_views",
            "time_on_site",
            "email_engagement",
            "form_submitted",
            "demo_requested",
        ]
        
        # Industry encoding for feature transformation
        self.industry_encoding = {
            "technology": 0,
            "finance": 1,
            "healthcare": 2,
            "manufacturing": 3,
            "retail": 4,
            "education": 5,
            "other": 6,
        }
        
        # Lead source encoding
        self.source_encoding = {
            "website": 0,
            "referral": 1,
            "social_media": 2,
            "email_campaign": 3,
            "paid_ads": 4,
            "event": 5,
            "other": 6,
        }
    
    def load_model(self, model_path: Optional[str] = None):
        """
        Load the trained model from disk.
        
        Args:
            model_path: Path to the saved model file.
                       If None, uses default path.
        """
        if model_path is None:
            model_path = Path(__file__).parent / "trained_model.joblib"
        
        try:
            if os.path.exists(model_path):
                model_data = joblib.load(model_path)
                self.model = model_data["model"]
                self.scaler = model_data.get("scanner")
                self.is_loaded = True
                logger.info(f"✅ Model loaded from {model_path}")
            else:
                logger.warning(f"⚠️  No trained model found at {model_path}")
                logger.info("📊 Using rule-based scoring as fallback")
                self.is_loaded = True  # We can still score with rules
                
        except Exception as e:
            logger.error(f"❌ Error loading model: {str(e)}")
            self.is_loaded = True  # Fall back to rule-based scoring
    
    def _extract_features(
        self,
        email: str,
        company: Optional[str],
        industry: Optional[str],
        company_size: Optional[int],
        lead_source: Optional[str],
        page_views: Optional[int],
        time_on_site: Optional[float],
        email_opened: Optional[bool],
        form_submitted: Optional[bool],
        demo_requested: Optional[bool],
    ) -> np.ndarray:
        """Extract and transform features for the model"""
        
        # Encode categorical features
        industry_encoded = self.industry_encoding.get(
            (industry or "other").lower(), 6
        )
        source_encoded = self.source_encoding.get(
            (lead_source or "other").lower(), 6
        )
        
        # Engagement features
        email_engagement = 1.0 if email_opened else 0.0
        form_sub = 1.0 if form_submitted else 0.0
        demo_req = 1.0 if demo_requested else 0.0
        
        # Normalize numerical features
        company_size_norm = min((company_size or 50) / 10000, 1.0)
        page_views_norm = min((page_views or 0) / 100, 1.0)
        time_on_site_norm = min((time_on_site or 0) / 600, 1.0)  # 10 min max
        
        features = np.array([
            company_size_norm,
            industry_encoded,
            source_encoded,
            page_views_norm,
            time_on_site_norm,
            email_engagement,
            form_sub,
            demo_req,
        ]).reshape(1, -1)
        
        return features
    
    def _rule_based_score(
        self,
        email: str,
        company: Optional[str],
        industry: Optional[str],
        company_size: Optional[int],
        lead_source: Optional[str],
        page_views: Optional[int],
        time_on_site: Optional[float],
        email_opened: Optional[bool],
        form_submitted: Optional[bool],
        demo_requested: Optional[bool],
    ) -> Dict[str, Any]:
        """
        Rule-based scoring when ML model is not available.
        
        Returns a dictionary with score, confidence, and contributing factors.
        """
        score = 50  # Base score
        factors = []
        
        # Company size factor (larger = higher score)
        if company_size:
            if company_size > 1000:
                score += 15
                factors.append({
                    "feature": "company_size",
                    "impact": 15,
                    "description": f"Large enterprise ({company_size} employees)"
                })
            elif company_size > 100:
                score += 10
                factors.append({
                    "feature": "company_size",
                    "impact": 10,
                    "description": f"Mid-market company ({company_size} employees)"
                })
            elif company_size > 10:
                score += 5
                factors.append({
                    "feature": "company_size",
                    "impact": 5,
                    "description": f"Small business ({company_size} employees)"
                })
        
        # Industry factor
        high_value_industries = ["technology", "finance", "healthcare"]
        if industry and industry.lower() in high_value_industries:
            score += 10
            factors.append({
                "feature": "industry",
                "impact": 10,
                "description": f"High-value industry: {industry}"
            })
        
        # Lead source factor
        high_quality_sources = ["referral", "event"]
        if lead_source and lead_source.lower() in high_quality_sources:
            score += 10
            factors.append({
                "feature": "lead_source",
                "impact": 10,
                "description": f"High-quality source: {lead_source}"
            })
        elif lead_source and lead_source.lower() == "website":
            score += 5
            factors.append({
                "feature": "lead_source",
                "impact": 5,
                "description": "Website inbound lead"
            })
        
        # Engagement factors
        if page_views and page_views > 10:
            score += 8
            factors.append({
                "feature": "page_views",
                "impact": 8,
                "description": f"High engagement: {page_views} page views"
            })
        elif page_views and page_views > 5:
            score += 4
            factors.append({
                "feature": "page_views",
                "impact": 4,
                "description": f"Moderate engagement: {page_views} page views"
            })
        
        if time_on_site and time_on_site > 300:  # 5 minutes
            score += 7
            factors.append({
                "feature": "time_on_site",
                "impact": 7,
                "description": f"Extended session: {time_on_site/60:.1f} minutes"
            })
        
        if email_opened:
            score += 5
            factors.append({
                "feature": "email_engagement",
                "impact": 5,
                "description": "Email opened - shows interest"
            })
        
        if form_submitted:
            score += 10
            factors.append({
                "feature": "form_submitted",
                "impact": 10,
                "description": "Form submission - strong intent signal"
            })
        
        if demo_requested:
            score += 15
            factors.append({
                "feature": "demo_requested",
                "impact": 15,
                "description": "Demo requested - very high intent"
            })
        
        # Email domain analysis (bonus for business emails)
        if email:
            domain = email.split("@")[-1].lower()
            personal_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
            if domain not in personal_domains:
                score += 5
                factors.append({
                    "feature": "email_domain",
                    "impact": 5,
                    "description": f"Business email domain: {domain}"
                })
        
        # Ensure score is within bounds
        score = max(0, min(100, score))
        
        # Calculate confidence based on data completeness
        data_points = sum([
            1 if company_size else 0,
            1 if industry else 0,
            1 if lead_source else 0,
            1 if page_views else 0,
            1 if time_on_site else 0,
            1 if email_opened is not None else 0,
            1 if form_submitted is not None else 0,
            1 if demo_requested is not None else 0,
        ])
        confidence = min(0.5 + (data_points * 0.0625), 0.95)
        
        return {
            "score": score,
            "confidence": round(confidence, 2),
            "factors": factors,
        }
    
    def predict(
        self,
        email: str,
        company: Optional[str] = None,
        industry: Optional[str] = None,
        company_size: Optional[int] = None,
        lead_source: Optional[str] = None,
        page_views: Optional[int] = None,
        time_on_site: Optional[float] = None,
        email_opened: Optional[bool] = None,
        form_submitted: Optional[bool] = None,
        demo_requested: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Predict lead score based on features.
        
        Args:
            email: Lead's email address
            company: Company name
            industry: Industry sector
            company_size: Number of employees
            lead_source: How the lead was acquired
            page_views: Number of pages viewed
            time_on_site: Time spent on site (seconds)
            email_opened: Whether lead opened emails
            form_submitted: Whether lead submitted a form
            demo_requested: Whether lead requested a demo
            
        Returns:
            Dictionary with score, confidence, and factors
        """
        # Use ML model if available
        if self.model is not None:
            try:
                features = self._extract_features(
                    email, company, industry, company_size,
                    lead_source, page_views, time_on_site,
                    email_opened, form_submitted, demo_requested
                )
                
                # Scale features if scaler exists
                if self.scaler:
                    features = self.scaler.transform(features)
                
                # Get prediction
                prediction = self.model.predict_proba(features)[0]
                
                # Convert probability to score (0-100)
                score = int(prediction[1] * 100) if len(prediction) > 1 else int(prediction[0] * 100)
                
                # Get feature importance for factors
                factors = []
                if hasattr(self.model, "feature_importances_"):
                    importances = self.model.feature_importances_
                    for i, (name, importance) in enumerate(zip(self.feature_names, importances)):
                        factors.append({
                            "feature": name,
                            "impact": round(float(importance * 100), 2),
                            "description": f"Feature importance: {name}"
                        })
                
                return {
                    "score": max(0, min(100, score)),
                    "confidence": round(float(max(prediction)), 2),
                    "factors": factors[:5],  # Top 5 factors
                }
                
            except Exception as e:
                logger.warning(f"ML prediction failed, using rule-based: {str(e)}")
        
        # Fall back to rule-based scoring
        return self._rule_based_score(
            email, company, industry, company_size,
            lead_source, page_views, time_on_site,
            email_opened, form_submitted, demo_requested
        )
