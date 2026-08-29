-- ============================================================
-- STEP8_data_sources.sql — Data Source Plugins for Lead Collection
-- Run after STEP1-7 in Supabase SQL Editor
-- ============================================================

-- Data Sources (connected platforms)
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'property_portal', 'email', 'whatsapp', 'ecommerce', 'webhook', 'csv'
  platform VARCHAR(100), -- '99acres', 'housing', 'magicbricks', 'amazon', 'gmail', 'whatsapp_business'
  config JSONB NOT NULL DEFAULT '{}', -- API keys, credentials, settings
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'error'
  last_sync_at TIMESTAMPTZ,
  last_sync_result JSONB, -- { leads_found: 5, leads_created: 3, errors: [] }
  total_leads_collected INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_org ON data_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);

-- Lead Imports (history of all imports)
CREATE TABLE IF NOT EXISTS lead_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL, -- 'auto_scrape', 'email_parse', 'whatsapp', 'api_fetch', 'csv_upload', 'manual'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_rows INTEGER DEFAULT 0,
  imported INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  file_name VARCHAR(255),
  raw_data JSONB, -- store preview/sample of imported data
  imported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_imports_org ON lead_imports(organization_id);

-- Add source tracking to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS imported_via VARCHAR(50); -- 'scraper', 'email', 'whatsapp', 'api', 'csv', 'manual'
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_id VARCHAR(255); -- unique ID from source platform
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'; -- raw inbound payload
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inquiry_count INTEGER DEFAULT 0; -- how many times this lead re-inquired
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_inquiry_at TIMESTAMPTZ; -- timestamp of most recent inquiry
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget VARCHAR(100); -- budget/range from lead form
ALTER TABLE leads ADD COLUMN IF NOT EXISTS vertical_type VARCHAR(50); -- ML-classified industry vertical
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scoring_method VARCHAR(20); -- 'ml', 'rules', 'default'
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_factors JSONB DEFAULT '[]'; -- breakdown of scoring factors

-- Add metadata JSONB to organizations for round-robin tracking and extensibility
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_leads_organization ON leads(organization_id);

-- Integration credentials — per-organization API keys for external platforms
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL, -- 'meta_ads', 'google_ads', 'indiamart', 'justdial', 'whatsapp', 'gmail'
  name VARCHAR(255) NOT NULL, -- user-friendly label: "Facebook Lead Ads"
  credentials JSONB NOT NULL DEFAULT '{}', -- platform-specific: { access_token, app_secret, form_id, etc. }
  api_key VARCHAR(512), -- optional webhook verification key
  webhook_secret VARCHAR(255), -- for validating incoming webhooks
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_org ON integration_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_platform ON integration_credentials(platform);

-- Webhook logs — audit trail for all inbound webhook calls
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  payload JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'received', -- 'received', 'processed', 'failed'
  leads_created INTEGER DEFAULT 0,
  leads_duplicated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_org ON webhook_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);

-- Deduplication: unique constraint on (organization_id, external_id) when external_id is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_id ON leads(organization_id, external_id) WHERE external_id IS NOT NULL;
-- Deduplication: unique constraint on (organization_id, email) when email is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_org ON leads(organization_id, email) WHERE email IS NOT NULL;
-- Deduplication: unique constraint on (organization_id, phone) when phone is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_org ON leads(organization_id, phone) WHERE phone IS NOT NULL;

-- RLS for data_sources
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_sources_org_read" ON data_sources
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "data_sources_org_insert" ON data_sources
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "data_sources_org_update" ON data_sources
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "data_sources_org_delete" ON data_sources
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for lead_imports
ALTER TABLE lead_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_imports_org_read" ON lead_imports
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "lead_imports_org_insert" ON lead_imports
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- RLS for integration_credentials
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_credentials_org_read" ON integration_credentials
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "integration_credentials_org_insert" ON integration_credentials
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "integration_credentials_org_update" ON integration_credentials
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "integration_credentials_org_delete" ON integration_credentials
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs_org_read" ON webhook_logs
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "webhook_logs_org_insert" ON webhook_logs
  FOR INSERT WITH CHECK (true);
