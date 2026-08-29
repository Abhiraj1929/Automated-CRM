-- ============================================================
-- STEP9_invitations.sql — Team Invitations + Auto-Assignment
-- Run after STEP1-8 in Supabase SQL Editor
-- ============================================================

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  department VARCHAR(100),
  designation VARCHAR(100),
  token VARCHAR(512) NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Lead assignment rules
CREATE TABLE IF NOT EXISTS lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '[]', -- [{ field, operator, value }]
  action JSONB NOT NULL DEFAULT '{}', -- { type: 'assign_to'|'round_robin'|'assign_to_manager', user_id?, team_name? }
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_org ON lead_assignment_rules(organization_id);

-- Add onboarding tracking to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Add user limit column to organizations (enforced by backend)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_user_count INTEGER DEFAULT 0;

-- RLS for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_org_read" ON invitations;
CREATE POLICY "invitations_org_read" ON invitations
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "invitations_org_insert" ON invitations;
CREATE POLICY "invitations_org_insert" ON invitations
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "invitations_org_update" ON invitations;
CREATE POLICY "invitations_org_update" ON invitations
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "invitations_org_delete" ON invitations;
CREATE POLICY "invitations_org_delete" ON invitations
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for lead_assignment_rules
ALTER TABLE lead_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignment_rules_org_read" ON lead_assignment_rules;
CREATE POLICY "assignment_rules_org_read" ON lead_assignment_rules
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "assignment_rules_org_insert" ON lead_assignment_rules;
CREATE POLICY "assignment_rules_org_insert" ON lead_assignment_rules
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "assignment_rules_org_update" ON lead_assignment_rules;
CREATE POLICY "assignment_rules_org_update" ON lead_assignment_rules
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "assignment_rules_org_delete" ON lead_assignment_rules;
CREATE POLICY "assignment_rules_org_delete" ON lead_assignment_rules
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );
