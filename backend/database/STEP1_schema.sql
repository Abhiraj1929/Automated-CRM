-- ============================================================
-- AI CRM - Business CRM Schema (Salesforce-style)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop old tables if they exist
DROP TABLE IF EXISTS opportunity_products CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- ============================================================
-- 1. ACCOUNTS (Companies/Organizations)
-- ============================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  annual_revenue DECIMAL(15,2),
  number_of_employees INTEGER,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CONTACTS (People at companies)
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  title TEXT,
  department TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  mailing_address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  description TEXT,
  lead_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. OPPORTUNITIES (Deals/Sales pipeline)
-- ============================================================
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'prospecting' CHECK (stage IN (
    'prospecting', 'qualification', 'needs_analysis',
    'proposal', 'negotiation', 'closed_won', 'closed_lost'
  )),
  amount DECIMAL(15,2) DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_revenue DECIMAL(15,2),
  close_date DATE,
  type TEXT DEFAULT 'new_business' CHECK (type IN ('new_business', 'existing_business', 'renewal')),
  lead_source TEXT,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. LEADS (Prospects before conversion)
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  title TEXT,
  industry TEXT,
  source TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  rating TEXT DEFAULT 'warm' CHECK (rating IN ('hot', 'warm', 'cold')),
  annual_revenue DECIMAL(15,2),
  number_of_employees INTEGER,
  website TEXT,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  converted_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  converted_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  converted_opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  lead_score INTEGER DEFAULT 0,
  score_category TEXT DEFAULT 'low' CHECK (score_category IN ('low', 'medium', 'high')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ACTIVITIES (Calls, Emails, Meetings, Tasks)
-- ============================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'task', 'note')),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  who_id UUID,
  what_id UUID,
  who_type TEXT CHECK (who_type IN ('contact', 'lead')),
  what_type TEXT CHECK (what_type IN ('account', 'opportunity')),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  unit_price DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. OPPORTUNITY PRODUCTS (Line items)
-- ============================================================
CREATE TABLE opportunity_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_accounts_owner ON accounts(owner_id);
CREATE INDEX idx_accounts_industry ON accounts(industry);
CREATE INDEX idx_accounts_name ON accounts(name);

CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts(last_name, first_name);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_company ON leads(company);

CREATE INDEX idx_opps_stage ON opportunities(stage);
CREATE INDEX idx_opps_account ON opportunities(account_id);
CREATE INDEX idx_opps_contact ON opportunities(contact_id);
CREATE INDEX idx_opps_owner ON opportunities(owner_id);
CREATE INDEX idx_opps_close_date ON opportunities(close_date);
CREATE INDEX idx_opps_amount ON opportunities(amount);

CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_owner ON activities(owner_id);
CREATE INDEX idx_activities_who ON activities(who_id, who_type);
CREATE INDEX idx_activities_what ON activities(what_id, what_type);
CREATE INDEX idx_activities_due ON activities(due_date);

CREATE INDEX idx_opp_products_opp ON opportunity_products(opportunity_id);
CREATE INDEX idx_opp_products_product ON opportunity_products(product_id);

-- ============================================================
-- 8. CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'email' CHECK (type IN ('email', 'social', 'webinar', 'event', 'ads', 'referral', 'other')),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2) DEFAULT 0,
  actual_cost DECIMAL(15,2) DEFAULT 0,
  expected_leads INTEGER DEFAULT 0,
  actual_leads INTEGER DEFAULT 0,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);

-- ============================================================
-- ROW LEVEL SECURITY (disabled - backend uses service_role)
-- ============================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all" ON opportunities FOR ALL USING (true);
CREATE POLICY "Allow all" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true);
CREATE POLICY "Allow all" ON opportunity_products FOR ALL USING (true);
CREATE POLICY "Allow all" ON campaigns FOR ALL USING (true);
