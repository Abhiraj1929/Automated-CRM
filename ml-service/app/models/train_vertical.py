"""
Training Engine — Multi-tenant model training with real data ingestion,
synthetic fallback, and isolated model artifacts per vertical.
"""
import os
import time
import numpy as np
import pandas as pd
import joblib
import requests
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import cross_val_score
from sklearn.metrics import accuracy_score, classification_report

from .vertical_config import (
    VerticalConfig, get_vertical_config, get_feature_names, get_feature_count,
    SUPPORTED_VERTICALS,
)
from .feature_engineering import (
    VerticalLabelEncoders, build_feature_matrix, generate_vertical_label,
)
from .synthetic_data import generate_vertical_synthetic_data


# ============================================================
# Configuration
# ============================================================
MODEL_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))

GB_PARAMS = {
    "n_estimators": 400,
    "max_depth": 6,
    "learning_rate": 0.1,
    "min_samples_split": 10,
    "min_samples_leaf": 5,
    "subsample": 0.8,
    "random_state": 42,
}


# ============================================================
# Data Ingestion
# ============================================================
def fetch_crm_data(vertical_type: str, limit: int = 10000) -> List[Dict[str, Any]]:
    """
    Fetch live lead data from Supabase REST API for a specific vertical.
    Returns list of lead dicts.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"  [WARN] Supabase not configured — returning empty dataset for {vertical_type}")
        return []

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    records = []

    try:
        # Fetch leads
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/leads",
            headers=headers,
            params={"limit": limit, "order": "created_at.desc"},
            timeout=8,
        )
        if resp.status_code == 200:
            leads = resp.json()
            print(f"  [INFO] Fetched {len(leads)} leads from Supabase")
            records.extend(leads)
        else:
            print(f"  [WARN] Leads fetch failed: {resp.status_code}")
    except Exception as e:
        print(f"  [WARN] Leads fetch error: {e}")

    # Fetch opportunities (for B2B label generation)
    if vertical_type == "b2b":
        try:
            resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/opportunities",
                headers=headers,
                params={"limit": limit},
                timeout=15,
            )
            if resp.status_code == 200:
                opps = resp.json()
                # Index by owner_id for quick lookup
                opp_map = {}
                for opp in opps:
                    owner = opp.get("owner_id") or opp.get("created_by")
                    if owner:
                        opp_map.setdefault(owner, []).append(opp)
                # Attach opportunities to leads
                for lead in records:
                    owner = lead.get("owner_id") or lead.get("created_by")
                    lead["_opportunities"] = opp_map.get(owner, [])
        except Exception:
            pass

    return records


def _enrich_lead_for_vertical(lead: Dict[str, Any], vertical_type: str) -> Dict[str, Any]:
    """
    Enrich a raw Supabase lead record with vertical-specific fields.
    Maps generic lead columns to vertical-specific feature names.
    """
    enriched = dict(lead)

    # Compute activity aggregates from linked records
    activities = lead.get("_activities", [])
    if activities:
        enriched["activity_count"] = len(activities)
        enriched["completed_activities"] = sum(
            1 for a in activities if str(a.get("status", "")).lower() == "completed"
        )
        enriched["overdue_activities"] = sum(
            1 for a in activities
            if a.get("due_date") and str(a.get("status", "")).lower() != "completed"
        )

    # Compute opportunity fields
    opps = lead.get("_opportunities", [])
    if opps:
        enriched["has_opportunity"] = True
        enriched["opp_value"] = sum(float(o.get("amount", 0) or 0) for o in opps)
    else:
        enriched["has_opportunity"] = False
        enriched["opp_value"] = 0.0

    # Map lead source
    if "source" not in enriched or not enriched.get("source"):
        enriched["source"] = enriched.get("lead_source", "website")

    return enriched


# ============================================================
# Model Training
# ============================================================
def train_tenant_model(
    vertical_type: str,
    force_synthetic: bool = False,
    verbose: bool = True,
) -> Dict[str, Any]:
    """
    Train a GradientBoosting model for a specific vertical.
    Tries real data first, falls back to synthetic if < min_training_records.

    Returns model metadata dict.
    """
    config = get_vertical_config(vertical_type)
    feature_names = get_feature_names(vertical_type)
    os.makedirs(MODEL_DIR, exist_ok=True)

    if verbose:
        print(f"\n{'='*60}")
        print(f"  TRAINING: {config.display_name} ({vertical_type})")
        print(f"{'='*60}")

    # Step 1: Try to fetch real data
    trained_on_real = False
    records = []

    if not force_synthetic:
        records = fetch_crm_data(vertical_type)

    if len(records) < config.min_training_records:
        if verbose:
            n_synth = min(config.synthetic_sample_count, 5000)
            print(f"  [FALLBACK] Only {len(records)} real records (need {config.min_training_records})")
            print(f"  [GENERATING] {n_synth} synthetic samples...")
        records_df = generate_vertical_synthetic_data(
            vertical_type,
            n_samples=min(config.synthetic_sample_count, 5000),
        )
        # Convert synthetic DataFrame back to list of dicts for build_feature_matrix
        records = records_df.to_dict("records")
        trained_on_real = False
    else:
        if verbose:
            print(f"  [DATA] Using {len(records)} real records")
        # Enrich records
        records = [_enrich_lead_for_vertical(r, vertical_type) for r in records]
        trained_on_real = True

    # Step 2: Build feature matrix + labels
    if verbose:
        print(f"  [ENGINEERING] {len(feature_names)} features for {vertical_type}")

    # Generate labels for records that don't have them
    labels = []
    for r in records:
        if "conversion_label" in r and r["conversion_label"] in config.target_mapping:
            labels.append(config.target_mapping[r["conversion_label"]])
        elif "conversion_label" in r:
            labels.append(config.target_mapping.get(r["conversion_label"], 0))
        else:
            label = generate_vertical_label(r, vertical_type, r.get("_opportunities", []))
            labels.append(config.target_mapping[label])

    labels = np.array(labels)

    # Build feature matrix
    feature_df, encoders = build_feature_matrix(
        records, vertical_type, fit_encoders=True
    )

    X = feature_df.values.astype(float)
    y = labels

    if verbose:
        label_counts = pd.Series(y).value_counts().to_dict()
        print(f"  [LABELS] Distribution: {dict(config.target_mapping)} -> {label_counts}")
        print(f"  [MATRIX] Shape: {X.shape}")

    # Step 3: Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Step 4: Train model
    if verbose:
        print(f"  [TRAINING] GradientBoostingClassifier ({GB_PARAMS['n_estimators']} trees)...")

    model = GradientBoostingClassifier(**GB_PARAMS)
    model.fit(X_scaled, y)

    # Step 5: Evaluate
    train_acc = accuracy_score(y, model.predict(X_scaled))

    cv_scores = []
    if len(X_scaled) >= 20:
        n_cv = min(5, len(X_scaled) // 5)
        cv_scores = cross_val_score(model, X_scaled, y, cv=n_cv, scoring="accuracy")
    cv_mean = float(np.mean(cv_scores)) if len(cv_scores) > 0 else train_acc

    if verbose:
        print(f"  [RESULT] Training accuracy: {train_acc:.4f}")
        print(f"  [RESULT] CV accuracy: {cv_mean:.4f} ({len(cv_scores)} folds)")
        print(f"  [RESULT] Feature importances:")
        importances = model.feature_importances_
        for fname, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
            print(f"    {fname}: {imp:.4f}")

    # Step 6: Save model artifact
    model_version = f"4.0.0-{vertical_type}"
    model_path = os.path.join(MODEL_DIR, f"trained_model_{vertical_type}.joblib")

    artifact = {
        "model": model,
        "scaler": scaler,
        "feature_names": feature_names,
        "encoders": encoders,
        "label_encoder_map": encoders.get_encoder_maps(),
        "vertical_type": vertical_type,
        "model_version": model_version,
        "trained_on_real_data": trained_on_real,
        "training_accuracy": float(train_acc),
        "cv_accuracy": cv_mean,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_training_samples": len(X),
        "label_distribution": {str(k): int(v) for k, v in pd.Series(y).value_counts().items()},
        "hyperparameters": GB_PARAMS,
    }

    joblib.dump(artifact, model_path)

    if verbose:
        print(f"  [SAVED] {model_path}")
        print(f"  [VERSION] {model_version}")
        print(f"  [REAL DATA] {trained_on_real}")

    return {
        "vertical_type": vertical_type,
        "model_version": model_version,
        "model_path": model_path,
        "training_accuracy": train_acc,
        "cv_accuracy": cv_mean,
        "trained_on_real_data": trained_on_real,
        "n_samples": len(X),
        "n_features": len(feature_names),
    }


# ============================================================
# Batch Training
# ============================================================
def train_all_verticals(force_synthetic: bool = False) -> Dict[str, Dict]:
    """Train models for all supported verticals."""
    results = {}
    for v in SUPPORTED_VERTICALS:
        results[v] = train_tenant_model(v, force_synthetic=force_synthetic)
    return results


# ============================================================
# CLI Entry Point
# ============================================================
if __name__ == "__main__":
    import sys

    verticals = sys.argv[1:] if len(sys.argv) > 1 else SUPPORTED_VERTICALS
    print(f"Training models for verticals: {verticals}")
    print(f"Model output directory: {MODEL_DIR}")

    results = train_all_verticals()

    print(f"\n{'='*60}")
    print(f"  BATCH TRAINING COMPLETE")
    print(f"{'='*60}")
    for v, r in results.items():
        status = "OK" if r["training_accuracy"] > 0.5 else "LOW_ACC"
        print(f"  {v:15s} | v{r['model_version']:25s} | acc={r['training_accuracy']:.3f} | cv={r['cv_accuracy']:.3f} | {status}")
