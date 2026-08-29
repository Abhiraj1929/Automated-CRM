"""
Feature Engineering — Dynamic, industry-specific feature extraction and encoding.
Replaces hardcoded B2B feature logic with vertical-aware pipelines.
"""
import re
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from sklearn.preprocessing import LabelEncoder, StandardScaler

from .vertical_config import VerticalConfig, get_vertical_config, get_feature_names


# ============================================================
# Email Analysis
# ============================================================
PERSONAL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
    "163.com", "qq.com", "live.com", "msn.com", "me.com",
}


def is_business_email(email: str) -> bool:
    """Check if email is from a corporate domain (not free email provider)."""
    if not email or "@" not in email:
        return False
    domain = email.split("@")[-1].lower().strip()
    return domain not in PERSONAL_DOMAINS and len(domain) > 4


# ============================================================
# Label Encoders — Per-Vertical
# ============================================================
class VerticalLabelEncoders:
    """Manages LabelEncoders for a specific vertical's categorical features."""

    def __init__(self, vertical_type: str):
        self.vertical_type = vertical_type
        self.config = get_vertical_config(vertical_type)
        self.encoders: Dict[str, LabelEncoder] = {}
        self._fitted = False

    def fit(self, df: pd.DataFrame) -> "VerticalLabelEncoders":
        """Fit encoders on categorical columns from the dataframe."""
        for feat in self.config.features:
            if feat.encoding == "label" and feat.name in df.columns:
                le = LabelEncoder()
                values = df[feat.name].fillna("unknown").astype(str).unique().tolist()
                known = self.config.categorical_values.get(feat.name, [])
                all_values = list(dict.fromkeys(known + values))
                le.fit(all_values)
                self.encoders[feat.name] = le
        self._fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform categorical columns using fitted encoders."""
        df = df.copy()
        for feat in self.config.features:
            if feat.encoding == "label" and feat.name in self.encoders:
                le = self.encoders[feat.name]
                col = df[feat.name].fillna("unknown").astype(str)
                df[feat.name] = col.apply(
                    lambda x: le.transform([x])[0] if x in le.classes_ else 0
                )
        return df

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        self.fit(df)
        return self.transform(df)

    def get_encoder_maps(self) -> Dict[str, Dict[str, int]]:
        """Return {column_name: {label: encoded_int}} mappings."""
        return {
            name: {label: int(idx) for idx, label in enumerate(le.classes_)}
            for name, le in self.encoders.items()
        }


# ============================================================
# Feature Extraction
# ============================================================
def extract_features_from_lead(lead: Dict[str, Any], vertical_type: str) -> Dict[str, Any]:
    """
    Extract raw feature dict from a lead record for a given vertical.
    Handles mapping from Supabase column names to vertical feature names.
    """
    config = get_vertical_config(vertical_type)

    if vertical_type == "b2b":
        return _extract_b2b_features(lead)
    elif vertical_type == "real_estate":
        return _extract_real_estate_features(lead)
    elif vertical_type == "ecommerce":
        return _extract_ecommerce_features(lead)
    elif vertical_type == "services":
        return _extract_services_features(lead)
    else:
        raise ValueError(f"Unknown vertical: {vertical_type}")


def _extract_b2b_features(lead: Dict[str, Any]) -> Dict[str, Any]:
    """B2B SaaS feature extraction from Supabase lead record."""
    email = lead.get("email", "")
    return {
        "company_size": _safe_int(lead.get("company_size", 0)),
        "industry": str(lead.get("industry", "other")).lower().strip(),
        "lead_source": str(lead.get("source", lead.get("lead_source", "website"))).lower().strip(),
        "lead_status": str(lead.get("status", lead.get("lead_status", "new"))).lower().strip(),
        "lead_rating": str(lead.get("rating", lead.get("lead_rating", "warm"))).lower().strip(),
        "activity_count": _safe_int(lead.get("activity_count", 0)),
        "completed_activities": _safe_int(lead.get("completed_activities", 0)),
        "overdue_activities": _safe_int(lead.get("overdue_activities", 0)),
        "has_opportunity": bool(lead.get("has_opportunity", False)),
        "opp_value": _safe_float(lead.get("opp_value", 0.0)),
        "is_business_email": is_business_email(email),
    }


def _extract_real_estate_features(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Real Estate feature extraction."""
    email = lead.get("email", "")
    return {
        "budget": _safe_float(lead.get("budget", lead.get("annual_revenue", 0))),
        "property_type": str(lead.get("property_type", lead.get("industry", "single_family"))).lower().strip(),
        "location_match_score": _clamp(_safe_float(lead.get("location_match_score", 0.5)), 0, 1),
        "pre_approved_mortgage": bool(lead.get("pre_approved_mortgage", False)),
        "property_views": _safe_int(lead.get("property_views", lead.get("page_views", 0))),
        "scheduled_tours": _safe_int(lead.get("scheduled_tours", 0)),
        "days_since_inquiry": _safe_int(lead.get("days_since_inquiry", 30)),
        "engagement_score": _clamp(_safe_float(lead.get("engagement_score", 50)), 0, 100),
        "lead_source": str(lead.get("source", lead.get("lead_source", "website"))).lower().strip(),
        "lead_status": str(lead.get("status", lead.get("lead_status", "new"))).lower().strip(),
        "is_business_email": is_business_email(email),
    }


