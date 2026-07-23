-- ============================================================
-- AI CRM - Seed Data (Business CRM)
-- Run AFTER Step 1 schema
-- Passwords: Admin123!, Manager123!, Employee123!
-- ============================================================

-- Users (same as before)
INSERT INTO users (name, email, password_hash, role, status, department, designation)
VALUES
  ('System Admin', 'admin@crm.com', '$2b$12$G9IYG0dedsqov0OFppB0wuRp.tndYD8l1cmUT8JkUNFPM9Ou6TUYC', 'admin', 'active', 'Management', 'System Administrator'),
  ('Sarah Chen', 'sarah@company.com', '$2b$12$OpnfmNA0ez3/GIb9Ci5t9uxGFwAJ0IljGhIQ.Ih8nFIjLfqynt0Tu', 'manager', 'active', 'Sales', 'Sales Manager')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role, status, manager_id, department, designation)
SELECT 'Marcus Johnson', 'marcus@company.com', '$2b$12$nYmtLv05.rMj88co17VCTu/D0htNZYYzSEG01BROixEkNPAma1Zh2', 'employee', 'active', id, 'Sales', 'Sales Representative'
FROM users WHERE email = 'sarah@company.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role, status, manager_id, department, designation)
SELECT 'Emily Rodriguez', 'emily@company.com', '$2b$12$nYmtLv05.rMj88co17VCTu/D0htNZYYzSEG01BROixEkNPAma1Zh2', 'employee', 'active', id, 'Sales', 'Sales Representative'
FROM users WHERE email = 'sarah@company.com'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- ACCOUNTS (Companies)
-- ============================================================
INSERT INTO accounts (name, industry, website, phone, email, city, state, country, annual_revenue, number_of_employees, owner_id, created_by)
SELECT 'Acme Corporation', 'Technology', 'https://acme.com', '+1 (555) 100-2000', 'info@acme.com', 'San Francisco', 'CA', 'USA', 5000000, 250, id, id FROM users WHERE email = 'admin@crm.com';

INSERT INTO accounts (name, industry, website, phone, email, city, state, country, annual_revenue, number_of_employees, owner_id, created_by)
SELECT 'TechStart Inc', 'SaaS', 'https://techstart.io', '+1 (555) 200-3000', 'hello@techstart.io', 'Austin', 'TX', 'USA', 2000000, 80, id, id FROM users WHERE email = 'admin@crm.com';

INSERT INTO accounts (name, industry, website, phone, email, city, state, country, annual_revenue, number_of_employees, owner_id, created_by)
SELECT 'Global Solutions Ltd', 'Consulting', 'https://globalsolutions.com', '+1 (555) 300-4000', 'contact@globalsolutions.com', 'New York', 'NY', 'USA', 8000000, 500, id, id FROM users WHERE email = 'admin@crm.com';

INSERT INTO accounts (name, industry, website, phone, email, city, state, country, annual_revenue, number_of_employees, owner_id, created_by)
SELECT 'DataFlow Systems', 'Data Analytics', 'https://dataflow.com', '+1 (555) 400-5000', 'sales@dataflow.com', 'Seattle', 'WA', 'USA', 3500000, 150, id, id FROM users WHERE email = 'admin@crm.com';

INSERT INTO accounts (name, industry, website, phone, email, city, state, country, annual_revenue, number_of_employees, owner_id, created_by)
SELECT 'Legacy Corp', 'Manufacturing', 'https://legacycorp.com', '+1 (555) 500-6000', 'info@legacycorp.com', 'Chicago', 'IL', 'USA', 12000000, 800, id, id FROM users WHERE email = 'admin@crm.com';

-- ============================================================
-- CONTACTS (People at companies)
-- ============================================================
INSERT INTO contacts (first_name, last_name, email, phone, title, department, account_id, owner_id, created_by)
SELECT 'John', 'Smith', 'john.smith@acme.com', '+1 (555) 111-2222', 'CTO', 'Technology', a.id, u.id, u.id
FROM accounts a, users u WHERE a.name = 'Acme Corporation' AND u.email = 'sarah@company.com';

