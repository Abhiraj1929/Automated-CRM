"""
Synthetic Data Generator — Industry-specific synthetic lead data using
statistical distributions (LogNormal, Poisson, Beta, etc.) calibrated
to real-world vertical priors.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any

from .vertical_config import VerticalConfig, get_vertical_config, get_feature_names
from .feature_engineering import is_business_email


# ============================================================
# Main Entry Point
# ============================================================
def generate_vertical_synthetic_data(
    vertical_type: str,
    n_samples: int = 10000,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate n_samples of synthetic lead data for the given vertical.
    Returns a DataFrame with raw feature columns (pre-encoding).
    """
    config = get_vertical_config(vertical_type)
    rng = np.random.RandomState(seed)

    if vertical_type == "b2b":
        df = _generate_b2b(n_samples, rng, config)
    elif vertical_type == "real_estate":
        df = _generate_real_estate(n_samples, rng, config)
    elif vertical_type == "ecommerce":
        df = _generate_ecommerce(n_samples, rng, config)
    elif vertical_type == "services":
        df = _generate_services(n_samples, rng, config)
    else:
        raise ValueError(f"Unknown vertical: {vertical_type}")

    # Generate labels
    df["conversion_label"] = df.apply(
        lambda row: _assign_synthetic_label(row, vertical_type, rng), axis=1
    )
    return df


# ============================================================
# B2B SaaS Synthetic Generator
# ============================================================
def _generate_b2b(n: int, rng: np.random.RandomState, config: VerticalConfig) -> pd.DataFrame:
    """B2B: company_size (LogNormal), opp_value (LogNormal), engagement signals."""
    p = config.synthetic_params

    company_sizes = np.maximum(1, rng.lognormal(
        mean=p["company_size_dist"]["mean"],
        sigma=p["company_size_dist"]["std"],
        size=n,
    ).astype(int))

    industries = rng.choice(
        config.categorical_values["industry"], size=n,
        p=[0.22, 0.18, 0.12, 0.15, 0.13, 0.10, 0.10],
    )
    sources = rng.choice(
        config.categorical_values["lead_source"], size=n,
        p=[0.25, 0.15, 0.15, 0.12, 0.15, 0.08, 0.10],
    )
    statuses = rng.choice(
        config.categorical_values["lead_status"], size=n,
        p=[0.30, 0.25, 0.20, 0.10, 0.15],
    )
    ratings = rng.choice(
        config.categorical_values["lead_rating"], size=n,
        p=[0.20, 0.45, 0.35],
    )

    has_opp = rng.random(n) < p["opportunity_rate"]
    opp_values = np.where(
        has_opp,
        np.maximum(1000, rng.lognormal(
            mean=p["opp_value_dist"]["mean"],
            sigma=p["opp_value_dist"]["std"],
            size=n,
        ).astype(int)),
        0,
    )

    act_lo, act_hi = p["activity_count_range"]
    activity_counts = rng.randint(act_lo, act_hi + 1, size=n)
    completed = (activity_counts * rng.uniform(0.3, 0.9, size=n)).astype(int)
    overdue = (activity_counts * rng.uniform(0, p["overdue_ratio"] * 2, size=n)).astype(int)

    biz_email = rng.random(n) < p["business_email_rate"]

    return pd.DataFrame({
        "company_size": company_sizes,
        "industry": industries,
        "lead_source": sources,
        "lead_status": statuses,
        "lead_rating": ratings,
        "activity_count": activity_counts,
        "completed_activities": np.clip(completed, 0, activity_counts),
        "overdue_activities": np.clip(overdue, 0, activity_counts),
        "has_opportunity": has_opp,
        "opp_value": opp_values,
        "is_business_email": biz_email,
    })


# ============================================================
# Real Estate Synthetic Generator
# ============================================================
def _generate_real_estate(n: int, rng: np.random.RandomState, config: VerticalConfig) -> pd.DataFrame:
    """Real Estate: budget (LogNormal), tours, property views, pre-approval."""
    p = config.synthetic_params

    budgets = np.maximum(50000, rng.lognormal(
        mean=p["budget_dist"]["mean"],
        sigma=p["budget_dist"]["std"],
        size=n,
    ).astype(int))

    prop_types = rng.choice(
        config.categorical_values["property_type"], size=n,
        p=[0.40, 0.20, 0.15, 0.10, 0.08, 0.07],
    )

    pre_approved = rng.random(n) < p["pre_approval_rate"]

    views_lo, views_hi = p["property_views_range"]
    property_views = rng.randint(views_lo, views_hi + 1, size=n)

    tours_lo, tours_hi = p["tours_range"]
    scheduled_tours = rng.randint(tours_lo, tours_hi + 1, size=n)
    # Tours are correlated with views: high views -> more tours
    scheduled_tours = np.where(
        property_views > 40,
        rng.randint(max(tours_lo, 3), tours_hi + 1, size=n),
        scheduled_tours,
    )

    days_lo, days_hi = p["days_range"]
    days_since = rng.randint(days_lo, days_hi + 1, size=n)

    engagement = np.clip(rng.normal(p["location_match_mean"] * 100, 20, size=n), 0, 100)

    sources = rng.choice(
        config.categorical_values["lead_source"], size=n,
        p=[0.25, 0.20, 0.18, 0.12, 0.10, 0.10, 0.05],
    )
    statuses = rng.choice(
        config.categorical_values["lead_status"], size=n,
        p=[0.25, 0.20, 0.15, 0.15, 0.15, 0.10],
    )

    biz_email = rng.random(n) < 0.20

    location_match = np.clip(rng.beta(3, 2, size=n), 0, 1)

    return pd.DataFrame({
        "budget": budgets,
        "property_type": prop_types,
        "location_match_score": location_match,
        "pre_approved_mortgage": pre_approved,
        "property_views": property_views,
        "scheduled_tours": scheduled_tours,
        "days_since_inquiry": days_since,
        "engagement_score": engagement,
        "lead_source": sources,
        "lead_status": statuses,
        "is_business_email": biz_email,
    })


# ============================================================
# E-Commerce Synthetic Generator
# ============================================================
def _generate_ecommerce(n: int, rng: np.random.RandomState, config: VerticalConfig) -> pd.DataFrame:
    """E-Commerce: cart_value (LogNormal), orders, loyalty, browsing behavior."""
    p = config.synthetic_params

    cart_values = np.maximum(5, rng.lognormal(
        mean=p["cart_value_dist"]["mean"],
        sigma=p["cart_value_dist"]["std"],
        size=n,
    ).round(2))

    items_in_cart = np.maximum(1, rng.poisson(lam=3, size=n))

    views_lo, views_hi = p["items_viewed_range"]
    items_viewed = rng.randint(views_lo, views_hi + 1, size=n)

    cart_abandoned = rng.random(n) < p["cart_abandon_rate"]

    orders_lo, orders_hi = p["past_orders_range"]
    past_orders = rng.randint(orders_lo, orders_hi + 1, size=n)

    avg_order = np.maximum(10, rng.lognormal(
        mean=p["avg_order_dist"]["mean"],
        sigma=p["avg_order_dist"]["std"],
        size=n,
    ).round(2))
    # Correlate AOV with past orders: repeat buyers have higher AOV
    avg_order = np.where(past_orders > 5, avg_order * 1.3, avg_order)

    loyalty = rng.random(n) < p["loyalty_rate"]
    # Loyal members tend to have more orders
    past_orders = np.where(loyalty, past_orders + rng.randint(2, 8, size=n), past_orders)

    rec_lo, rec_hi = p["recency_range"]
    days_since = rng.randint(rec_lo, rec_hi + 1, size=n)

    biz_email = rng.random(n) < p["business_buyer_rate"]

    sources = rng.choice(
        config.categorical_values["lead_source"], size=n,
        p=[0.20, 0.22, 0.18, 0.15, 0.10, 0.08, 0.07],
    )
    statuses = rng.choice(
        config.categorical_values["lead_status"], size=n,
        p=[0.25, 0.20, 0.15, 0.10, 0.20, 0.10],
    )

    return pd.DataFrame({
        "cart_value": cart_values,
        "items_in_cart": items_in_cart,
        "items_viewed": items_viewed,
        "cart_abandoned": cart_abandoned,
        "past_orders_count": past_orders,
        "avg_order_value": avg_order,
        "loyalty_member": loyalty,
        "days_since_last_visit": days_since,
        "lead_source": sources,
        "lead_status": statuses,
        "is_business_email": biz_email,
    })


