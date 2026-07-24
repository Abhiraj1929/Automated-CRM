# ============================================================
# Model Training Script - Real CRM Data
# ============================================================
# Fetches actual lead/opportunity data from Supabase,
# engineers features, and trains a GradientBoosting model.
# Falls back to synthetic data if DB is empty.
# ============================================================

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
from pathlib import Path
import logging
import os
import sys
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent.parent))


def fetch_real_data():
    """Fetch lead and opportunity data from Supabase REST API."""
    try:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent.parent.parent / '.env')

        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if not url or not key:
            logger.warning("No Supabase credentials found")
            return None

        headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        }

        leads_resp = requests.get(f'{url}/rest/v1/leads?select=*', headers=headers, timeout=10)
        leads = leads_resp.json() if leads_resp.status_code == 200 else []

        opps_resp = requests.get(f'{url}/rest/v1/opportunities?select=*', headers=headers, timeout=10)
        opps = opps_resp.json() if opps_resp.status_code == 200 else []

        acts_resp = requests.get(f'{url}/rest/v1/activities?select=*', headers=headers, timeout=10)
        acts = acts_resp.json() if acts_resp.status_code == 200 else []

        if not leads:
            logger.warning("No leads in database")
            return None

        logger.info(f"Fetched {len(leads)} leads, {len(opps)} opportunities, {len(acts)} activities")
        return {'leads': leads, 'opportunities': opps, 'activities': acts}

    except Exception as e:
        logger.warning(f"Could not fetch from Supabase: {e}")
        return None


