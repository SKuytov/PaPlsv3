-- ============================================================
-- MIGRATION 003: Role-Based Access Control
-- Purpose: User roles, permissions, and dashboard access
-- Status: Production Ready
-- ============================================================

-- Drop existing if rerunning
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP VIEW IF EXISTS user_permissions_view;

-- ============================================================
-- TABLE: user_roles
-- Purpose: Map users to roles
-- ============================================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    -- Roles: technician, building_tech, maintenance_org, tech_director, accountant, god_admin
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(user_id, role_name);
CREATE INDEX idx_user_roles_status ON user_roles(status);
CREATE INDEX idx_user_roles_role_name ON user_roles(role_name);

-- ============================================================
-- TABLE: role_permissions
-- Purpose: Define what each role can do
-- ============================================================
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(100) NOT NULL,
    permission VARCHAR(255) NOT NULL,
    -- Permissions: view_dashboard, create_request, approve_l1, approve_l2, etc.
    resource VARCHAR(100), -- requests, quotes, orders, invoices, payments
    action VARCHAR(50), -- create, read, update, delete, approve
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_role_permissions_unique ON role_permissions(role_name, permission);
CREATE INDEX idx_role_permissions_resource_action ON role_permissions(resource, action);

-- ============================================================
-- INSERT DEFAULT ROLES & PERMISSIONS
-- ============================================================

-- TECHNICIAN Role
DELETE FROM role_permissions WHERE role_name = 'technician';
INSERT INTO role_permissions (role_name, permission, resource, action) VALUES
    ('technician', 'view_requests', 'requests', 'read'),
    ('technician', 'create_request', 'requests', 'create'),
    ('technician', 'edit_draft_request', 'requests', 'update'),
    ('technician', 'submit_request', 'requests', 'update'),
    ('technician', 'view_own_dashboard', 'dashboard', 'read'),
    ('technician', 'view_activity_log', 'activity', 'read');

-- BUILDING TECHNICIAN Role
DELETE FROM role_permissions WHERE role_name = 'building_tech';
INSERT INTO role_permissions (role_name, permission, resource, action) VALUES
    ('building_tech', 'view_requests', 'requests', 'read'),
    ('building_tech', 'create_request', 'requests', 'create'),
    ('building_tech', 'approve_level_1', 'requests', 'update'),
    ('building_tech', 'reject_request', 'requests', 'update'),
    ('building_tech', 'view_pending_approvals', 'dashboard', 'read'),
    ('building_tech', 'view_dashboard', 'dashboard', 'read'),
    ('building_tech', 'view_activity_log', 'activity', 'read');

-- MAINTENANCE ORGANIZER Role
DELETE FROM role_permissions WHERE role_name = 'maintenance_org';
INSERT INTO role_permissions (role_name, permission, resource, action) VALUES
    ('maintenance_org', 'view_requests', 'requests', 'read'),
    ('maintenance_org', 'create_request', 'requests', 'create'),
    ('maintenance_org', 'approve_level_2', 'requests', 'update'),
    ('maintenance_org', 'reject_request', 'requests', 'update'),
    ('maintenance_org', 'manage_quotes', 'quotes', 'create'),
    ('maintenance_org', 'select_quote', 'quotes', 'update'),
    ('maintenance_org', 'create_order', 'orders', 'create'),
    ('maintenance_org', 'track_order', 'orders', 'read'),
    ('maintenance_org', 'verify_invoice', 'invoices', 'update'),
    ('maintenance_org', 'view_dashboard', 'dashboard', 'read'),
    ('maintenance_org', 'view_quotes_tab', 'dashboard', 'read'),
    ('maintenance_org', 'view_orders_tab', 'dashboard', 'read'),
    ('maintenance_org', 'view_received_tab', 'dashboard', 'read'),
    ('maintenance_org', 'view_activity_log', 'activity', 'read');

-- TECH DIRECTOR Role
DELETE FROM role_permissions WHERE role_name = 'tech_director';
INSERT INTO role_permissions (role_name, permission, resource, action) VALUES
    ('tech_director', 'view_requests', 'requests', 'read'),
    ('tech_director', 'approve_level_3', 'requests', 'update'),
    ('tech_director', 'reject_request', 'requests', 'update'),
    ('tech_director', 'view_all_requests', 'requests', 'read'),
    ('tech_director', 'view_dashboard', 'dashboard', 'read'),
    ('tech_director', 'view_activity_log', 'activity', 'read'),
    ('tech_director', 'view_analytics', 'analytics', 'read');

