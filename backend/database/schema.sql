-- ============================================================
-- OptiRev Database Schema - Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create leads table (modify existing or create new)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  industry TEXT,
  source TEXT,
  amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'proposal_sent', 'won', 'lost')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expected_revenue DECIMAL(12,2),
  lead_score INTEGER DEFAULT 0,
  score_category TEXT DEFAULT 'low' CHECK (score_category IN ('low', 'medium', 'high')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
  next_follow_up DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create activities table (audit trail)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_manager_id ON leads(manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_employee_id ON follow_ups(employee_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users: Admin full access, Manager sees team, Employee sees self
CREATE POLICY "users_admin_all" ON users FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "users_manager_team" ON users FOR SELECT
  USING (
    auth.uid() = id OR
    auth.uid() = manager_id OR
    manager_id IN (SELECT id FROM users WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "users_employee_self" ON users FOR SELECT
  USING (auth.uid() = id);

-- Leads: Admin full access, Manager sees team leads, Employee sees assigned
CREATE POLICY "leads_admin_all" ON leads FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "leads_manager_access" ON leads FOR ALL
  USING (
    manager_id = auth.uid() OR
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

CREATE POLICY "leads_employee_access" ON leads FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- Follow-ups: Similar RBAC
CREATE POLICY "follow_ups_admin_all" ON follow_ups FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "follow_ups_employee_access" ON follow_ups FOR ALL
  USING (employee_id = auth.uid());

-- Activities: Admin sees all, others see own
CREATE POLICY "activities_admin_all" ON activities FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "activities_user_read" ON activities FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- Create default admin user (password: Admin123!)
-- Run this AFTER setting up the users table
-- ============================================================
-- INSERT INTO users (name, email, password_hash, role, status)
-- VALUES ('Admin', 'admin@crm.com', '$2a$12$LJ3m4ys3Lhdo5OJmR7W4heH1pV7Zx5Y8k3v6X2n8m9L0k1j2h3g4', 'admin', 'active');
-- Note: Generate proper bcrypt hash before inserting