def build_features_from_real_data(data):
    """Engineer features from real CRM data for lead scoring."""
    leads = data['leads']
    opps = data['opportunities']
    acts = data['activities']

    # Build lead-opportunity lookup
    opp_by_lead = {}
    for o in opps:
        lid = o.get('lead_id') or o.get('contact_id')
        if lid:
            opp_by_lead.setdefault(lid, []).append(o)

    # Build activity counts per lead
    act_counts = {}
    for a in acts:
        eid = a.get('entity_id')
        if eid:
            act_counts.setdefault(eid, {'total': 0, 'completed': 0, 'overdue': 0})
            act_counts[eid]['total'] += 1
            if a.get('status') == 'completed':
                act_counts[eid]['completed'] += 1
            if a.get('due_date') and a['status'] != 'completed':
                from datetime import datetime
                try:
                    if datetime.fromisoformat(a['due_date'].replace('Z', '+00:00')) < datetime.now().astimezone():
                        act_counts[eid]['overdue'] += 1
                except:
                    pass

    rows = []
    for lead in leads:
        lid = lead.get('id', '')

        # Determine if lead converted (label)
        has_opp = lid in opp_by_lead
        opps_for_lead = opp_by_lead.get(lid, [])
        won = any(o.get('stage') == 'closed_won' for o in opps_for_lead)
        total_opp_value = sum(float(o.get('amount') or 0) for o in opps_for_lead)

        # Label: high=converted to won opp, moderate=has opp but not won, low=no opp
        if won:
            category = 'high'
        elif has_opp:
            category = 'moderate'
        else:
            # Use rating as secondary signal
            rating = (lead.get('rating') or '').lower()
            if rating == 'hot':
                category = 'moderate'
            elif rating == 'warm':
                category = 'low'
            else:
                category = 'low'

        # Features
        company_size = lead.get('number_of_employees') or lead.get('company_size') or 0
        industry = (lead.get('industry') or 'other').lower()
        source = (lead.get('source') or lead.get('lead_source') or 'other').lower()
        status = (lead.get('status') or 'new').lower()
        rating = (lead.get('rating') or 'cold').lower()

        # Engagement features
        acts_for_lead = act_counts.get(lid, {'total': 0, 'completed': 0, 'overdue': 0})

        # Email domain
        email = lead.get('email') or ''
        is_business_email = 1
        personal = {'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'live.com'}
        if email:
            domain = email.split('@')[-1].lower()
            if domain in personal:
                is_business_email = 0

        rows.append({
            'company_size': float(company_size),
            'industry': industry,
            'source': source,
            'status': status,
            'rating': rating,
            'activity_count': acts_for_lead['total'],
            'completed_activities': acts_for_lead['completed'],
            'overdue_activities': acts_for_lead['overdue'],
            'has_opportunity': 1 if has_opp else 0,
            'opp_value': total_opp_value,
            'is_business_email': is_business_email,
            'category': category,
        })

    return pd.DataFrame(rows)


def generate_synthetic_data(n_samples=20000):
    """Fallback: generate synthetic data if DB is empty."""
    np.random.seed(42)
    INDUSTRIES = ["technology", "finance", "healthcare", "manufacturing", "retail", "education", "other"]
    SOURCES = ["website", "referral", "social_media", "email_campaign", "paid_ads", "event", "organic"]

    cs = np.clip(np.random.lognormal(5.0, 1.8, n_samples).astype(int), 1, 50000)
    ind = np.random.choice(INDUSTRIES, n_samples, p=[.22, .13, .10, .17, .18, .12, .08])
    src = np.random.choice(SOURCES, n_samples, p=[.20, .10, .18, .17, .15, .10, .10])
    pv = np.clip(np.random.poisson(7, n_samples) + np.isin(src, ['referral', 'event']) * 5, 0, 120)
    tos = np.clip(np.random.exponential(100, n_samples) + pv * 12, 0, 1500)
    eo = (np.random.uniform(0, 1, n_samples) < .3 + .15 * (src == 'referral') + .1 * (src == 'email_campaign')).astype(int)
    fs = (np.random.uniform(0, 1, n_samples) < .12 + .2 * (src == 'event') + .15 * (src == 'referral') + .0004 * tos).astype(int)
    dr = (np.random.uniform(0, 1, n_samples) < .04 + .12 * (src == 'event') + .08 * (src == 'referral') + .04 * (ind == 'technology')).astype(int)
    be = (np.random.uniform(0, 1, n_samples) < .6).astype(int)

    score = np.full(n_samples, 20.0)
    score += np.where(cs > 5000, 20, 0) + np.where((cs > 1000) & (cs <= 5000), 15, 0) + np.where((cs > 200) & (cs <= 1000), 10, 0) + np.where((cs > 50) & (cs <= 200), 5, 0)
    score += np.where(np.isin(ind, ['technology', 'finance', 'healthcare']), 10, 0)
    score += np.where(np.isin(src, ['referral', 'event']), 12, 0) + np.where(src == 'organic', 8, 0) + np.where(src == 'website', 4, 0)
    score += np.clip(pv * 0.5, 0, 12) + np.where(tos > 500, 8, 0) + np.where((tos > 200) & (tos <= 500), 4, 0)
    score += eo * 5 + fs * 10 + dr * 15 + be * 4
    score += np.where((src == 'referral') & (eo == 1), 4, 0) + np.where((src == 'event') & (fs == 1), 5, 0)
    score += np.random.normal(0, 2.5, n_samples)
    score = np.clip(score, 0, 100)

    df = pd.DataFrame({
        'company_size': cs, 'industry': ind, 'source': src,
        'activity_count': pv, 'completed_activities': eo,
        'overdue_activities': np.zeros(n_samples, dtype=int),
        'has_opportunity': fs, 'opp_value': score * 100,
        'is_business_email': be,
        'status': np.random.choice(['new', 'contacted', 'qualified', 'converted'], n_samples),
        'rating': np.random.choice(['hot', 'warm', 'cold'], n_samples, p=[.3, .4, .3]),
        'category': pd.cut(score, bins=[-1, 40, 65, 101], labels=['low', 'moderate', 'high']).astype(str),
    })
    return df


def train_model():
    logger.info("Attempting to fetch real CRM data from Supabase...")
    data = fetch_real_data()

    if data and len(data['leads']) >= 10:
        logger.info("Using REAL CRM data for training")
        df = build_features_from_real_data(data)
    else:
        logger.info("Insufficient real data — using synthetic data")
        df = generate_synthetic_data(20000)

    logger.info(f"Training data: {len(df)} samples")
    logger.info(f"Class distribution:\n{df['category'].value_counts().to_string()}")

    # Encode categoricals
    le_industry = LabelEncoder()
    le_source = LabelEncoder()
    le_status = LabelEncoder()
    le_rating = LabelEncoder()

    df['industry_enc'] = le_industry.fit_transform(df['industry'])
    df['source_enc'] = le_source.fit_transform(df['source'])
    df['status_enc'] = le_status.fit_transform(df['status'])
    df['rating_enc'] = le_rating.fit_transform(df['rating'])

    feature_columns = [
        'company_size', 'industry_enc', 'source_enc', 'status_enc', 'rating_enc',
        'activity_count', 'completed_activities', 'overdue_activities',
        'has_opportunity', 'opp_value', 'is_business_email',
    ]

    X = df[feature_columns].values
    y = df['category'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    logger.info("Training GradientBoosting model...")
    model = GradientBoostingClassifier(
        n_estimators=400, max_depth=6, learning_rate=0.1,
        min_samples_split=10, min_samples_leaf=5, subsample=0.8, random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"Test Accuracy: {accuracy:.2%}")
    logger.info(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")

    # Retrain on full data
    X_all_scaled = scaler.fit_transform(X)
    cv_scores = cross_val_score(model, X_all_scaled, y, cv=5, scoring='accuracy')
    logger.info(f"5-Fold CV Accuracy: {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

    model.fit(X_all_scaled, y)
    final_acc = accuracy_score(y, model.predict(X_all_scaled))
    logger.info(f"Final accuracy: {final_acc:.2%}")

    model_path = Path(__file__).parent / 'trained_model.joblib'
    joblib.dump({
        'model': model,
        'scaler': scaler,
        'feature_names': feature_columns,
        'label_encoder_industry': le_industry,
        'label_encoder_source': le_source,
        'label_encoder_status': le_status,
        'label_encoder_rating': le_rating,
        'model_version': '3.0.0',
        'training_accuracy': float(accuracy),
        'cv_accuracy': float(cv_scores.mean()),
        'final_accuracy': float(final_acc),
        'categories': ['low', 'moderate', 'high'],
        'trained_on_real_data': data is not None and len(data.get('leads', [])) >= 10,
    }, model_path)
    logger.info(f"Model saved to {model_path}")


if __name__ == '__main__':
    train_model()
