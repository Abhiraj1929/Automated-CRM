# ============================================================
# Model Training Script
# ============================================================
# Run this script to train the lead scoring model using
# synthetic data. In production, replace with real CRM data.
# ============================================================

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_synthetic_data(n_samples: int = 1000) -> pd.DataFrame:
    """
    Generate synthetic lead data for training.
    
    In production, replace this with actual CRM data from Supabase.
    """
    np.random.seed(42)
    
    data = {
        "company_size": np.random.randint(1, 10000, n_samples),
        "industry": np.random.choice(
            ["technology", "finance", "healthcare", "manufacturing", "retail", "education", "other"],
            n_samples
        ),
        "lead_source": np.random.choice(
            ["website", "referral", "social_media", "email_campaign", "paid_ads", "event", "other"],
            n_samples
        ),
        "page_views": np.random.randint(0, 100, n_samples),
        "time_on_site": np.random.uniform(0, 600, n_samples),
        "email_opened": np.random.choice([0, 1], n_samples, p=[0.4, 0.6]),
        "form_submitted": np.random.choice([0, 1], n_samples, p=[0.7, 0.3]),
        "demo_requested": np.random.choice([0, 1], n_samples, p=[0.85, 0.15]),
    }
    
    df = pd.DataFrame(data)
    
    # Generate labels based on rules (what we want the model to learn)
    score = 30  # Base score
    
    # Company size impact
    score += np.where(df["company_size"] > 1000, 15, 0)
    score += np.where((df["company_size"] > 100) & (df["company_size"] <= 1000), 10, 0)
    score += np.where((df["company_size"] > 10) & (df["company_size"] <= 100), 5, 0)
    
    # Industry impact
    score += np.where(df["industry"].isin(["technology", "finance", "healthcare"]), 10, 0)
    
    # Source impact
    score += np.where(df["lead_source"].isin(["referral", "event"]), 10, 0)
    score += np.where(df["lead_source"] == "website", 5, 0)
    
    # Engagement impact
    score += np.where(df["page_views"] > 10, 8, 0)
    score += np.where(df["page_views"] > 5, 4, 0)
    score += np.where(df["time_on_site"] > 300, 7, 0)
    score += df["email_opened"] * 5
    score += df["form_submitted"] * 10
    score += df["demo_requested"] * 15
    
    # Add noise
    score += np.random.normal(0, 5, n_samples)
    
    # Clip and convert to binary label (high value = 1)
    score = np.clip(score, 0, 100)
    df["is_high_value"] = (score >= 60).astype(int)
    
    return df


def train_model():
    """Train the lead scoring model"""
    logger.info("📊 Generating synthetic training data...")
    df = generate_synthetic_data(2000)
    
    # Encode categorical variables
    industry_map = {
        "technology": 0, "finance": 1, "healthcare": 2,
        "manufacturing": 3, "retail": 4, "education": 5, "other": 6
    }
    source_map = {
        "website": 0, "referral": 1, "social_media": 2,
        "email_campaign": 3, "paid_ads": 4, "event": 5, "other": 6
    }
    
    df["industry_encoded"] = df["industry"].map(industry_map)
    df["source_encoded"] = df["lead_source"].map(source_map)
    
    # Features
    feature_columns = [
        "company_size", "industry_encoded", "source_encoded",
        "page_views", "time_on_site", "email_opened",
        "form_submitted", "demo_requested"
    ]
    
    X = df[feature_columns].values
    y = df["is_high_value"].values
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    logger.info("🤖 Training RandomForest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced"
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    
    logger.info(f"✅ Model accuracy: {accuracy:.2%}")
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred, target_names=["Low Value", "High Value"]))
    
    # Feature importance
    logger.info("\nFeature Importances:")
    for name, importance in zip(feature_columns, model.feature_importances_):
        logger.info(f"  {name}: {importance:.4f}")
    
    # Save model
    model_path = Path(__file__).parent / "trained_model.joblib"
    model_data = {
        "model": model,
        "scaler": scaler,
        "feature_names": feature_columns,
        "model_version": "1.0.0",
        "training_accuracy": accuracy,
    }
    
    joblib.dump(model_data, model_path)
    logger.info(f"\n💾 Model saved to {model_path}")
    
    return model, scaler


if __name__ == "__main__":
    train_model()
