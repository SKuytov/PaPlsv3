-- =====================================================
-- MACHINE PARTS CATALOG SYSTEM
-- Interactive diagrams with clickable hotspots
-- =====================================================

-- Table: machine_parts_catalogs
-- Stores assembly diagrams and catalog metadata for each machine
CREATE TABLE IF NOT EXISTS public.machine_parts_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  diagram_url TEXT NOT NULL,
  diagram_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(machine_id)
);

-- Table: machine_hotspots
-- Stores clickable areas on diagrams linked to spare parts
CREATE TABLE IF NOT EXISTS public.machine_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.machine_parts_catalogs(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  position_data JSONB NOT NULL, -- {x, y, width, height} coordinates
  label TEXT DEFAULT 'Part',
  color TEXT DEFAULT 'rgba(59, 130, 246, 0.2)',
  border_color TEXT DEFAULT '#1e40af',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_machine_hotspots_catalog_id ON public.machine_hotspots(catalog_id);
CREATE INDEX IF NOT EXISTS idx_machine_hotspots_part_id ON public.machine_hotspots(part_id);
CREATE INDEX IF NOT EXISTS idx_machine_parts_catalogs_machine_id ON public.machine_parts_catalogs(machine_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.machine_parts_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_hotspots ENABLE ROW LEVEL SECURITY;

-- Policies for machine_parts_catalogs
CREATE POLICY "machine_catalogs_authenticated_read" ON public.machine_parts_catalogs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "machine_catalogs_authenticated_insert" ON public.machine_parts_catalogs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "machine_catalogs_authenticated_update" ON public.machine_parts_catalogs
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "machine_catalogs_authenticated_delete" ON public.machine_parts_catalogs
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Policies for machine_hotspots
CREATE POLICY "machine_hotspots_authenticated_read" ON public.machine_hotspots
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "machine_hotspots_authenticated_insert" ON public.machine_hotspots
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "machine_hotspots_authenticated_update" ON public.machine_hotspots
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "machine_hotspots_authenticated_delete" ON public.machine_hotspots
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- STORAGE BUCKET FOR MACHINE DIAGRAMS
-- =====================================================
-- Note: Run this in Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('machine-diagrams', 'machine-diagrams', true);
-- 
-- Then set policy:
-- CREATE POLICY "Authenticated users can upload diagrams"
--   ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'machine-diagrams'
--     AND auth.role() = 'authenticated'
--   );

-- =====================================================
-- EXAMPLE DATA
-- =====================================================
-- Uncomment to add sample data:

-- -- Sample machine parts catalog
-- INSERT INTO public.machine_parts_catalogs (machine_id, diagram_url, diagram_name, is_active)
-- VALUES (
--   (SELECT id FROM public.machines LIMIT 1),
--   'https://example.com/machine-diagram.jpg',
--   'Hydraulic Pump Assembly',
--   true
-- );

-- -- Sample hotspot
-- INSERT INTO public.machine_hotspots (
--   catalog_id,
--   part_id,
--   position_data,
--   label,
--   color
-- )
-- VALUES (
--   (SELECT id FROM public.machine_parts_catalogs LIMIT 1),
--   (SELECT id FROM public.spare_parts LIMIT 1),
--   '{"x": 100, "y": 50, "width": 80, "height": 60}',
--   'Main Seal',
--   'rgba(59, 130, 246, 0.2)'
-- );