def _extract_ecommerce_features(lead: Dict[str, Any]) -> Dict[str, Any]:
    """E-Commerce feature extraction."""
    email = lead.get("email", "")
    return {
        "cart_value": _safe_float(lead.get("cart_value", lead.get("annual_revenue", 0))),
        "items_in_cart": _safe_int(lead.get("items_in_cart", 0)),
        "items_viewed": _safe_int(lead.get("items_viewed", lead.get("page_views", 0))),
        "cart_abandoned": bool(lead.get("cart_abandoned", False)),
        "past_orders_count": _safe_int(lead.get("past_orders_count", 0)),
        "avg_order_value": _safe_float(lead.get("avg_order_value", 0)),
        "loyalty_member": bool(lead.get("loyalty_member", False)),
        "days_since_last_visit": _safe_int(lead.get("days_since_last_visit", lead.get("days_since_inquiry", 14))),
        "lead_source": str(lead.get("source", lead.get("lead_source", "organic_search"))).lower().strip(),
        "lead_status": str(lead.get("status", lead.get("lead_status", "new"))).lower().strip(),
        "is_business_email": is_business_email(email),
    }


def _extract_services_features(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Professional Services feature extraction."""
    email = lead.get("email", "")
    return {
        "project_budget": _safe_float(lead.get("project_budget", lead.get("annual_revenue", 0))),
        "timeline_urgency": str(lead.get("timeline_urgency", lead.get("industry", "undefined"))).lower().strip(),
        "service_type": str(lead.get("service_type", lead.get("industry", "other"))).lower().strip(),
        "form_complexity": _safe_int(lead.get("form_complexity", 5)),
        "consultation_requested": bool(lead.get("consultation_requested", False)),
        "days_since_inquiry": _safe_int(lead.get("days_since_inquiry", lead.get("days_since_inquiry", 30))),
        "engagement_score": _clamp(_safe_float(lead.get("engagement_score", 50)), 0, 100),
        "activity_count": _safe_int(lead.get("activity_count", 0)),
        "lead_source": str(lead.get("source", lead.get("lead_source", "website"))).lower().strip(),
        "lead_status": str(lead.get("status", lead.get("lead_status", "new"))).lower().strip(),
        "is_business_email": is_business_email(email),
    }


# ============================================================
# Label Generation
# ============================================================
def generate_vertical_label(
    lead: Dict[str, Any],
    vertical_type: str,
    opportunities: Optional[List[Dict]] = None,
) -> str:
    """
    Generate conversion label based on vertical-specific signals.
    Returns: "high", "moderate", or "low"
    """
    config = get_vertical_config(vertical_type)

    if vertical_type == "b2b":
        return _label_b2b(lead, opportunities or [])
    elif vertical_type == "real_estate":
        return _label_real_estate(lead)
    elif vertical_type == "ecommerce":
        return _label_ecommerce(lead)
    elif vertical_type == "services":
        return _label_services(lead)
    return "low"


def _label_b2b(lead: Dict, opportunities: List[Dict]) -> str:
    """B2B: high = closed_won opp, moderate = has opp or hot, low = cold/new."""
    for opp in opportunities:
        if opp.get("stage", "").lower() in ("closed won", "closed_won"):
            return "high"
    if opportunities:
        return "moderate"
    status = str(lead.get("status", "")).lower()
    rating = str(lead.get("rating", "")).lower()
    if status == "qualified" or rating == "hot":
        return "moderate"
    if status in ("new", "contacted") and rating in ("warm", "cold", ""):
        return "low"
    return "low"


def _label_real_estate(lead: Dict) -> str:
    """Real Estate: high = toured + pre-approved, moderate = viewed or engaged, low = new."""
    tours = _safe_int(lead.get("scheduled_tours", 0))
    pre_approved = bool(lead.get("pre_approved_mortgage", False))
    views = _safe_int(lead.get("property_views", lead.get("page_views", 0)))
    status = str(lead.get("status", "")).lower()

    if tours >= 2 and pre_approved:
        return "high"
    if tours >= 1 or (views > 20 and pre_approved) or status in ("negotiating", "touring"):
        return "moderate"
    return "low"


def _label_ecommerce(lead: Dict) -> str:
    """E-Commerce: high = checkout or purchased, moderate = cart active, low = browsing."""
    cart_val = _safe_float(lead.get("cart_value", 0))
    orders = _safe_int(lead.get("past_orders_count", 0))
    loyalty = bool(lead.get("loyalty_member", False))
    status = str(lead.get("status", "")).lower()

    if status in ("purchased", "checkout_initiated") or (orders > 3 and loyalty):
        return "high"
    if cart_val > 50 or orders > 0 or status in ("cart_active", "browsing"):
        return "moderate"
    return "low"


def _label_services(lead: Dict) -> str:
    """Services: high = consultation + high budget, moderate = engaged, low = new."""
    consultation = bool(lead.get("consultation_requested", False))
    budget = _safe_float(lead.get("project_budget", lead.get("annual_revenue", 0)))
    urgency = str(lead.get("timeline_urgency", "")).lower()
    status = str(lead.get("status", "")).lower()

    if consultation and budget > 50000:
        return "high"
    if consultation or urgency in ("immediate", "within_month") or status in ("proposal_sent", "negotiating"):
        return "moderate"
    return "low"


# ============================================================
# Pipeline: Raw Data -> Feature Matrix
# ============================================================
def build_feature_matrix(
    records: List[Dict[str, Any]],
    vertical_type: str,
    encoders: Optional[VerticalLabelEncoders] = None,
    fit_encoders: bool = False,
) -> Tuple[pd.DataFrame, VerticalLabelEncoders]:
    """
    Build a feature matrix from raw records for a given vertical.
    Returns (feature_df, fitted_encoders).
    """
    config = get_vertical_config(vertical_type)
    feature_names = get_feature_names(vertical_type)

    rows = [extract_features_from_lead(r, vertical_type) for r in records]
    df = pd.DataFrame(rows)

    # Ensure all feature columns exist
    for fname in feature_names:
        if fname not in df.columns:
            feat_spec = next(f for f in config.features if f.name == fname)
            if feat_spec.dtype == "numeric":
                df[fname] = 0.0
            elif feat_spec.dtype == "boolean":
                df[fname] = False
            else:
                df[fname] = "unknown"

    # Encode categoricals
    if encoders is None:
        encoders = VerticalLabelEncoders(vertical_type)
    if fit_encoders:
        encoders.fit(df)
    df = encoders.transform(df)

    # Convert booleans to int
    for fname in feature_names:
        if df[fname].dtype == bool:
            df[fname] = df[fname].astype(int)

    # Ensure numeric columns are float
    for feat in config.features:
        if feat.dtype == "numeric" and feat.name in df.columns:
            df[feat.name] = pd.to_numeric(df[feat.name], errors="coerce").fillna(0.0)

    return df[feature_names], encoders


# ============================================================
# Helpers
# ============================================================
def _safe_int(val: Any) -> int:
    try:
        return int(float(val)) if val is not None else 0
    except (ValueError, TypeError):
        return 0


def _safe_float(val: Any) -> float:
    try:
        return float(val) if val is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


def _clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, val))
