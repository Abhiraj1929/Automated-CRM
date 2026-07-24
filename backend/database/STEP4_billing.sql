-- ============================================================
-- STEP4_billing.sql — Organizations, billing, and AI quota
-- Run after STEP1, STEP2, STEP3 in Supabase SQL Editor
-- ============================================================

-- Organizations / Workspaces
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  ai_score_quota_monthly INTEGER NOT NULL DEFAULT 100,
  ai_score_used_this_month INTEGER NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- AI Usage Log (tracks every scoring call)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  lead_id UUID,
  score INTEGER,
  model_version VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage_log(organization_id, created_at);

-- Add organization_id to users table (links user to workspace)
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

-- ============================================================
-- Plan Quota Configuration (reference data)
-- ============================================================
-- starter:    100 AI scores/mo, 5 users, 1000 contacts
-- pro:        5000 AI scores/mo, unlimited users, 15000 contacts
-- enterprise: unlimited AI scores, unlimited users, unlimited contacts
-- ============================================================

-- RLS: organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_read" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "org_admin_manage" ON organizations
  FOR ALL USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS: ai_usage_log
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_org_read" ON ai_usage_log
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "ai_usage_insert" ON ai_usage_log
  FOR INSERT WITH CHECK (true);
