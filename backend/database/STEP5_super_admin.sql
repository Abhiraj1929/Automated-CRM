-- ============================================================
-- STEP5_super_admin.sql — Super Admin, trial management, org fields
-- Run after STEP1–4 in Supabase SQL Editor
-- ============================================================

-- Add super admin flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- Ensure organizations has all required trial/billing fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trialing';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS credits_bonus INTEGER DEFAULT 0;

-- Activity log for super admin dashboard feed
CREATE TABLE IF NOT EXISTS platform_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_activity_created ON platform_activity_log(created_at DESC);

-- RLS
ALTER TABLE platform_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage" ON platform_activity_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = true)
  );

