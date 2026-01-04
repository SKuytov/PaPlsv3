-- Migration: Integrate multi-user roles with existing schema
-- Purpose: Align new technician roles with existing users/roles tables
-- Date: 2026-01-04
-- Note: This migration works with existing users and roles tables

-- 1. Update existing roles table to support technician-specific metadata
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS can_restock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_inventory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_approve_inventory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Shield',
ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT 'bg-slate-600',
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_technician_role BOOLEAN DEFAULT FALSE;

-- 2. Create technician_profiles table to extend users for technician-specific data
CREATE TABLE IF NOT EXISTS technician_profiles (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  rfid_card_id VARCHAR(100) UNIQUE,
  assigned_buildings JSONB DEFAULT '[]',
  specializations JSONB DEFAULT '[]',
  certification_level VARCHAR(50),
  department VARCHAR(100),
  phone_number VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_technician_profiles_user_id ON technician_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_technician_profiles_rfid ON technician_profiles(rfid_card_id);

-- 3. Create technician_permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS technician_permissions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  role_id UUID NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_technician_permissions_role_id ON technician_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_technician_permissions_permission ON technician_permissions(permission);

-- 4. Create inventory_restock_log table for audit trail
CREATE TABLE IF NOT EXISTS inventory_restock_log (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  spare_part_id BIGINT NOT NULL,
  quantity_added INT NOT NULL DEFAULT 0,
  reason VARCHAR(200),
  previous_quantity INT,
  new_quantity INT,
  building VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT quantity_added_positive CHECK (quantity_added > 0)
);

CREATE INDEX IF NOT EXISTS idx_restock_log_user_id ON inventory_restock_log(user_id);
CREATE INDEX IF NOT EXISTS idx_restock_log_spare_part ON inventory_restock_log(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_restock_log_building ON inventory_restock_log(building);
CREATE INDEX IF NOT EXISTS idx_restock_log_created ON inventory_restock_log(created_at DESC);

-- 5. Enable Row Level Security
ALTER TABLE inventory_restock_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy for restock logs (readable by authorized users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_restock_log' AND policyname = 'allow_view_restock_logs'
  ) THEN
    CREATE POLICY allow_view_restock_logs ON inventory_restock_log
    FOR SELECT USING (true);
  END IF;
END
$$;

-- 7. Create trigger for updating technician_profiles updated_at
CREATE OR REPLACE FUNCTION update_technician_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS technician_profiles_updated_at ON technician_profiles;
CREATE TRIGGER technician_profiles_updated_at
BEFORE UPDATE ON technician_profiles
FOR EACH ROW
EXECUTE FUNCTION update_technician_profiles_updated_at();

-- 8. Seed initial technician roles into existing roles table
-- Only insert if they don't exist
INSERT INTO roles (name, description, permissions, can_restock, can_edit_inventory, can_view_reports, can_approve_inventory, icon, color, priority, is_technician_role)
VALUES
  ('Building 1 Technician', 'Technician assigned to Building 1', '{"view_inventory": true, "restock_inventory": true}'::jsonb, true, false, false, false, 'Wrench', 'bg-blue-500', 1, true),
  ('Building 2 Technician', 'Technician assigned to Building 2', '{"view_inventory": true, "restock_inventory": true}'::jsonb, true, false, false, false, 'Wrench', 'bg-blue-600', 1, true),
  ('Building 3/5 Technician', 'Technician assigned to Buildings 3 & 5', '{"view_inventory": true, "restock_inventory": true}'::jsonb, true, false, false, false, 'Wrench', 'bg-blue-700', 1, true),
  ('Building 4 Technician', 'Technician assigned to Building 4', '{"view_inventory": true, "restock_inventory": true}'::jsonb, true, false, false, false, 'Wrench', 'bg-blue-800', 1, true),
  ('Maintenance Organizer', 'Coordinates all maintenance operations', '{"view_inventory": true, "restock_inventory": true, "edit_inventory": true, "view_reports": true}'::jsonb, true, true, true, false, 'Briefcase', 'bg-purple-600', 2, true),
  ('Head Technician', 'Supervises technical team', '{"view_inventory": true, "restock_inventory": true, "edit_inventory": true, "view_reports": true, "approve_restock": true, "manage_users": true}'::jsonb, true, true, true, true, 'Crown', 'bg-orange-500', 3, true),
  ('Technical Director', 'Oversees all technical operations', '{"view_inventory": true, "restock_inventory": true, "edit_inventory": true, "view_reports": true, "approve_restock": true, "manage_users": true, "view_audit_logs": true}'::jsonb, true, true, true, true, 'Zap', 'bg-red-600', 4, true),
  ('CEO', 'Executive leadership - read only access', '{"view_reports": true, "view_executive_dashboard": true}'::jsonb, false, false, true, false, 'TrendingUp', 'bg-green-600', 5, false),
  ('God Admin', 'System administrator with full access', '{"system_admin": true}'::jsonb, true, true, true, true, 'Shield', 'bg-slate-800', 99, false)
ON CONFLICT (name) DO NOTHING;

-- 9. Populate technician_permissions from roles with permissions
INSERT INTO technician_permissions (role_id, permission)
SELECT id, permission FROM (
  SELECT 
    r.id,
    jsonb_object_keys(r.permissions) as permission
  FROM roles r
  WHERE r.is_technician_role = true
) t
ON CONFLICT DO NOTHING;

-- 10. Add all permissions for each role (comprehensive)
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_inventory' FROM roles WHERE name LIKE '%Building%Technician%'
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'restock_inventory' FROM roles WHERE name LIKE '%Building%Technician%'
ON CONFLICT DO NOTHING;

-- Maintenance Organizer and above
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'edit_inventory' FROM roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'approve_restock' FROM roles WHERE name IN ('Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'manage_users' FROM roles WHERE name IN ('Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_audit_logs' FROM roles WHERE name IN ('Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_reports' FROM roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'CEO', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'system_admin' FROM roles WHERE name = 'God Admin'
ON CONFLICT DO NOTHING;

-- 11. Create view for user role information (useful for queries)
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.id as role_id,
  r.name as role_name,
  r.description as role_description,
  r.permissions,
  r.can_restock,
  r.can_edit_inventory,
  r.can_view_reports,
  r.can_approve_inventory,
  tp.assigned_buildings,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN technician_profiles tp ON u.id = tp.user_id;

-- 12. Create view for technician permissions lookup
CREATE OR REPLACE VIEW technician_permissions_view AS
SELECT 
  tp.role_id,
  r.name as role_name,
  ARRAY_AGG(tp.permission) as permissions
FROM technician_permissions tp
JOIN roles r ON tp.role_id = r.id
GROUP BY tp.role_id, r.name;

-- 13. Add comments
COMMENT ON TABLE technician_profiles IS 'Extended user information for technician-specific data (RFID, buildings, etc.)';
COMMENT ON TABLE technician_permissions IS 'Fine-grained permissions mapped to roles';
COMMENT ON TABLE inventory_restock_log IS 'Audit trail for all inventory restock operations';
COMMENT ON VIEW user_roles_view IS 'Combined view of users with their roles and permissions';
COMMENT ON VIEW technician_permissions_view IS 'Aggregated permissions for each role';

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Multi-user roles integrated with existing schema';
  RAISE NOTICE 'Tables created: technician_profiles, technician_permissions, inventory_restock_log';
  RAISE NOTICE 'Roles updated: % roles seeded', (SELECT COUNT(*) FROM roles WHERE is_technician_role = true);
END
$$;
