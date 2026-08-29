"""
Vertical Configuration — Industry-specific schema mapping, feature definitions,
statistical priors, and conversion signals for each CRM vertical.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
import numpy as np


@dataclass
class FeatureSpec:
    name: str
    dtype: str  # "numeric", "categorical", "boolean"
    encoding: Optional[str] = None  # "label", "onehot", None
    description: str = ""
    synthetic_dist: Optional[Dict[str, Any]] = None  # distribution params for synthetic generation


@dataclass
class VerticalConfig:
    vertical_type: str
    display_name: str
    description: str
    features: List[FeatureSpec]
    categorical_values: Dict[str, List[str]]
    target_column: str
    target_mapping: Dict[str, int]  # label -> int
    synthetic_params: Dict[str, Any]  # statistical priors for synthetic data
    conversion_signals: List[str]  # which fields indicate conversion
    min_training_records: int = 10
    synthetic_sample_count: int = 10000


# ============================================================
# B2B SaaS Vertical
# ============================================================
B2B_CONFIG = VerticalConfig(
    vertical_type="b2b",
    display_name="B2B SaaS",
    description="Standard B2B firmographics, engagement, and pipeline metrics",
    features=[
        FeatureSpec("company_size", "numeric", description="Number of employees"),
        FeatureSpec("industry", "categorical", encoding="label", description="Industry sector"),
        FeatureSpec("lead_source", "categorical", encoding="label", description="Lead acquisition channel"),
        FeatureSpec("lead_status", "categorical", encoding="label", description="Current lead status"),
        FeatureSpec("lead_rating", "categorical", encoding="label", description="Manual rating"),
        FeatureSpec("activity_count", "numeric", description="Total activities logged"),
        FeatureSpec("completed_activities", "numeric", description="Completed activities"),
        FeatureSpec("overdue_activities", "numeric", description="Overdue activities"),
        FeatureSpec("has_opportunity", "boolean", description="Has associated opportunity"),
        FeatureSpec("opp_value", "numeric", description="Opportunity dollar value"),
        FeatureSpec("is_business_email", "boolean", description="Corporate email domain"),
    ],
    categorical_values={
        "industry": ["technology", "finance", "healthcare", "manufacturing", "retail", "education", "other"],
        "lead_source": ["website", "referral", "social_media", "email_campaign", "paid_ads", "event", "organic"],
        "lead_status": ["new", "contacted", "qualified", "converted", "unqualified"],
        "lead_rating": ["hot", "warm", "cold"],
    },
    target_column="conversion_label",
    target_mapping={"low": 0, "moderate": 1, "high": 2},
    synthetic_params={
        "company_size_dist": {"mean": 7.0, "std": 1.5},  # LogNormal for employee counts
        "opp_value_dist": {"mean": 10.0, "std": 1.8},   # LogNormal for deal sizes
        "activity_count_range": (0, 50),
        "overdue_ratio": 0.15,
        "opportunity_rate": 0.35,
        "business_email_rate": 0.75,
    },
    conversion_signals=["has_opportunity", "opp_value", "lead_status"],
    min_training_records=10,
    synthetic_sample_count=10000,
)

# ============================================================
# Real Estate Vertical
# ============================================================
REAL_ESTATE_CONFIG = VerticalConfig(
    vertical_type="real_estate",
    display_name="Real Estate",
    description="Property-focused consumer metrics, budget, and tour engagement",
    features=[
        FeatureSpec("budget", "numeric", description="Property budget in dollars"),
        FeatureSpec("property_type", "categorical", encoding="label", description="Desired property type"),
        FeatureSpec("location_match_score", "numeric", description="Location preference match 0-1"),
        FeatureSpec("pre_approved_mortgage", "boolean", description="Has mortgage pre-approval"),
        FeatureSpec("property_views", "numeric", description="Properties viewed online"),
        FeatureSpec("scheduled_tours", "numeric", description="In-person tours scheduled"),
        FeatureSpec("days_since_inquiry", "numeric", description="Days since first inquiry"),
        FeatureSpec("engagement_score", "numeric", description="Composite engagement 0-100"),
        FeatureSpec("lead_source", "categorical", encoding="label", description="Lead source channel"),
        FeatureSpec("lead_status", "categorical", encoding="label", description="Current status"),
        FeatureSpec("is_business_email", "boolean", description="Corporate email (investor signal)"),
    ],
    categorical_values={
        "property_type": ["single_family", "condo", "townhouse", "multi_family", "land", "commercial"],
        "lead_source": ["zillow", "realtor_com", "referral", "open_house", "social_media", "website", "agent_network"],
        "lead_status": ["new", "contacted", "touring", "negotiating", "closed_won", "closed_lost"],
    },
    target_column="conversion_label",
    target_mapping={"low": 0, "moderate": 1, "high": 2},
    synthetic_params={
        "budget_dist": {"mean": 12.5, "std": 0.7},     # LogNormal for home prices ($200K-$800K)
        "property_views_range": (1, 80),
        "tours_range": (0, 12),
        "days_range": (1, 180),
        "pre_approval_rate": 0.40,
        "tour_rate": 0.30,
        "location_match_mean": 0.65,
    },
    conversion_signals=["scheduled_tours", "pre_approved_mortgage", "property_views"],
    min_training_records=10,
    synthetic_sample_count=10000,
)

# ============================================================
# E-Commerce Vertical
# ============================================================
ECOMMERCE_CONFIG = VerticalConfig(
    vertical_type="ecommerce",
    display_name="E-Commerce",
    description="Shopping behavior, cart metrics, and purchase intent signals",
    features=[
        FeatureSpec("cart_value", "numeric", description="Current cart value in dollars"),
        FeatureSpec("items_in_cart", "numeric", description="Number of items in cart"),
        FeatureSpec("items_viewed", "numeric", description="Product pages viewed"),
        FeatureSpec("cart_abandoned", "boolean", description="Previously abandoned cart"),
        FeatureSpec("past_orders_count", "numeric", description="Historical order count"),
        FeatureSpec("avg_order_value", "numeric", description="Average past order value"),
        FeatureSpec("loyalty_member", "boolean", description="Loyalty program member"),
        FeatureSpec("days_since_last_visit", "numeric", description="Recency in days"),
        FeatureSpec("lead_source", "categorical", encoding="label", description="Acquisition channel"),
        FeatureSpec("lead_status", "categorical", encoding="label", description="Purchase status"),
        FeatureSpec("is_business_email", "boolean", description="Business buyer signal"),
    ],
    categorical_values={
        "lead_source": ["organic_search", "paid_ads", "social_media", "email", "referral", "direct", "affiliate"],
        "lead_status": ["new", "browsing", "cart_active", "checkout_initiated", "purchased", "returned"],
    },
    target_column="conversion_label",
    target_mapping={"low": 0, "moderate": 1, "high": 2},
    synthetic_params={
        "cart_value_dist": {"mean": 4.5, "std": 1.2},    # LogNormal for cart values ($20-$300)
        "items_viewed_range": (1, 60),
        "past_orders_range": (0, 25),
        "avg_order_dist": {"mean": 4.0, "std": 0.8},     # LogNormal for AOV
        "cart_abandon_rate": 0.45,
        "loyalty_rate": 0.30,
        "recency_range": (0, 90),
        "business_buyer_rate": 0.15,
    },
    conversion_signals=["cart_value", "past_orders_count", "loyalty_member"],
    min_training_records=10,
    synthetic_sample_count=10000,
)

# ============================================================
# Professional Services Vertical
# ============================================================
SERVICES_CONFIG = VerticalConfig(
    vertical_type="services",
    display_name="Professional Services",
    description="Consulting, agency, and service-firm lead engagement metrics",
    features=[
        FeatureSpec("project_budget", "numeric", description="Estimated project budget"),
        FeatureSpec("timeline_urgency", "categorical", encoding="label", description="Urgency level"),
        FeatureSpec("service_type", "categorical", encoding="label", description="Service category"),
        FeatureSpec("form_complexity", "numeric", description="Fields in inquiry form"),
        FeatureSpec("consultation_requested", "boolean", description="Requested a consultation"),
        FeatureSpec("days_since_inquiry", "numeric", description="Days since first contact"),
        FeatureSpec("engagement_score", "numeric", description="Composite engagement 0-100"),
        FeatureSpec("activity_count", "numeric", description="Interactions logged"),
        FeatureSpec("lead_source", "categorical", encoding="label", description="Lead source"),
        FeatureSpec("lead_status", "categorical", encoding="label", description="Current status"),
        FeatureSpec("is_business_email", "boolean", description="Corporate email domain"),
    ],
    categorical_values={
        "timeline_urgency": ["immediate", "within_month", "within_quarter", "exploring", "undefined"],
        "service_type": ["consulting", "development", "design", "marketing", "analytics", "support", "other"],
        "lead_source": ["website", "referral", "linkedin", "conference", "content_marketing", "partner", "cold_outreach"],
        "lead_status": ["new", "contacted", "proposal_sent", "negotiating", "closed_won", "closed_lost"],
    },
    target_column="conversion_label",
    target_mapping={"low": 0, "moderate": 1, "high": 2},
    synthetic_params={
        "budget_dist": {"mean": 10.5, "std": 1.5},    # LogNormal for project budgets
        "form_complexity_range": (3, 15),
        "days_range": (1, 120),
        "consultation_rate": 0.50,
        "engagement_mean": 55,
        "engagement_std": 20,
        "immediate_urgency_rate": 0.20,
    },
    conversion_signals=["consultation_requested", "project_budget", "timeline_urgency"],
    min_training_records=10,
    synthetic_sample_count=10000,
)


# ============================================================
# Registry
# ============================================================
VERTICAL_REGISTRY: Dict[str, VerticalConfig] = {
    "b2b": B2B_CONFIG,
    "real_estate": REAL_ESTATE_CONFIG,
    "ecommerce": ECOMMERCE_CONFIG,
    "services": SERVICES_CONFIG,
}

SUPPORTED_VERTICALS = list(VERTICAL_REGISTRY.keys())


def get_vertical_config(vertical_type: str) -> VerticalConfig:
    """Get config for a vertical, raise if not found."""
    if vertical_type not in VERTICAL_REGISTRY:
        raise ValueError(
            f"Unknown vertical: '{vertical_type}'. "
            f"Supported: {SUPPORTED_VERTICALS}"
        )
    return VERTICAL_REGISTRY[vertical_type]


def get_feature_names(vertical_type: str) -> List[str]:
    """Get ordered feature names for a vertical."""
    config = get_vertical_config(vertical_type)
    return [f.name for f in config.features]


def get_feature_count(vertical_type: str) -> int:
    """Get number of features for a vertical."""
    return len(get_vertical_config(vertical_type).features)
