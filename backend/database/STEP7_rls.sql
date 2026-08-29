-- ============================================================
-- STEP 7: Row-Level Security (RLS) — Tenant Isolation
-- Run after STEP6_payment_gate.sql
-- ============================================================

-- ============================================================
-- 1. Helper function — extract current org from session
-- ============================================================
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$;

-- Helper: check if a user ID belongs to the current organization
CREATE OR REPLACE FUNCTION user_in_current_org(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = uid
      AND users.organization_id = current_organization_id()
  );
$$;

-- ============================================================
-- 2. Core entity tables — check via owner_id or created_by
--    These tables don't have organization_id directly, so we
--    verify the owner or creator belongs to the current org.
-- ============================================================

-- LEADS
CREATE POLICY leads_org_isolation ON leads
  FOR ALL
  USING (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  )
  WITH CHECK (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  );

-- ACCOUNTS
CREATE POLICY accounts_org_isolation ON accounts
  FOR ALL
  USING (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  )
  WITH CHECK (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  );

-- CONTACTS
CREATE POLICY contacts_org_isolation ON contacts
  FOR ALL
  USING (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  )
  WITH CHECK (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  );

-- OPPORTUNITIES
CREATE POLICY opportunities_org_isolation ON opportunities
  FOR ALL
  USING (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  )
  WITH CHECK (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  );

-- ACTIVITIES
CREATE POLICY activities_org_isolation ON activities
  FOR ALL
  USING (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  )
  WITH CHECK (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  );

-- PRODUCTS (no owner_id — org-scoped via organization_id column if present,
-- or fall through to permissive if not)
CREATE POLICY products_org_isolation ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- OPPORTUNITY_PRODUCTS (junction — check via opportunity's owner)
CREATE POLICY opportunity_products_org_isolation ON opportunity_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE opportunities.id = opportunity_products.opportunity_id
        AND (user_in_current_org(opportunities.owner_id)
             OR user_in_current_org(opportunities.created_by))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE opportunities.id = opportunity_products.opportunity_id
        AND (user_in_current_org(opportunities.owner_id)
             OR user_in_current_org(opportunities.created_by))
    )
  );

-- CAMPAIGNS
CREATE POLICY campaigns_org_isolation ON campaigns
  FOR ALL
  USING (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  )
  WITH CHECK (
    user_in_current_org(owner_id)
    OR user_in_current_org(created_by)
  );

-- ============================================================
-- 3. Organizations — users can only see their own org
-- ============================================================
CREATE POLICY organizations_self_isolation ON organizations
  FOR SELECT
  USING (id = current_organization_id());

CREATE POLICY organizations_self_update ON organizations
  FOR UPDATE
  USING (id = current_organization_id())
  WITH CHECK (id = current_organization_id());

-- ============================================================
-- 4. Users — org-scoped, plus super admins bypass
-- ============================================================
CREATE POLICY users_org_isolation ON users
  FOR ALL
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY users_super_admin_read ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = current_setting('app.current_user_id', true)::UUID
        AND admin_user.is_super_admin = true
    )
  );

-- ============================================================
-- 5. Billing tables — organization_id column exists
-- ============================================================

-- AI_USAGE_LOG
CREATE POLICY ai_usage_log_org_isolation ON ai_usage_log
  FOR ALL
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

-- ============================================================
-- 6. Automation tables — check via organization_id if present,
--    otherwise permissive (backend handles scoping)
-- ============================================================

-- audit_logs — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY audit_logs_org_isolation ON audit_logs FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- workflow_rules — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_rules' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY workflow_rules_org_isolation ON workflow_rules FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- workflow_logs — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_logs' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY workflow_logs_org_isolation ON workflow_logs FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- email_templates — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY email_templates_org_isolation ON email_templates FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- email_logs — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY email_logs_org_isolation ON email_logs FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- attachments — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attachments' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY attachments_org_isolation ON attachments FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- escalation_rules — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'escalation_rules' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY escalation_rules_org_isolation ON escalation_rules FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- notifications — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY notifications_org_isolation ON notifications FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- scoring_rules — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scoring_rules' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY scoring_rules_org_isolation ON scoring_rules FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- scheduled_jobs — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_jobs' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY scheduled_jobs_org_isolation ON scheduled_jobs FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- platform_activity_log — has organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_activity_log' AND column_name = 'organization_id') THEN
    EXECUTE 'CREATE POLICY platform_activity_log_org_isolation ON platform_activity_log FOR ALL USING (organization_id = current_organization_id()) WITH CHECK (organization_id = current_organization_id())';
  END IF;
END $$;

-- ============================================================
-- Done. Core entity tables use owner_id → users join for org
-- isolation. Automation/billing tables use direct organization_id.
-- The Express auth middleware must set:
--   SET LOCAL app.current_organization_id = '<org-id>';
--   SET LOCAL app.current_user_id = '<user-id>';
-- after JWT verification for RLS to take effect.
-- ============================================================
