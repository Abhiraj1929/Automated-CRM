-- ============================================================
-- STEP10_campaigns.sql — Real Campaign Module
-- Run after STEP1-9 in Supabase SQL Editor
-- ============================================================

-- 1. Link leads to campaigns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);

-- 2. Campaign analytics columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS converted_leads INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS converted_contacts INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS converted_opportunities INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS pipeline_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS closed_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS roi DECIMAL(10,2) DEFAULT 0;

-- 3. Campaign response tracking (individual member interactions)
CREATE TABLE IF NOT EXISTS campaign_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  response_type VARCHAR(50) NOT NULL DEFAULT 'sent', -- sent, opened, clicked, replied, bounced, converted
  channel VARCHAR(50) DEFAULT 'email', -- email, sms, phone, social, ads
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_responses_campaign ON campaign_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_lead ON campaign_responses(lead_id);

-- 4. RLS for campaign_responses
ALTER TABLE campaign_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_responses_org_read" ON campaign_responses;
CREATE POLICY "campaign_responses_org_read" ON campaign_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "campaign_responses_org_insert" ON campaign_responses;
CREATE POLICY "campaign_responses_org_insert" ON campaign_responses
  FOR INSERT WITH CHECK (true);

-- 5. Add organization_id to escalation_rules for multi-tenant escalation
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 6. Add last_activity_at to leads for score decay tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Add approval_requests table for workflow approvals
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  changes JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_entity ON approval_requests(entity_type, entity_id);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_requests_all" ON approval_requests;
CREATE POLICY "approval_requests_all" ON approval_requests FOR ALL USING (true);