# ============================================================
# Professional Services Synthetic Generator
# ============================================================
def _generate_services(n: int, rng: np.random.RandomState, config: VerticalConfig) -> pd.DataFrame:
    """Services: project_budget (LogNormal), urgency, consultation, engagement."""
    p = config.synthetic_params

    budgets = np.maximum(1000, rng.lognormal(
        mean=p["budget_dist"]["mean"],
        sigma=p["budget_dist"]["std"],
        size=n,
    ).astype(int))

    urgencies = rng.choice(
        config.categorical_values["timeline_urgency"], size=n,
        p=[p["immediate_urgency_rate"], 0.25, 0.25, 0.20, 0.10],
    )

    service_types = rng.choice(
        config.categorical_values["service_type"], size=n,
        p=[0.22, 0.20, 0.15, 0.18, 0.10, 0.08, 0.07],
    )

    form_lo, form_hi = p["form_complexity_range"]
    form_complexity = rng.randint(form_lo, form_hi + 1, size=n)

    consultation = rng.random(n) < p["consultation_rate"]

    days_lo, days_hi = p["days_range"]
    days_since = rng.randint(days_lo, days_hi + 1, size=n)

    engagement = np.clip(
        rng.normal(p["engagement_mean"], p["engagement_std"], size=n), 0, 100
    )
    # High budget + consultation = higher engagement
    engagement = np.where(consultation & (budgets > 50000), np.clip(engagement + 20, 0, 100), engagement)

    activity_counts = rng.randint(0, 30, size=n)

    sources = rng.choice(
        config.categorical_values["lead_source"], size=n,
        p=[0.22, 0.18, 0.15, 0.12, 0.13, 0.10, 0.10],
    )
    statuses = rng.choice(
        config.categorical_values["lead_status"], size=n,
        p=[0.25, 0.20, 0.18, 0.15, 0.12, 0.10],
    )

    biz_email = rng.random(n) < 0.65

    return pd.DataFrame({
        "project_budget": budgets,
        "timeline_urgency": urgencies,
        "service_type": service_types,
        "form_complexity": form_complexity,
        "consultation_requested": consultation,
        "days_since_inquiry": days_since,
        "engagement_score": engagement,
        "activity_count": activity_counts,
        "lead_source": sources,
        "lead_status": statuses,
        "is_business_email": biz_email,
    })


# ============================================================
# Synthetic Label Assignment
# ============================================================
def _assign_synthetic_label(row: pd.Series, vertical_type: str, rng: np.random.RandomState) -> str:
    """
    Assign conversion label based on vertical-specific signal combination.
    Uses weighted scoring rather than hardcoded thresholds.
    """
    if vertical_type == "b2b":
        score = 0.0
        if row.get("has_opportunity", False):
            score += 0.4
        if row.get("opp_value", 0) > 50000:
            score += 0.2
        if row.get("lead_status") == "qualified":
            score += 0.15
        if row.get("lead_rating") == "hot":
            score += 0.15
        if row.get("activity_count", 0) > 10:
            score += 0.1
        # Add noise
        score += rng.normal(0, 0.08)

    elif vertical_type == "real_estate":
        score = 0.0
        tours = row.get("scheduled_tours", 0)
        pre_approved = row.get("pre_approved_mortgage", False)
        views = row.get("property_views", 0)
        score += min(tours / 5.0, 0.35)
        if pre_approved:
            score += 0.25
        score += min(views / 60.0, 0.20)
        if row.get("lead_status") in ("negotiating", "touring"):
            score += 0.15
        score += row.get("location_match_score", 0.5) * 0.05
        score += rng.normal(0, 0.08)

    elif vertical_type == "ecommerce":
        score = 0.0
        cart = row.get("cart_value", 0)
        orders = row.get("past_orders_count", 0)
        loyalty = row.get("loyalty_member", False)
        score += min(cart / 200.0, 0.30)
        score += min(orders / 15.0, 0.25)
        if loyalty:
            score += 0.15
        if row.get("lead_status") in ("purchased", "checkout_initiated"):
            score += 0.20
        if row.get("cart_abandoned", False):
            score -= 0.10
        score += rng.normal(0, 0.08)

    elif vertical_type == "services":
        score = 0.0
        budget = row.get("project_budget", 0)
        consultation = row.get("consultation_requested", False)
        urgency = row.get("timeline_urgency", "undefined")
        score += min(budget / 150000.0, 0.30)
        if consultation:
            score += 0.25
        if urgency in ("immediate", "within_month"):
            score += 0.20
        score += min(row.get("engagement_score", 50) / 200.0, 0.15)
        score += rng.normal(0, 0.08)
    else:
        score = rng.random()

    # Clamp and convert to label
    score = max(0.0, min(1.0, score))
    if score >= 0.55:
        return "high"
    elif score >= 0.30:
        return "moderate"
    return "low"