INSERT INTO contacts (first_name, last_name, email, phone, title, department, account_id, owner_id, created_by)
SELECT 'Lisa', 'Wang', 'lisa.wang@techstart.io', '+1 (555) 222-3333', 'VP Engineering', 'Engineering', a.id, u.id, u.id
FROM accounts a, users u WHERE a.name = 'TechStart Inc' AND u.email = 'sarah@company.com';

INSERT INTO contacts (first_name, last_name, email, phone, title, department, account_id, owner_id, created_by)
SELECT 'Robert', 'Brown', 'robert.brown@globalsolutions.com', '+1 (555) 333-4444', 'CFO', 'Finance', a.id, u.id, u.id
FROM accounts a, users u WHERE a.name = 'Global Solutions Ltd' AND u.email = 'sarah@company.com';

INSERT INTO contacts (first_name, last_name, email, phone, title, department, account_id, owner_id, created_by)
SELECT 'Jennifer', 'Davis', 'jennifer.davis@dataflow.com', '+1 (555) 444-5555', 'CEO', 'Executive', a.id, u.id, u.id
FROM accounts a, users u WHERE a.name = 'DataFlow Systems' AND u.email = 'marcus@company.com';

INSERT INTO contacts (first_name, last_name, email, phone, title, department, account_id, owner_id, created_by)
SELECT 'Michael', 'Wilson', 'michael.wilson@legacycorp.com', '+1 (555) 555-6666', 'COO', 'Operations', a.id, u.id, u.id
FROM accounts a, users u WHERE a.name = 'Legacy Corp' AND u.email = 'marcus@company.com';

-- ============================================================
-- LEADS (Prospects)
-- ============================================================
INSERT INTO leads (first_name, last_name, email, phone, company, title, industry, source, status, rating, annual_revenue, owner_id, created_by)
SELECT 'David', 'Lee', 'david.lee@startupxyz.com', '+1 (555) 666-7777', 'StartupXYZ', 'Founder', 'Technology', 'website', 'new', 'hot', 500000, u.id, u.id
FROM users u WHERE u.email = 'sarah@company.com';

INSERT INTO leads (first_name, last_name, email, phone, company, title, industry, source, status, rating, annual_revenue, owner_id, created_by)
SELECT 'Amanda', 'Taylor', 'amanda.taylor@costcut.com', '+1 (555) 777-8888', 'CostCut Inc', 'VP Operations', 'Finance', 'referral', 'contacted', 'warm', 1200000, u.id, u.id
FROM users u WHERE u.email = 'sarah@company.com';

INSERT INTO leads (first_name, last_name, email, phone, company, title, industry, source, status, rating, annual_revenue, owner_id, created_by)
SELECT 'Chris', 'Martinez', 'chris.martinez@newco.com', '+1 (555) 888-9999', 'NewCo', 'Director of IT', 'Technology', 'linkedin', 'qualified', 'hot', 3000000, u.id, u.id
FROM users u WHERE u.email = 'marcus@company.com';

-- ============================================================
-- OPPORTUNITIES (Active deals)
-- ============================================================
INSERT INTO opportunities (name, account_id, contact_id, stage, amount, probability, expected_revenue, close_date, type, owner_id, created_by)
SELECT 'Acme Enterprise License', a.id, c.id, 'proposal', 125000, 60, 75000, '2026-03-31', 'new_business', u.id, u.id
FROM accounts a, contacts c, users u
WHERE a.name = 'Acme Corporation' AND c.email = 'john.smith@acme.com' AND u.email = 'sarah@company.com';

INSERT INTO opportunities (name, account_id, contact_id, stage, amount, probability, expected_revenue, close_date, type, owner_id, created_by)
SELECT 'TechStart SaaS Upgrade', a.id, c.id, 'negotiation', 45000, 80, 36000, '2026-02-28', 'existing_business', u.id, u.id
FROM accounts a, contacts c, users u
WHERE a.name = 'TechStart Inc' AND c.email = 'lisa.wang@techstart.io' AND u.email = 'sarah@company.com';

