-- ============================================================
-- STEP6_payment_gate.sql — Enforce payment before account activation
-- Run after STEP1-STEP5 in Supabase SQL Editor
-- ============================================================

-- Add 'pending' to users status CHECK constraint (Salesforce-style)
-- Users start as 'pending', become 'active' only after payment
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));

-- Add 'pending' to organizations status CHECK constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'trial', 'cancelled', 'suspended'));

-- Ensure existing users are active (they already paid or are seed data)
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE organizations SET status = 'active' WHERE status IS NULL;
