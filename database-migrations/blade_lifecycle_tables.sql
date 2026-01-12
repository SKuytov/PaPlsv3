-- ============================================================================
-- BLADE LIFECYCLE TRACKING TABLES
-- Database schema for tracking blade inventory, events, and machine assignments
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: blade_types
-- Purpose: Store blade type definitions and classifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blade_types (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  machine_type TEXT NOT NULL,
  description TEXT,
  total_quantity INTEGER DEFAULT 0,
  next_serial_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on code for faster lookups
CREATE INDEX idx_blade_types_code ON public.blade_types(code);

-- Add comments
COMMENT ON TABLE public.blade_types IS 'Blade type definitions (e.g., Circular Saw Type 1)';
COMMENT ON COLUMN public.blade_types.code IS 'Unique blade type code (e.g., BT-001)';
COMMENT ON COLUMN public.blade_types.machine_type IS 'Type of machine this blade belongs to';
COMMENT ON COLUMN public.blade_types.next_serial_number IS 'Next serial number to assign';

-- ============================================================================
-- Table: blades
-- Purpose: Store individual blade information
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blades (
  id BIGSERIAL PRIMARY KEY,
  type_id BIGINT NOT NULL REFERENCES public.blade_types(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'inactive', 'sharpening', 'retired')),
  purchase_date DATE,
  default_machine TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX idx_blades_type_id ON public.blades(type_id);
CREATE INDEX idx_blades_serial_number ON public.blades(serial_number);
CREATE INDEX idx_blades_status ON public.blades(status);
CREATE INDEX idx_blades_serial_search ON public.blades USING GIN(to_tsvector('english', serial_number));

-- Add comments
COMMENT ON TABLE public.blades IS 'Individual blade inventory with tracking';
COMMENT ON COLUMN public.blades.type_id IS 'Reference to blade_types table';
COMMENT ON COLUMN public.blades.serial_number IS 'Unique serial number for the blade';
COMMENT ON COLUMN public.blades.status IS 'Current status: new, active, inactive, sharpening, retired';
COMMENT ON COLUMN public.blades.default_machine IS 'Default machine this blade is assigned to';

-- ============================================================================
-- Table: blade_events
-- Purpose: Audit trail of all blade-related events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blade_events (
  id BIGSERIAL PRIMARY KEY,
  blade_id BIGINT NOT NULL REFERENCES public.blades(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('mounted', 'removed', 'sharpened', 'inspected', 'maintenance')),
  event_date DATE NOT NULL,
  machine TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX idx_blade_events_blade_id ON public.blade_events(blade_id);
CREATE INDEX idx_blade_events_event_type ON public.blade_events(event_type);
CREATE INDEX idx_blade_events_event_date ON public.blade_events(event_date);

-- Add comments
COMMENT ON TABLE public.blade_events IS 'Audit trail for blade lifecycle events';
COMMENT ON COLUMN public.blade_events.blade_id IS 'Reference to blades table';
COMMENT ON COLUMN public.blade_events.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN public.blade_events.event_date IS 'Date when the event occurred';
COMMENT ON COLUMN public.blade_events.machine IS 'Machine associated with the event';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.blade_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blade_events ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all authenticated users to read/write)
CREATE POLICY "Enable read access for all authenticated users" ON public.blade_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON public.blades
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON public.blade_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for all authenticated users" ON public.blade_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for all authenticated users" ON public.blades
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for all authenticated users" ON public.blade_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for all authenticated users" ON public.blade_types
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for all authenticated users" ON public.blades
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for all authenticated users" ON public.blade_types
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for all authenticated users" ON public.blades
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for all authenticated users" ON public.blade_events
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blade_types_update_timestamp
BEFORE UPDATE ON public.blade_types
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER blades_update_timestamp
BEFORE UPDATE ON public.blades
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();
