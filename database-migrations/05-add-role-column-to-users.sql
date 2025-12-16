-- =====================================================
-- ADD ROLE COLUMN TO USERS TABLE
-- For use with RLS policies in machine catalog
-- =====================================================

-- Add role column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Operator';

-- Add check constraint for valid roles
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('God Admin', 'Admin', 'Technical Director', 'Manager', 'Operator', 'Viewer'));

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Optional: Set current users to appropriate roles
-- Uncomment and modify as needed:
-- UPDATE public.users SET role = 'Admin' WHERE email = 'admin@example.com';
-- UPDATE public.users SET role = 'Operator' WHERE email LIKE '%@example.com';

COMMENT ON COLUMN public.users.role IS 'User role for access control. Valid values: God Admin, Admin, Technical Director, Manager, Operator, Viewer';
