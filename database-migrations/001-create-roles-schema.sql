-- Migration: Create technician roles and permissions schema
-- Purpose: Enable role-based access control for technicians
-- Date: 2026-01-04

-- 1. Create technician_roles table
CREATE TABLE IF NOT EXISTS technician_roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  can_restock BOOLEAN DEFAULT FALSE,
  can_edit_inventory BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_approve_inventory BOOLEAN DEFAULT FALSE,
  color VARCHAR(20) DEFAULT 'bg-slate-600',
  icon VARCHAR(50) DEFAULT 'Shield',
  priority INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT name_length CHECK (char_length(name) > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_technician_roles_name ON technician_roles(name);
CREATE INDEX IF NOT EXISTS idx_technician_roles_priority ON technician_roles(priority DESC);

-- 2. Create technician_permissions table
CREATE TABLE IF NOT EXISTS technician_permissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  role_id BIGINT NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES technician_roles(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_technician_permissions_role_id ON technician_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_technician_permissions_permission ON technician_permissions(permission);

-- 3. Create inventory_restock_log table
CREATE TABLE IF NOT EXISTS inventory_restock_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  technician_id BIGINT NOT NULL,
  spare_part_id BIGINT NOT NULL,
  quantity_added INT NOT NULL DEFAULT 0,
  reason VARCHAR(200),
  previous_quantity INT,
  new_quantity INT,
  building VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  FOREIGN KEY (spare_part_id) REFERENCES spare_parts(id) ON DELETE CASCADE,
  CONSTRAINT quantity_added_positive CHECK (quantity_added > 0)
);

CREATE INDEX IF NOT EXISTS idx_restock_log_technician ON inventory_restock_log(technician_id);
CREATE INDEX IF NOT EXISTS idx_restock_log_spare_part ON inventory_restock_log(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_restock_log_building ON inventory_restock_log(building);
CREATE INDEX IF NOT EXISTS idx_restock_log_created ON inventory_restock_log(created_at DESC);

-- 4. Add role-related columns to technicians table (if not already present)
ALTER TABLE IF EXISTS technicians 
ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES technician_roles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_building JSONB DEFAULT '[]';

-- Add indexes for technicians table
CREATE INDEX IF NOT EXISTS idx_technicians_role_id ON technicians(role_id);

-- 5. Enable Row Level Security (RLS) for audit tables
ALTER TABLE inventory_restock_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can view restock logs
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

-- 6. Create audit trigger for role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_restock_log (
    technician_id,
    spare_part_id,
    quantity_added,
    reason,
    building,
    notes
  ) VALUES (
    NEW.id,
    0,
    0,
    'Role assignment change',
    'System',
    'Old role: ' || (SELECT name FROM technician_roles WHERE id = OLD.role_id) || 
    ', New role: ' || (SELECT name FROM technician_roles WHERE id = NEW.role_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS technician_role_change_trigger ON technicians;
CREATE TRIGGER technician_role_change_trigger
AFTER UPDATE OF role_id ON technicians
FOR EACH ROW
EXECUTE FUNCTION log_role_change();

-- 7. Seed initial roles
INSERT INTO technician_roles (name, description, can_restock, can_edit_inventory, can_view_reports, can_approve_inventory, color, icon, priority)
VALUES
  ('Building 1 Technician', 'Technician assigned to Building 1', true, false, false, false, 'bg-blue-500', 'Wrench', 1),
  ('Building 2 Technician', 'Technician assigned to Building 2', true, false, false, false, 'bg-blue-600', 'Wrench', 1),
  ('Building 3/5 Technician', 'Technician assigned to Buildings 3 & 5', true, false, false, false, 'bg-blue-700', 'Wrench', 1),
  ('Building 4 Technician', 'Technician assigned to Building 4', true, false, false, false, 'bg-blue-800', 'Wrench', 1),
  ('Maintenance Organizer', 'Coordinates all maintenance operations', true, true, true, false, 'bg-purple-600', 'Briefcase', 2),
  ('Head Technician', 'Supervises technical team', true, true, true, true, 'bg-orange-500', 'Crown', 3),
  ('Technical Director', 'Oversees all technical operations', true, true, true, true, 'bg-red-600', 'Zap', 4),
  ('CEO', 'Executive leadership - read only access', false, false, true, false, 'bg-green-600', 'TrendingUp', 5),
  ('God Admin', 'System administrator with full access', true, true, true, true, 'bg-slate-800', 'Shield', 99)
ON CONFLICT (name) DO NOTHING;

-- 8. Seed permissions for all roles
-- All roles can view inventory
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_inventory' FROM technician_roles
ON CONFLICT DO NOTHING;

-- Building technicians: can restock
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'restock_inventory' FROM technician_roles WHERE name LIKE '%Building%Technician%'
ON CONFLICT DO NOTHING;

-- Maintenance Organizer and above: full access permissions
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'restock_inventory' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'edit_inventory' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'approve_restock' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'manage_users' FROM technician_roles WHERE name IN ('Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_audit_logs' FROM technician_roles WHERE name IN ('Head Technician', 'Technical Director', 'God Admin')
ON CONFLICT DO NOTHING;

-- View reports
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_reports' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'CEO', 'God Admin')
ON CONFLICT DO NOTHING;

-- CEO read-only
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_executive_dashboard' FROM technician_roles WHERE name = 'CEO'
ON CONFLICT DO NOTHING;

-- God Admin full system access
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'system_admin' FROM technician_roles WHERE name = 'God Admin'
ON CONFLICT DO NOTHING;

-- Commit message and verification
COMMENT ON TABLE technician_roles IS 'Defines available roles in the system with their capabilities';
COMMENT ON TABLE technician_permissions IS 'Maps permissions to roles for fine-grained access control';
COMMENT ON TABLE inventory_restock_log IS 'Audit log for all inventory restock operations';