-- ACCOUNTANT Role
DELETE FROM role_permissions WHERE role_name = 'accountant';
INSERT INTO role_permissions (role_name, permission, resource, action) VALUES
    ('accountant', 'view_requests', 'requests', 'read'),
    ('accountant', 'view_invoices', 'invoices', 'read'),
    ('accountant', 'process_payment', 'payments', 'create'),
    ('accountant', 'update_payment', 'payments', 'update'),
    ('accountant', 'view_payment_history', 'payments', 'read'),
    ('accountant', 'view_dashboard', 'dashboard', 'read'),
    ('accountant', 'view_accounting_tab', 'dashboard', 'read'),
    ('accountant', 'view_activity_log', 'activity', 'read'),
    ('accountant', 'export_reports', 'reports', 'read');

-- GOD ADMIN Role
DELETE FROM role_permissions WHERE role_name = 'god_admin';
INSERT INTO role_permissions (role_name, permission, resource, action) VALUES
    ('god_admin', 'view_requests', 'requests', 'read'),
    ('god_admin', 'create_request', 'requests', 'create'),
    ('god_admin', 'edit_request', 'requests', 'update'),
    ('god_admin', 'delete_request', 'requests', 'delete'),
    ('god_admin', 'approve_level_1', 'requests', 'update'),
    ('god_admin', 'approve_level_2', 'requests', 'update'),
    ('god_admin', 'approve_level_3', 'requests', 'update'),
    ('god_admin', 'execute_level_4', 'requests', 'update'),
    ('god_admin', 'manage_quotes', 'quotes', 'create'),
    ('god_admin', 'manage_orders', 'orders', 'create'),
    ('god_admin', 'manage_invoices', 'invoices', 'update'),
    ('god_admin', 'process_payment', 'payments', 'create'),
    ('god_admin', 'view_all_dashboards', 'dashboard', 'read'),
    ('god_admin', 'manage_users', 'users', 'update'),
    ('god_admin', 'manage_roles', 'roles', 'update'),
    ('god_admin', 'view_audit_log', 'activity', 'read'),
    ('god_admin', 'execute_request', 'requests', 'update');

-- ============================================================
-- TABLE: user_dashboard_access
-- Purpose: Track which dashboard users can access
-- ============================================================
CREATE TABLE user_dashboard_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_type VARCHAR(100) NOT NULL,
    -- technician_dashboard, building_tech_dashboard, maintenance_dashboard, 
    -- tech_director_dashboard, accountant_dashboard, admin_dashboard
    can_access BOOLEAN DEFAULT TRUE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_dashboard_access ON user_dashboard_access(user_id, dashboard_type);

-- ============================================================
-- CREATE VIEW FOR USER PERMISSIONS
-- ============================================================
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    ur.user_id,
    ur.role_name,
    rp.permission,
    rp.resource,
    rp.action,
    ur.status
FROM user_roles ur
JOIN role_permissions rp ON ur.role_name = rp.role_name
WHERE ur.status = 'ACTIVE';

-- ============================================================
-- CREATE VIEW FOR USER DASHBOARDS
-- ============================================================
CREATE OR REPLACE VIEW user_accessible_dashboards AS
SELECT DISTINCT
    ur.user_id,
    ur.role_name,
    CASE 
        WHEN ur.role_name = 'technician' THEN 'technician_dashboard'
        WHEN ur.role_name = 'building_tech' THEN 'building_tech_dashboard'
        WHEN ur.role_name = 'maintenance_org' THEN 'maintenance_dashboard'
        WHEN ur.role_name = 'tech_director' THEN 'tech_director_dashboard'
        WHEN ur.role_name = 'accountant' THEN 'accountant_dashboard'
        WHEN ur.role_name = 'god_admin' THEN 'admin_dashboard'
    END as dashboard_type
FROM user_roles ur
WHERE ur.status = 'ACTIVE';

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'god_admin');

CREATE POLICY "Admin can manage roles" ON user_roles
    FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

CREATE POLICY "Everyone can view permissions" ON role_permissions
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage permissions" ON role_permissions
    FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

CREATE POLICY "Users can view own dashboard access" ON user_dashboard_access
    FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'god_admin');

CREATE POLICY "Admin can manage dashboard access" ON user_dashboard_access
    FOR ALL USING (auth.jwt() ->> 'role' = 'god_admin');

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
SELECT 'Migration 003 completed successfully!' as status;