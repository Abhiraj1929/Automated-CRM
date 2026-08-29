"""
Lead Scorer — Multi-tenant scoring engine that loads vertical-specific models
and dynamically routes predictions based on vertical_type parameter.

v5.0 — Non-blocking: all CPU-bound work runs via asyncio.to_thread.
Atomic model hot-swap: new models replace old ones without prediction interruption.
"""
import os
import asyncio
import threading
import numpy as np
import joblib
from typing import Dict, List, Any, Optional, Tuple

from .vertical_config import (
    get_vertical_config, get_feature_names, get_feature_count,
    SUPPORTED_VERTICALS, VerticalConfig,
)
from .feature_engineering import (
    extract_features_from_lead, build_feature_matrix,
    VerticalLabelEncoders, is_business_email,
)


# ============================================================
# Multi-Tenant Model Registry — Thread-safe
# ============================================================
MODEL_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
FALLBACK_MODEL = os.path.join(os.path.dirname(__file__), "trained_model.joblib")


class LeadScorer:
    """
    Multi-tenant lead scoring engine.
    Loads per-vertical models from trained_model_{vertical}.joblib.
    Falls back to rule-based scoring if no model is available.

    Thread-safe: model dict is replaced atomically via copy-on-write.
    """

    def __init__(self):
        self._models: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()  # Protects model dict mutations
        self.default_vertical = "b2b"
        self._loaded = False

    @property
    def models(self) -> Dict[str, Dict[str, Any]]:
        return self._models

    def load_all_models(self) -> Dict[str, bool]:
        """Load all available vertical models. Returns load status per vertical."""
        results = {}
        for vertical in SUPPORTED_VERTICALS:
            results[vertical] = self.load_model(vertical)
        self._loaded = any(results.values())
        return results

    def load_model(self, vertical_type: str) -> bool:
        """Load a specific vertical's model from disk (atomic swap)."""
        model_path = os.path.join(MODEL_DIR, f"trained_model_{vertical_type}.joblib")

        if not os.path.exists(model_path) and vertical_type == "b2b" and os.path.exists(FALLBACK_MODEL):
            model_path = FALLBACK_MODEL

        if not os.path.exists(model_path):
            return False

        try:
            artifact = joblib.load(model_path)
            # Atomic swap — replace the entire vertical entry
            with self._lock:
                new_models = dict(self._models)
                new_models[vertical_type] = artifact
                self._models = new_models
            return True
        except Exception as e:
            print(f"Failed to load model for {vertical_type}: {e}")
            return False

    def hot_swap_model(self, vertical_type: str, artifact: Dict[str, Any]) -> None:
        """Hot-swap a model in-memory without reloading from disk."""
        with self._lock:
            new_models = dict(self._models)
            new_models[vertical_type] = artifact
            self._models = new_models
        print(f"[SCORER] Hot-swapped model for {vertical_type}")

    def is_loaded(self, vertical_type: Optional[str] = None) -> bool:
        if vertical_type:
            return vertical_type in self._models
        return self._loaded

    def get_model_info(self, vertical_type: Optional[str] = None) -> Dict[str, Any]:
        if vertical_type:
            artifact = self._models.get(vertical_type)
            if not artifact:
                return {"loaded": False, "vertical_type": vertical_type}
            return {
                "loaded": True,
                "vertical_type": artifact.get("vertical_type", vertical_type),
                "model_version": artifact.get("model_version", "unknown"),
                "trained_on_real_data": artifact.get("trained_on_real_data", False),
                "training_accuracy": artifact.get("training_accuracy", 0),
                "cv_accuracy": artifact.get("cv_accuracy", 0),
                "feature_names": artifact.get("feature_names", []),
                "n_features": len(artifact.get("feature_names", [])),
                "n_training_samples": artifact.get("n_training_samples", 0),
                "trained_at": artifact.get("trained_at", "unknown"),
            }

        return {
            "loaded_models": list(self._models.keys()),
            "available_verticals": SUPPORTED_VERTICALS,
            "models": {v: self.get_model_info(v) for v in self._models},
        }

    # ============================================================
    # Prediction — Non-blocking (asyncio.to_thread)
    # ============================================================
    async def predict_async(
        self,
        lead_data: Dict[str, Any],
        vertical_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Non-blocking prediction — runs CPU-bound work in thread pool."""
        return await asyncio.to_thread(self.predict, lead_data, vertical_type)

    async def predict_batch_async(
        self,
        leads: List[Dict[str, Any]],
        vertical_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Non-blocking batch prediction with chunked parallel execution."""
        # Chunk leads into groups of 50 for parallel processing
        chunk_size = 50
        chunks = [leads[i:i + chunk_size] for i in range(0, len(leads), chunk_size)]

        all_results = []
        for chunk in chunks:
            # Process each chunk in parallel via thread pool
            tasks = [
                asyncio.to_thread(self.predict, lead, vertical_type)
                for lead in chunk
            ]
            chunk_results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in chunk_results:
                if isinstance(result, Exception):
                    # Fallback: rule-based score on error
                    all_results.append(self._rule_based_score(
                        leads[len(all_results)], vertical_type or "b2b"
                    ))
                else:
                    all_results.append(result)

        return all_results

    def predict(
        self,
        lead_data: Dict[str, Any],
        vertical_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synchronous prediction (used by predict_async)."""
        if not vertical_type:
            vertical_type = self._detect_vertical(lead_data)

        # Snapshot the current model dict (safe even during hot-swap)
        models_snapshot = self._models

        if vertical_type in models_snapshot:
            try:
                return self._predict_with_model(lead_data, vertical_type, models_snapshot[vertical_type])
            except Exception:
                pass

        return self._rule_based_score(lead_data, vertical_type)

    def predict_batch(
        self,
        leads: List[Dict[str, Any]],
        vertical_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Synchronous batch prediction."""
        return [self.predict(lead, vertical_type=vertical_type) for lead in leads]

    # ============================================================
    # Internal: ML Prediction
    # ============================================================
    def _predict_with_model(
        self,
        lead_data: Dict[str, Any],
        vertical_type: str,
        artifact: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Score a lead using the ML model for a specific vertical."""
        model = artifact["model"]
        scaler = artifact["scaler"]
        feature_names = artifact.get("feature_names", get_feature_names(vertical_type))
        encoders = artifact.get("encoders")
        model_version = artifact.get("model_version", "unknown")

        feature_df, _ = build_feature_matrix(
            [lead_data], vertical_type, encoders=encoders, fit_encoders=False
        )

        for fname in feature_names:
            if fname not in feature_df.columns:
                feature_df[fname] = 0.0
        feature_df = feature_df[feature_names]

        X = feature_df.values.astype(float)
        X_scaled = scaler.transform(X)

        prediction = model.predict(X_scaled)[0]
        probas = model.predict_proba(X_scaled)[0]

        pred_label = str(prediction)
        max_proba = float(np.max(probas))

        score_map = {"high": 80, "moderate": 55, "low": 20}
        base_score = score_map.get(pred_label, 50)

        confidence = max_proba
        if confidence > 0.8:
            score = min(100, base_score + 15)
        elif confidence > 0.6:
            score = base_score + 5
        else:
            score = max(0, base_score - 10)

        if score >= 65:
            category = "high"
        elif score >= 40:
            category = "moderate"
        else:
            category = "low"

        importances = model.feature_importances_
        factors = []
        for fname, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
            value = lead_data.get(fname, 0)
            factors.append({
                "feature": fname,
                "importance": round(float(imp), 4),
                "value": value,
                "impact": "positive" if float(value) > 0 else "neutral",
            })

        return {
            "score": round(score, 1),
            "category": category,
            "confidence": round(confidence, 3),
            "factors": factors[:5],
            "model_version": model_version,
            "vertical_type": vertical_type,
            "method": "ml_model",
        }

    # ============================================================
    # Internal: Rule-Based Fallback
    # ============================================================
    def _rule_based_score(self, lead_data: Dict[str, Any], vertical_type: str) -> Dict[str, Any]:
        score = 25.0
        factors = []
        signals = self._extract_signals(lead_data, vertical_type)
        for signal_name, weight, value in signals:
            if value:
                score += weight
                factors.append({
                    "feature": signal_name,
                    "importance": round(weight / 50.0, 4),
                    "value": value,
                    "impact": "positive",
                })

        score = max(0, min(100, score))
        if score >= 65:
            category = "high"
        elif score >= 40:
            category = "moderate"
        else:
            category = "low"

        filled_fields = sum(1 for _, _, v in signals if v)
        confidence = min(0.95, 0.3 + (filled_fields / len(signals)) * 0.6)

        return {
            "score": round(score, 1),
            "category": category,
            "confidence": round(confidence, 3),
            "factors": sorted(factors, key=lambda x: -x["importance"])[:5],
            "model_version": f"rules-{vertical_type}",
            "vertical_type": vertical_type,
            "method": "rule_based",
        }

    def _extract_signals(self, lead_data: Dict[str, Any], vertical_type: str) -> List[Tuple[str, float, Any]]:
        signals = []

        if vertical_type == "b2b":
            cs = lead_data.get("company_size", 0)
            signals.append(("company_size", 20 if cs > 5000 else 10 if cs > 100 else 5, cs))
            signals.append(("is_business_email", 12, lead_data.get("is_business_email", False)))
            signals.append(("has_opportunity", 18, lead_data.get("has_opportunity", False)))
            ov = lead_data.get("opp_value", 0)
            signals.append(("opp_value", 15 if ov > 50000 else 8 if ov > 10000 else 3, ov))
            signals.append(("demo_requested", 10, lead_data.get("demo_requested", False)))
            signals.append(("form_submitted", 8, lead_data.get("form_submitted", False)))
            ts = lead_data.get("time_on_site", 0)
            signals.append(("time_on_site", 8 if ts > 300 else 4 if ts > 120 else 1, ts))
            pv = lead_data.get("page_views", 0)
            signals.append(("page_views", 6 if pv > 10 else 3 if pv > 5 else 1, pv))
            signals.append(("activity_count", 5 if lead_data.get("activity_count", 0) > 5 else 2, lead_data.get("activity_count", 0)))

        elif vertical_type == "real_estate":
            budget = lead_data.get("budget", 0)
            signals.append(("budget", 20 if budget > 500000 else 12 if budget > 200000 else 5, budget))
            signals.append(("pre_approved_mortgage", 18, lead_data.get("pre_approved_mortgage", False)))
            tours = lead_data.get("scheduled_tours", 0)
            signals.append(("scheduled_tours", 15 if tours > 2 else 8 if tours > 0 else 0, tours))
            views = lead_data.get("property_views", 0)
            signals.append(("property_views", 10 if views > 30 else 5 if views > 10 else 2, views))
            lm = lead_data.get("location_match_score", 0)
            signals.append(("location_match_score", 8 if lm > 0.7 else 4 if lm > 0.4 else 1, lm))
            signals.append(("engagement_score", 5, lead_data.get("engagement_score", 0)))

        elif vertical_type == "ecommerce":
            cv = lead_data.get("cart_value", 0)
            signals.append(("cart_value", 18 if cv > 100 else 10 if cv > 30 else 3, cv))
            orders = lead_data.get("past_orders_count", 0)
            signals.append(("past_orders_count", 15 if orders > 5 else 8 if orders > 0 else 2, orders))
            signals.append(("loyalty_member", 12, lead_data.get("loyalty_member", False)))
            signals.append(("cart_abandoned", -8, lead_data.get("cart_abandoned", False)))
            signals.append(("is_business_email", 5, lead_data.get("is_business_email", False)))
            iv = lead_data.get("items_viewed", 0)
            signals.append(("items_viewed", 5 if iv > 20 else 2 if iv > 5 else 0, iv))

        elif vertical_type == "services":
            budget = lead_data.get("project_budget", 0)
            signals.append(("project_budget", 18 if budget > 100000 else 10 if budget > 30000 else 4, budget))
            signals.append(("consultation_requested", 18, lead_data.get("consultation_requested", False)))
            urgency = str(lead_data.get("timeline_urgency", "")).lower()
            signals.append(("timeline_urgency", 12 if urgency in ("immediate", "within_month") else 5 if urgency == "within_quarter" else 1, urgency))
            signals.append(("engagement_score", 8 if lead_data.get("engagement_score", 0) > 70 else 3, lead_data.get("engagement_score", 0)))
            signals.append(("activity_count", 5 if lead_data.get("activity_count", 0) > 5 else 2, lead_data.get("activity_count", 0)))
            signals.append(("is_business_email", 5, lead_data.get("is_business_email", False)))

        return signals

    def _detect_vertical(self, lead_data: Dict[str, Any]) -> str:
        if any(k in lead_data for k in ("budget", "pre_approved_mortgage", "scheduled_tours", "property_views")):
            return "real_estate"
        if any(k in lead_data for k in ("cart_value", "past_orders_count", "loyalty_member", "items_in_cart")):
            return "ecommerce"
        if any(k in lead_data for k in ("project_budget", "timeline_urgency", "consultation_requested", "service_type")):
            return "services"
        return self.default_vertical


# ============================================================
# Singleton
# ============================================================
_scorer_instance: Optional[LeadScorer] = None


def get_scorer() -> LeadScorer:
    global _scorer_instance
    if _scorer_instance is None:
        _scorer_instance = LeadScorer()
    return _scorer_instance