INSERT INTO opportunities (name, account_id, contact_id, stage, amount, probability, expected_revenue, close_date, type, owner_id, created_by)
SELECT 'DataFlow Annual Subscription', a.id, c.id, 'needs_analysis', 89000, 40, 35600, '2026-04-15', 'renewal', u.id, u.id
FROM accounts a, contacts c, users u
WHERE a.name = 'DataFlow Systems' AND c.email = 'jennifer.davis@dataflow.com' AND u.email = 'marcus@company.com';

INSERT INTO opportunities (name, account_id, contact_id, stage, amount, probability, expected_revenue, close_date, type, owner_id, created_by)
SELECT 'Legacy Digital Transformation', a.id, c.id, 'qualification', 250000, 20, 50000, '2026-06-30', 'new_business', u.id, u.id
FROM accounts a, contacts c, users u
WHERE a.name = 'Legacy Corp' AND c.email = 'michael.wilson@legacycorp.com' AND u.email = 'sarah@company.com';

INSERT INTO opportunities (name, account_id, contact_id, stage, amount, probability, expected_revenue, close_date, type, owner_id, created_by)
SELECT 'Global Consulting Package', a.id, c.id, 'closed_won', 28000, 100, 28000, '2026-01-15', 'new_business', u.id, u.id
FROM accounts a, contacts c, users u
WHERE a.name = 'Global Solutions Ltd' AND c.email = 'robert.brown@globalsolutions.com' AND u.email = 'marcus@company.com';

-- ============================================================
-- ACTIVITIES (Sample)
-- ============================================================
INSERT INTO activities (type, subject, description, status, what_id, what_type, owner_id, created_by, due_date)
SELECT 'call', 'Discovery Call with John Smith', 'Discussed Acme enterprise requirements', 'completed', o.id, 'opportunity', u.id, u.id, NOW() - INTERVAL '2 days'
FROM opportunities o, users u WHERE o.name = 'Acme Enterprise License' AND u.email = 'sarah@company.com';

INSERT INTO activities (type, subject, description, status, what_id, what_type, owner_id, created_by, due_date)
SELECT 'email', 'Proposal Sent to TechStart', 'Sent pricing proposal for SaaS upgrade', 'completed', o.id, 'opportunity', u.id, u.id, NOW() - INTERVAL '1 day'
FROM opportunities o, users u WHERE o.name = 'TechStart SaaS Upgrade' AND u.email = 'sarah@company.com';

INSERT INTO activities (type, subject, description, status, priority, what_id, what_type, owner_id, created_by, due_date)
SELECT 'task', 'Follow up on DataFlow proposal', 'Need to schedule follow-up meeting', 'open', 'high', o.id, 'opportunity', u.id, u.id, NOW() + INTERVAL '3 days'
FROM opportunities o, users u WHERE o.name = 'DataFlow Annual Subscription' AND u.email = 'marcus@company.com';

INSERT INTO activities (type, subject, description, status, who_id, who_type, owner_id, created_by, due_date)
SELECT 'meeting', 'Product Demo for NewCo', 'Chris wants to see the platform demo', 'open', l.id, 'lead', u.id, u.id, NOW() + INTERVAL '5 days'
FROM leads l, users u WHERE l.email = 'chris.martinez@newco.com' AND u.email = 'marcus@company.com';

-- ============================================================
-- PRODUCTS
-- ============================================================
INSERT INTO products (name, code, description, unit_price) VALUES
  ('CRM Starter', 'CRM-START', 'Basic CRM with 5 users', 49.00),
  ('CRM Professional', 'CRM-PRO', 'Full CRM with 25 users', 149.00),
  ('CRM Enterprise', 'CRM-ENT', 'Unlimited CRM with API access', 349.00),
  ('AI Add-on', 'AI-ADD', 'AI lead scoring and insights', 99.00),
  ('Analytics Module', 'ANALYTICS', 'Advanced reporting and dashboards', 79.00),
  ('Premium Support', 'SUP-PREM', '24/7 priority support', 199.00);
