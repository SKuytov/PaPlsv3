-- =====================================================
-- MACHINE PARTS CATALOG SYSTEM
-- Updated to work with existing roles table
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.machine_hotspots CASCADE;
DROP TABLE IF EXISTS public.machine_parts_catalogs CASCADE;

-- =====================================================
-- TABLE: machine_parts_catalogs
-- Stores one catalog per machine with diagram
-- =====================================================
CREATE TABLE public.machine_parts_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL UNIQUE REFERENCES public.machines(id) ON DELETE CASCADE,
  diagram_url TEXT NOT NULL,
  diagram_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE: machine_hotspots
-- Stores clickable areas on diagrams linked to parts
-- =====================================================
CREATE TABLE public.machine_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.machine_parts_catalogs(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  position_data JSONB NOT NULL, -- {x, y, width, height}
  label TEXT DEFAULT 'Part',
  color TEXT DEFAULT 'rgba(59, 130, 246, 0.2)',
  border_color TEXT DEFAULT '#1e40af',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_machine_catalogs_machine_id ON public.machine_parts_catalogs(machine_id);
CREATE INDEX idx_machine_hotspots_catalog_id ON public.machine_hotspots(catalog_id);
CREATE INDEX idx_machine_hotspots_part_id ON public.machine_hotspots(part_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.machine_parts_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_hotspots ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: machine_parts_catalogs
-- =====================================================

-- All authenticated users can READ catalogs
CREATE POLICY "Anyone can view catalogs"
  ON public.machine_parts_catalogs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can INSERT catalogs
CREATE POLICY "Admins can create catalogs"
  ON public.machine_parts_catalogs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      JOIN public.roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name IN ('God Admin', 'Technical Director', 'Head Technician')
    )
  );

-- Only admins can UPDATE catalogs
CREATE POLICY "Admins can update catalogs"
  ON public.machine_parts_catalogs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      JOIN public.roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name IN ('God Admin', 'Technical Director', 'Head Technician')
    )
  );

-- Only admins can DELETE catalogs
CREATE POLICY "Admins can delete catalogs"
  ON public.machine_parts_catalogs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      JOIN public.roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name IN ('God Admin', 'Technical Director', 'Head Technician')
    )
  );

-- =====================================================
-- RLS POLICIES: machine_hotspots
-- =====================================================

-- All authenticated users can READ hotspots
CREATE POLICY "Anyone can view hotspots"
  ON public.machine_hotspots
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can INSERT hotspots
CREATE POLICY "Admins can create hotspots"
  ON public.machine_hotspots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      JOIN public.roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name IN ('God Admin', 'Technical Director', 'Head Technician')
    )
  );

-- Only admins can UPDATE hotspots
CREATE POLICY "Admins can update hotspots"
  ON public.machine_hotspots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      JOIN public.roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name IN ('God Admin', 'Technical Director', 'Head Technician')
    )
  );

-- Only admins can DELETE hotspots
CREATE POLICY "Admins can delete hotspots"
  ON public.machine_hotspots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      JOIN public.roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name IN ('God Admin', 'Technical Director', 'Head Technician')
    )
  );

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE public.machine_parts_catalogs IS 'Interactive catalogs for machine diagrams';
COMMENT ON TABLE public.machine_hotspots IS 'Clickable hotspots on machine diagrams linking to spare parts';
COMMENT ON COLUMN public.machine_hotspots.position_data IS 'JSON object: {x: number, y: number, width: number, height: number}';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Machine Parts Catalog schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create storage bucket: machine-diagrams (public)';
  RAISE NOTICE '2. Add storage RLS policies';
  RAISE NOTICE '3. Import MachineCatalogSidebar component';
END $$;
