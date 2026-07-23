-- ============================================================
-- Seed Data - Default admin user and sample data
-- ============================================================

-- Create admin user (password: Admin123!)
-- First generate the hash in Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin123!', 12).then(h => console.log(h))"

-- Then run this with the generated hash:
INSERT INTO users (name, email, password_hash, role, status)
VALUES (
  'System Admin',
  'admin@crm.com',
  '$2a$12$YOUR_GENERATED_HASH_HERE', -- Replace with actual bcrypt hash
  'admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- Sample Manager
INSERT INTO users (name, email, password_hash, role, status, department, designation)
VALUES (
  'Sarah Chen',
  'sarah@company.com',
  '$2a$12$YOUR_GENERATED_HASH_HERE', -- Replace with actual bcrypt hash
  'manager',
  'active',
  'Sales',
  'Sales Manager'
)
ON CONFLICT (email) DO NOTHING;

-- Sample Employees (assigned to Sarah)
INSERT INTO users (name, email, password_hash, role, status, manager_id, department, designation)
SELECT
  'Marcus Johnson',
  'marcus@company.com',
  '$2a$12$YOUR_GENERATED_HASH_HERE',
  'employee',
  'active',
  (SELECT id FROM users WHERE email = 'sarah@company.com'),
  'Sales',
  'Sales Representative'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role, status, manager_id, department, designation)
SELECT
  'Emily Rodriguez',
  'emily@company.com',
  '$2a$12$YOUR_GENERATED_HASH_HERE',
  'employee',
  'active',
  (SELECT id FROM users WHERE email = 'sarah@company.com'),
  'Sales',
  'Sales Representative'
ON CONFLICT (email) DO NOTHING;
