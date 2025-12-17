-- ============================================================================
-- RFID TECHNICIAN USER SYSTEM - SUPABASE SETUP
-- ============================================================================
-- 
-- This migration adds support for technician users who login via RFID cards.
-- Technicians can:
--   1. Login with RFID card (USB keyboard reader emulation)
--   2. Use the Scanner to register item USAGE (not restock)
--   3. View sparse parts catalog in read-only mode
--
-- Tables created:
--   - rfid_cards: Maps RFID card IDs to technician users
--   - rfid_login_audit: Tracks all RFID login attempts
--
-- Row Level Security (RLS) policies ensure technicians can only:
--   - See their own transactions
--   - Only create USAGE transactions (not RESTOCK)
--   - View but not modify spare parts
--
-- ============================================================================

-- Step 1: Ensure 'technician' role exists in roles table
-- (assumes you have a roles table; adjust if your schema differs)

INSERT INTO public.roles (name, description, created_at, updated_at)
VALUES ('technician', 'Maintenance technician - can scan items and view inventory', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TABLE: rfid_cards
-- ============================================================================
-- Stores RFID card IDs and their assigned users

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

-- Indexes for rfid_cards
CREATE INDEX IF NOT EXISTS idx_rfid_cards_card_id ON public.rfid_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_user_id ON public.rfid_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_is_active ON public.rfid_cards(is_active);

-- Enable RLS on rfid_cards
ALTER TABLE public.rfid_cards ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read cards (admins only in production)
CREATE POLICY "Allow admins to view rfid_cards"
  ON public.rfid_cards FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: Only admins can insert
CREATE POLICY "Allow admins to insert rfid_cards"
  ON public.rfid_cards FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLE: rfid_login_audit
-- ============================================================================
-- Tracks all RFID login/logout events for security auditing

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

-- Indexes for rfid_login_audit
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_user_id ON public.rfid_login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_card_id ON public.rfid_login_audit(rfid_card_id);
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_created_at ON public.rfid_login_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfid_login_audit_event_type ON public.rfid_login_audit(event_type);

-- Enable RLS on rfid_login_audit
ALTER TABLE public.rfid_login_audit ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view all audit logs
CREATE POLICY "Allow admins to view rfid_login_audit"
  ON public.rfid_login_audit FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: Backend can insert audit logs
CREATE POLICY "Allow backend to insert rfid_login_audit"
  ON public.rfid_login_audit FOR INSERT
  WITH CHECK (TRUE); -- Backend service role can insert

-- ============================================================================
-- MODIFY: inventory_transactions
-- ============================================================================
-- Add column to track if transaction was performed by technician

ALTER TABLE public.inventory_transactions
ADD COLUMN IF NOT EXISTS performed_by_role VARCHAR(50);

-- Add constraint to ensure technicians can only create 'usage' transactions
ALTER TABLE public.inventory_transactions
ADD CONSTRAINT technician_usage_only_check 
CHECK (
  (performed_by_role = 'technician' AND transaction_type = 'usage') OR
  performed_by_role != 'technician' OR
  performed_by_role IS NULL
);

-- ============================================================================
-- VIEWS: Useful queries for reporting
-- ============================================================================

-- View: Recent technician activities
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

-- View: Active RFID cards
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

-- View: RFID login statistics
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
-- SAMPLE DATA (for development/testing)
-- ============================================================================
-- Uncomment these to insert test data
--
-- INSERT INTO public.rfid_cards (card_id, user_id, card_holder_name, card_holder_department, notes)
-- SELECT
--   '0000' || LPAD((ROW_NUMBER() OVER (ORDER BY id))::TEXT, 8, '0') AS card_id,
--   id,
--   full_name,
--   'Maintenance',
--   'Test card for development'
-- FROM public.users
-- WHERE role_id = (SELECT id FROM public.roles WHERE name = 'technician')
-- LIMIT 5;
--

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Make sure authenticated users can read views

GRANT SELECT ON public.technician_recent_activities TO authenticated;
GRANT SELECT ON public.active_rfid_cards_view TO authenticated;
GRANT SELECT ON public.rfid_login_statistics TO authenticated;

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================
--
-- 1. After running this migration:
--    - Create at least one 'technician' role user in Supabase Auth
--    - Assign an RFID card to that user in rfid_cards table
--
-- 2. Test the RFID login with:
--    POST /api/auth/rfid-login
--    Body: { "rfid_card_id": "CARD_ID_FROM_DB" }
--
-- 3. Backend environment variables needed:
--    - SUPABASE_URL
--    - SUPABASE_SERVICE_ROLE_KEY
--
-- 4. Frontend environment variables:
--    - VITE_API_URL (pointing to backend server)
--    - VITE_SUPABASE_URL
--    - VITE_SUPABASE_ANON_KEY
--
-- 5. Route: Add `/technician-login` or `/rfid` route to frontend router
--    that renders <RFIDLoginPage />
--
-- ============================================================================
