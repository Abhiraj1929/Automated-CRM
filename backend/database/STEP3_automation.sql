-- ============================================================
-- STEP 3: Automation Tables
-- Run AFTER Step 1 + Step 2
-- ============================================================

-- 1. AUDIT TRAIL (track all changes)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- 2. WORKFLOW RULES (automation engine)
CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'opportunity', 'account', 'activity', 'task')),
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('on_create', 'on_update', 'on_status_change', 'on_field_change', 'on_schedule')),
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workflow_entity ON workflow_rules(entity_type);
CREATE INDEX idx_workflow_active ON workflow_rules(is_active);

-- 3. WORKFLOW EXECUTION LOG
CREATE TABLE IF NOT EXISTS workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES workflow_rules(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  trigger_event TEXT NOT NULL,
  conditions_met BOOLEAN DEFAULT false,
  actions_executed JSONB,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workflow_logs_rule ON workflow_logs(rule_id);
CREATE INDEX idx_workflow_logs_entity ON workflow_logs(entity_type, entity_id);

-- 4. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'lead_followup', 'proposal', 'meeting', 'task_reminder', 'welcome', 'custom')),
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMAIL LOG (sent emails)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  to_entity_type TEXT,
  to_entity_id UUID,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'draft')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_logs_to ON email_logs(to_email);
CREATE INDEX idx_email_logs_entity ON email_logs(to_entity_type, to_entity_id);

-- 6. FILE ATTACHMENTS
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- 7. ESCALATION RULES
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'task', 'opportunity')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('no_activity_days', 'overdue_days', 'stage_stale_days', 'status_stale_days')),
  threshold_days INTEGER NOT NULL DEFAULT 7,
  actions JSONB NOT NULL DEFAULT '[]',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTIFICATIONS (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- 9. LEAD SCORING RULES
CREATE TABLE IF NOT EXISTS scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  field TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('equals', 'contains', 'greater_than', 'less_than', 'in_list', 'not_empty')),
  value TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default scoring rules
INSERT INTO scoring_rules (name, field, condition, value, score) VALUES
  ('Has email', 'email', 'not_empty', 'true', 5),
  ('Has phone', 'phone', 'not_empty', 'true', 5),
  ('Has company', 'company', 'not_empty', 'true', 10),
  ('Hot rating', 'rating', 'equals', 'hot', 20),
  ('Warm rating', 'rating', 'equals', 'warm', 10),
  ('Tech industry', 'industry', 'equals', 'Technology', 15),
  ('Finance industry', 'industry', 'equals', 'Finance', 12),
  ('From website', 'source', 'equals', 'website', 10),
  ('From referral', 'source', 'equals', 'referral', 15),
  ('High revenue', 'annual_revenue', 'greater_than', '1000000', 20),
  ('Many employees', 'number_of_employees', 'greater_than', '100', 10)
ON CONFLICT DO NOTHING;

-- 10. SCHEDULED JOBS
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('escalation', 'scoring', 'cleanup', 'report', 'notification')),
  cron_expression TEXT,
  interval_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default scheduled jobs
INSERT INTO scheduled_jobs (name, job_type, interval_minutes, config) VALUES
  ('Auto-escalate stale leads', 'escalation', 60, '{"type":"leads"}'),
  ('Re-score all leads', 'scoring', 360, '{}'),
  ('Check overdue tasks', 'escalation', 30, '{"type":"tasks"}'),
  ('Clean old notifications', 'cleanup', 1440, '{"days_old":30}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS for new tables
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON workflow_rules FOR ALL USING (true);
CREATE POLICY "Allow all" ON workflow_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON email_templates FOR ALL USING (true);
CREATE POLICY "Allow all" ON email_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON attachments FOR ALL USING (true);
CREATE POLICY "Allow all" ON escalation_rules FOR ALL USING (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all" ON scoring_rules FOR ALL USING (true);
CREATE POLICY "Allow all" ON scheduled_jobs FOR ALL USING (true);
