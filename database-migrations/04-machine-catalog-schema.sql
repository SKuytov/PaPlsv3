-- =====================================================
-- MACHINE PARTS CATALOG SYSTEM
-- Interactive diagrams with clickable hotspots
-- Aligned with existing machines & spare_parts schema
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.machine_hotspots CASCADE;
DROP TABLE IF EXISTS public.machine_parts_catalogs CASCADE;

-- =====================================================
-- TABLE 1: machine_parts_catalogs
-- One catalog per machine (stores the diagram image)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.machine_parts_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL UNIQUE REFERENCES public.machines(id) ON DELETE CASCADE,
  diagram_url TEXT NOT NULL,
  diagram_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE 2: machine_hotspots
-- Many hotspots per catalog (clickable areas on diagram)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.machine_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.machine_parts_catalogs(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  position_data JSONB NOT NULL, -- {x, y, width, height} in image coordinates
  label TEXT DEFAULT 'Part',
  color TEXT DEFAULT 'rgba(59, 130, 246, 0.2)', -- Default brand color
  border_color TEXT DEFAULT '#1e40af',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_machine_catalogs_machine_id 
  ON public.machine_parts_catalogs(machine_id);

CREATE INDEX IF NOT EXISTS idx_machine_hotspots_catalog_id 
  ON public.machine_hotspots(catalog_id);

CREATE INDEX IF NOT EXISTS idx_machine_hotspots_part_id 
  ON public.machine_hotspots(part_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE public.machine_parts_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_hotspots ENABLE ROW LEVEL SECURITY;

-- === MACHINE_PARTS_CATALOGS POLICIES ===

-- All authenticated users can VIEW catalogs (read-only)
CREATE POLICY "catalogs_authenticated_read" ON public.machine_parts_catalogs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only ADMINS can INSERT catalogs
-- Admins: role = 'God Admin' OR role = 'Admin' OR role = 'Technical Director'
CREATE POLICY "catalogs_admin_insert" ON public.machine_parts_catalogs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND role IN ('God Admin', 'Admin', 'Technical Director')
    )
  );

-- Only ADMINS can UPDATE catalogs
CREATE POLICY "catalogs_admin_update" ON public.machine_parts_catalogs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND role IN ('God Admin', 'Admin', 'Technical Director')
    )
  );

-- Only ADMINS can DELETE catalogs
CREATE POLICY "catalogs_admin_delete" ON public.machine_parts_catalogs
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND role IN ('God Admin', 'Admin', 'Technical Director')
    )
  );

-- === MACHINE_HOTSPOTS POLICIES ===

-- All authenticated users can VIEW hotspots (read-only)
CREATE POLICY "hotspots_authenticated_read" ON public.machine_hotspots
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only ADMINS can INSERT hotspots
CREATE POLICY "hotspots_admin_insert" ON public.machine_hotspots
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND role IN ('God Admin', 'Admin', 'Technical Director')
    )
  );

-- Only ADMINS can UPDATE hotspots
CREATE POLICY "hotspots_admin_update" ON public.machine_hotspots
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND role IN ('God Admin', 'Admin', 'Technical Director')
    )
  );

-- Only ADMINS can DELETE hotspots
CREATE POLICY "hotspots_admin_delete" ON public.machine_hotspots
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND role IN ('God Admin', 'Admin', 'Technical Director')
    )
  );

-- =====================================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- =====================================================
-- Execute in Supabase SQL Editor:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('machine-diagrams', 'machine-diagrams', true);
--
-- Then set storage policies in Dashboard → Storage → machine-diagrams:
-- CREATE POLICY "Public access"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'machine-diagrams');
--
-- CREATE POLICY "Authenticated users can upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'machine-diagrams'
--     AND auth.role() = 'authenticated'
--     AND EXISTS (
--       SELECT 1 FROM public.users
--       WHERE users.id = auth.uid()
--       AND role IN ('God Admin', 'Admin', 'Technical Director')
--     )
--   );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.machine_parts_catalogs IS 'Stores machine assembly diagrams with one catalog per machine';
COMMENT ON TABLE public.machine_hotspots IS 'Stores clickable hotspots on diagrams linked to spare parts';
COMMENT ON COLUMN public.machine_hotspots.position_data IS 'JSON object with keys: x, y, width, height (in image coordinates)';
COMMENT ON COLUMN public.machine_hotspots.color IS 'RGBA color for hotspot background, default is brand primary color';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify setup:
-- SELECT 
--   t.tablename,
--   (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=t.tablename) as policy_count
-- FROM pg_tables t
-- WHERE t.tablename IN ('machine_parts_catalogs', 'machine_hotspots');
