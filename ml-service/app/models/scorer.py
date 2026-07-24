# ============================================================
# Lead Scorer - ML Model for Lead Quality Prediction
# ============================================================
# Uses a trained GradientBoosting model for 3-class prediction:
#   high (60-100), moderate (35-59), low (0-34)
# Falls back to rule-based scoring if no model is available.
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
    Lead scoring engine that predicts lead quality as high/moderate/low (0-100).
    """

    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder_industry = None
        self.label_encoder_source = None
        self.is_loaded = False
        self.model_version = "2.0.0"
        self.feature_names = [
            "company_size", "industry_encoded", "source_encoded",
            "page_views", "time_on_site", "email_opened",
            "form_submitted", "demo_requested", "is_business_email",
        ]
        self.known_industries = [
            "technology", "finance", "healthcare", "manufacturing",
            "retail", "education", "other",
        ]
        self.known_sources = [
            "website", "referral", "social_media", "email_campaign",
            "paid_ads", "event", "organic",
        ]

    def load_model(self, model_path: Optional[str] = None):
        if model_path is None:
            model_path = Path(__file__).parent / "trained_model.joblib"
        try:
            if os.path.exists(model_path):
                model_data = joblib.load(model_path)
                self.model = model_data["model"]
                self.scaler = model_data.get("scaler")
                self.label_encoder_industry = model_data.get("label_encoder_industry")
                self.label_encoder_source = model_data.get("label_encoder_source")
                self.model_version = model_data.get("model_version", "2.0.0")
                self.is_loaded = True
                logger.info(f"Model loaded v{self.model_version} from {model_path}")
            else:
                logger.warning(f"No model at {model_path}, using rule-based fallback")
                self.is_loaded = True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.is_loaded = True

    def _encode_industry(self, industry: Optional[str]) -> int:
        if self.label_encoder_industry and industry:
            try:
                return int(self.label_encoder_industry.transform([industry.lower()])[0])
            except ValueError:
                pass
        return self.known_industries.index(industry.lower()) if industry and industry.lower() in self.known_industries else 6

    def _encode_source(self, source: Optional[str]) -> int:
        if self.label_encoder_source and source:
            try:
                return int(self.label_encoder_source.transform([source.lower()])[0])
            except ValueError:
                pass
        return self.known_sources.index(source.lower()) if source and source.lower() in self.known_sources else 6

    def _extract_features(
        self, email, company, industry, company_size, lead_source,
        page_views, time_on_site, email_opened, form_submitted, demo_requested,
    ) -> np.ndarray:
        industry_enc = self._encode_industry(industry)
        source_enc = self._encode_source(lead_source)
        email_engagement = 1.0 if email_opened else 0.0
        form_sub = 1.0 if form_submitted else 0.0
        demo_req = 1.0 if demo_requested else 0.0

        is_business_email = 1.0
        if email:
            domain = email.split("@")[-1].lower()
            personal = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "live.com"}
            if domain in personal:
                is_business_email = 0.0

        pv = float(page_views or 0)
        tos = float(time_on_site or 0)
        cs = float(company_size or 50)

        engagement_score = pv * 0.4 + tos * 0.008 + email_engagement * 5 + form_sub * 8 + demo_req * 12
        intent_score = form_sub * 10 + demo_req * 18 + email_engagement * 3
        company_engagement = np.log1p(cs) * pv * 0.01

        features = np.array([
            cs, float(industry_enc), float(source_enc),
            pv, tos, email_engagement, form_sub, demo_req,
            is_business_email, engagement_score, intent_score, company_engagement,
        ]).reshape(1, -1)
        return features

    def _rule_based_score(
        self, email, company, industry, company_size, lead_source,
        page_views, time_on_site, email_opened, form_submitted, demo_requested,
    ) -> Dict[str, Any]:
        score = 25
        factors = []

        if company_size:
            if company_size > 1000:
                score += 15; factors.append({"feature": "company_size", "impact": 15, "description": f"Enterprise ({company_size} employees)"})
            elif company_size > 100:
                score += 10; factors.append({"feature": "company_size", "impact": 10, "description": f"Mid-market ({company_size} employees)"})
            elif company_size > 10:
                score += 5; factors.append({"feature": "company_size", "impact": 5, "description": f"Small business ({company_size} employees)"})

        high_ind = {"technology", "finance", "healthcare"}
        if industry and industry.lower() in high_ind:
            score += 12; factors.append({"feature": "industry", "impact": 12, "description": f"High-value industry: {industry}"})

        if lead_source:
            src = lead_source.lower()
            if src in {"referral", "event"}:
                score += 14; factors.append({"feature": "lead_source", "impact": 14, "description": f"High-quality source: {lead_source}"})
            elif src == "organic":
                score += 10; factors.append({"feature": "lead_source", "impact": 10, "description": "Organic inbound"})
            elif src == "website":
                score += 6; factors.append({"feature": "lead_source", "impact": 6, "description": "Website inbound"})

        if page_views and page_views > 10:
            score += 8; factors.append({"feature": "page_views", "impact": 8, "description": f"High engagement: {page_views} page views"})
        elif page_views and page_views > 5:
            score += 4; factors.append({"feature": "page_views", "impact": 4, "description": f"Moderate engagement: {page_views} page views"})

        if time_on_site and time_on_site > 300:
            score += 7; factors.append({"feature": "time_on_site", "impact": 7, "description": f"Extended session: {time_on_site/60:.1f} min"})

        if email_opened:
            score += 6; factors.append({"feature": "email_engagement", "impact": 6, "description": "Email opened"})
        if form_submitted:
            score += 12; factors.append({"feature": "form_submitted", "impact": 12, "description": "Form submitted - strong intent"})
        if demo_requested:
            score += 18; factors.append({"feature": "demo_requested", "impact": 18, "description": "Demo requested - very high intent"})

        if email:
            domain = email.split("@")[-1].lower()
            personal = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com"}
            if domain not in personal:
                score += 5; factors.append({"feature": "email_domain", "impact": 5, "description": f"Business email: {domain}"})

        score = max(0, min(100, score))

        data_points = sum([
            1 if company_size else 0, 1 if industry else 0, 1 if lead_source else 0,
            1 if page_views else 0, 1 if time_on_site else 0,
            1 if email_opened is not None else 0,
            1 if form_submitted is not None else 0,
            1 if demo_requested is not None else 0,
        ])
        confidence = min(0.5 + (data_points * 0.0625), 0.95)

        if score >= 65:
            category = "high"
        elif score >= 40:
            category = "moderate"
        else:
            category = "low"

        return {"score": score, "category": category, "confidence": round(confidence, 2), "factors": factors}

    def predict(
        self, email, company=None, industry=None, company_size=None,
        lead_source=None, page_views=None, time_on_site=None,
        email_opened=None, form_submitted=None, demo_requested=None,
    ) -> Dict[str, Any]:
        if self.model is not None:
            try:
                features = self._extract_features(
                    email, company, industry, company_size,
                    lead_source, page_views, time_on_site,
                    email_opened, form_submitted, demo_requested,
                )
                if self.scaler:
                    features = self.scaler.transform(features)

                prediction = self.model.predict(features)[0]
                proba = self.model.predict_proba(features)[0]
                classes = list(self.model.classes_)
                confidence = float(max(proba))

                # Map to 0-100 score from probability
                cat_idx = classes.index(prediction) if prediction in classes else 0
                if prediction == "high":
                    score = int(65 + proba[cat_idx] * 35)
                elif prediction == "moderate":
                    score = int(40 + proba[cat_idx] * 25)
                else:
                    score = int(proba[cat_idx] * 40)

                score = max(0, min(100, score))

                # Build factors from feature importances
                factors = []
                if hasattr(self.model, "feature_importances_"):
                    importances = self.model.feature_importances_
                    for name, imp in sorted(zip(self.feature_names, importances), key=lambda x: -x[1])[:5]:
                        factors.append({
                            "feature": name,
                            "impact": round(float(imp * 100), 2),
                            "description": f"Model feature: {name}",
                        })

                return {"score": score, "category": prediction, "confidence": round(confidence, 2), "factors": factors}

            except Exception as e:
                logger.warning(f"ML prediction failed, using rule-based: {e}")

        return self._rule_based_score(
            email, company, industry, company_size,
            lead_source, page_views, time_on_site,
            email_opened, form_submitted, demo_requested,
        )
