-- ============================================================================
-- RFID TECHNICIAN USER SYSTEM - COMPLETE SQL SETUP (FIXED)
-- ============================================================================
-- Fixed to match actual roles table schema (no updated_at column)
-- Run this entire block in Supabase SQL Editor
-- ============================================================================

-- Ensure 'technician' role exists in roles table
-- NOTE: roles table doesn't have updated_at column
INSERT INTO public.roles (name, description, created_at)
VALUES ('technician', 'Maintenance technician - can scan items and view inventory', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TABLE: rfid_cards
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rfid_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Card metadata
  is_active BOOLEAN DEFAULT TRUE,
  card_holder_name VARCHAR(255),
  card_holder_department VARCHAR(100),
  
  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Notes for admin
  notes TEXT,
  
  CONSTRAINT rfid_cards_active_check CHECK (is_active = TRUE OR deactivated_at IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfid_cards_card_id ON public.rfid_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_user_id ON public.rfid_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_is_active ON public.rfid_cards(is_active);

-- Enable RLS
ALTER TABLE public.rfid_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow admins to view rfid_cards" ON public.rfid_cards FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow admins to insert rfid_cards" ON public.rfid_cards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLE: rfid_login_audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rfid_login_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Card and user info
  rfid_card_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event type
  event_type VARCHAR(50) DEFAULT 'login' CHECK (event_type IN ('login', 'logout', 'failed_attempt')),
  success BOOLEAN DEFAULT TRUE,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_user_id ON public.rfid_login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_card_id ON public.rfid_login_audit(rfid_card_id);
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_created_at ON public.rfid_login_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_event_type ON public.rfid_login_audit(event_type);

-- Enable RLS
ALTER TABLE public.rfid_login_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow admins to view rfid_login_audit" ON public.rfid_login_audit FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow backend to insert rfid_login_audit" ON public.rfid_login_audit FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- MODIFY: inventory_transactions
-- ============================================================================

ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS performed_by_role VARCHAR(50);

-- Drop existing constraint if it exists, then add new one
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS technician_usage_only_check;

ALTER TABLE public.inventory_transactions ADD CONSTRAINT technician_usage_only_check CHECK (
  (performed_by_role = 'technician' AND transaction_type = 'usage') OR
  performed_by_role != 'technician' OR
  performed_by_role IS NULL
);

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.technician_recent_activities AS
SELECT
  it.id,
  it.part_id,
  sp.name AS part_name,
  sp.part_number,
  it.quantity,
  it.transaction_type,
  it.notes,
  it.performed_by,
  u.full_name AS technician_name,
  it.machine_id,
  m.name AS machine_name,
  it.created_at
FROM public.inventory_transactions it
JOIN public.users u ON it.performed_by = u.id
JOIN public.spare_parts sp ON it.part_id = sp.id
LEFT JOIN public.machines m ON it.machine_id = m.id
WHERE it.performed_by_role = 'technician'
ORDER BY it.created_at DESC;

CREATE OR REPLACE VIEW public.active_rfid_cards_view AS
SELECT
  rc.id,
  rc.card_id,
  rc.user_id,
  u.full_name,
  u.email,
  r.name AS role,
  rc.card_holder_department,
  rc.assigned_at,
  rc.notes
FROM public.rfid_cards rc
JOIN public.users u ON rc.user_id = u.id
JOIN public.roles r ON u.role_id = r.id
WHERE rc.is_active = TRUE
AND r.name = 'technician'
ORDER BY u.full_name;

CREATE OR REPLACE VIEW public.rfid_login_statistics AS
SELECT
  user_id,
  (SELECT full_name FROM public.users WHERE id = rfid_login_audit.user_id) AS technician_name,
  COUNT(*) FILTER (WHERE event_type = 'login' AND success = TRUE) AS successful_logins,
  COUNT(*) FILTER (WHERE event_type = 'logout' AND success = TRUE) AS logouts,
  COUNT(*) FILTER (WHERE success = FALSE) AS failed_attempts,
  MAX(created_at) AS last_login
FROM public.rfid_login_audit
GROUP BY user_id
ORDER BY last_login DESC;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.technician_recent_activities TO authenticated;
GRANT SELECT ON public.active_rfid_cards_view TO authenticated;
GRANT SELECT ON public.rfid_login_statistics TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run these to confirm everything works)
-- ============================================================================

-- Should return 2 rows (rfid_cards, rfid_login_audit)
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('rfid_cards', 'rfid_login_audit')
-- ORDER BY table_name;

-- Should return 1 row with technician role
-- SELECT * FROM public.roles WHERE name = 'technician';
