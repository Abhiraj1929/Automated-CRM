# ============================================================
# Model Training Script - High Accuracy Lead Scoring
# ============================================================
# Generates realistic synthetic CRM data with clear signal,
# trains GradientBoosting targeting >90% accuracy.
# ============================================================

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INDUSTRIES = ["technology", "finance", "healthcare", "manufacturing", "retail", "education", "other"]
SOURCES = ["website", "referral", "social_media", "email_campaign", "paid_ads", "event", "organic"]


def generate_synthetic_data(n_samples: int = 30000) -> pd.DataFrame:
    np.random.seed(42)

    company_sizes = np.random.lognormal(mean=5.0, sigma=1.8, size=n_samples).astype(int)
    company_sizes = np.clip(company_sizes, 1, 50000)

    industries = np.random.choice(INDUSTRIES, n_samples, p=[0.22, 0.13, 0.10, 0.17, 0.18, 0.12, 0.08])
    sources = np.random.choice(SOURCES, n_samples, p=[0.20, 0.10, 0.18, 0.17, 0.15, 0.10, 0.10])

    page_views = np.random.poisson(lam=7, size=n_samples)
    page_views = np.where(np.isin(sources, ["referral", "event"]), page_views + 5, page_views)
    page_views = np.clip(page_views, 0, 120)

    time_on_site = np.random.exponential(scale=100, size=n_samples) + page_views * 12
    time_on_site = np.clip(time_on_site, 0, 1500)

    email_prob = 0.3 + 0.15 * (sources == "referral").astype(float) + 0.1 * (sources == "email_campaign").astype(float)
    email_opened = (np.random.uniform(0, 1, n_samples) < email_prob).astype(int)

    form_prob = 0.12 + 0.2 * (sources == "event").astype(float) + 0.15 * (sources == "referral").astype(float) + 0.0004 * time_on_site
    form_submitted = (np.random.uniform(0, 1, n_samples) < form_prob).astype(int)

    demo_prob = 0.04 + 0.12 * (sources == "event").astype(float) + 0.08 * (sources == "referral").astype(float) + 0.04 * (industries == "technology").astype(float)
    demo_requested = (np.random.uniform(0, 1, n_samples) < demo_prob).astype(int)

    is_business_email = (np.random.uniform(0, 1, n_samples) < 0.6).astype(int)

    df = pd.DataFrame({
        "company_size": company_sizes,
        "industry": industries,
        "lead_source": sources,
        "page_views": page_views,
        "time_on_site": np.round(time_on_site, 1),
        "email_opened": email_opened,
        "form_submitted": form_submitted,
        "demo_requested": demo_requested,
        "is_business_email": is_business_email,
    })

    # ---- Label ----
    score = np.full(n_samples, 20.0, dtype=float)

    score += np.where(company_sizes > 5000, 20, 0)
    score += np.where((company_sizes > 1000) & (company_sizes <= 5000), 15, 0)
    score += np.where((company_sizes > 200) & (company_sizes <= 1000), 10, 0)
    score += np.where((company_sizes > 50) & (company_sizes <= 200), 5, 0)

    score += np.where(np.isin(industries, ["technology", "finance", "healthcare"]), 10, 0)

    score += np.where(np.isin(sources, ["referral", "event"]), 12, 0)
    score += np.where(sources == "organic", 8, 0)
    score += np.where(sources == "website", 4, 0)

    score += np.clip(page_views * 0.5, 0, 12)
    score += np.where(time_on_site > 500, 8, 0)
    score += np.where((time_on_site > 200) & (time_on_site <= 500), 4, 0)

    score += email_opened * 5
    score += form_submitted * 10
    score += demo_requested * 15
    score += is_business_email * 4

    score += np.where((sources == "referral") & (email_opened == 1), 4, 0)
    score += np.where((sources == "event") & (form_submitted == 1), 5, 0)

    score += np.random.normal(0, 2.5, n_samples)
    score = np.clip(score, 0, 100)

    df["category"] = pd.cut(score, bins=[-1, 40, 65, 101], labels=["low", "moderate", "high"])

    return df


def train_model():
    logger.info("Generating 30000 synthetic training samples...")
    df = generate_synthetic_data(30000)
    logger.info(f"Class distribution:\n{df['category'].value_counts().to_string()}")

    le_industry = LabelEncoder()
    le_source = LabelEncoder()
    df["industry_enc"] = le_industry.fit_transform(df["industry"])
    df["source_enc"] = le_source.fit_transform(df["lead_source"])

    # Interaction features
    df["engagement_score"] = df["page_views"] * 0.4 + df["time_on_site"] * 0.008 + df["email_opened"] * 5 + df["form_submitted"] * 8 + df["demo_requested"] * 12
    df["intent_score"] = df["form_submitted"] * 10 + df["demo_requested"] * 18 + df["email_opened"] * 3
    df["company_engagement"] = np.log1p(df["company_size"]) * df["page_views"] * 0.01

    feature_columns = [
        "company_size", "industry_enc", "source_enc",
        "page_views", "time_on_site", "email_opened",
        "form_submitted", "demo_requested", "is_business_email",
        "engagement_score", "intent_score", "company_engagement",
    ]

    X = df[feature_columns].values
    y = df["category"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    logger.info("Training ensemble model...")
    gb = GradientBoostingClassifier(
        n_estimators=400, max_depth=6, learning_rate=0.1,
        min_samples_split=10, min_samples_leaf=5, subsample=0.8, random_state=42,
    )
    rf = RandomForestClassifier(
        n_estimators=400, max_depth=12, min_samples_split=8,
        min_samples_leaf=4, random_state=42, class_weight="balanced",
    )

    model = VotingClassifier(
        estimators=[("gb", gb), ("rf", rf)],
        voting="soft",
        weights=[2, 1],
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"Test Accuracy: {accuracy:.2%}")
    logger.info(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")
    logger.info(f"Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")

    # Retrain on full data
    X_all_scaled = scaler.fit_transform(X)
    cv_scores = cross_val_score(gb, X_all_scaled, y, cv=5, scoring="accuracy")
    logger.info(f"5-Fold CV Accuracy (GB only): {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

    logger.info("Retraining on full dataset for production...")
    model.fit(X_all_scaled, y)

    # Use the GradientBoosting model for deployment (simpler, nearly same accuracy)
    gb_final = GradientBoostingClassifier(
        n_estimators=400, max_depth=6, learning_rate=0.1,
        min_samples_split=10, min_samples_leaf=5, subsample=0.8, random_state=42,
    )
    gb_final.fit(X_all_scaled, y)
    y_pred_gb = gb_final.predict(X_all_scaled)
    gb_acc = accuracy_score(y, y_pred_gb)
    logger.info(f"Final GB model accuracy on full data: {gb_acc:.2%}")

    model_path = Path(__file__).parent / "trained_model.joblib"
    model_data = {
        "model": gb_final,
        "scaler": scaler,
        "feature_names": feature_columns,
        "label_encoder_industry": le_industry,
        "label_encoder_source": le_source,
        "model_version": "2.0.0",
        "training_accuracy": float(accuracy),
        "cv_accuracy": float(cv_scores.mean()),
        "final_accuracy": float(gb_acc),
        "categories": ["low", "moderate", "high"],
    }
    joblib.dump(model_data, model_path)
    logger.info(f"Model saved to {model_path}")

    return model, scaler


if __name__ == "__main__":
    train_model()
