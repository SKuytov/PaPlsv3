-- ============================================
-- FIXED DATABASE MIGRATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor
-- Fixed table creation order to avoid constraint errors

-- ============================================
-- STEP 1: Create machine_assemblies table FIRST
-- ============================================
CREATE TABLE IF NOT EXISTS machine_assemblies (
  id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machine_assemblies_machine_id ON machine_assemblies(machine_id);

-- ============================================
-- STEP 2: Create machine_sub_assemblies table SECOND
-- ============================================
CREATE TABLE IF NOT EXISTS machine_sub_assemblies (
  id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
  assembly_id BIGINT REFERENCES machine_assemblies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_assemblies_assembly_id ON machine_sub_assemblies(assembly_id);

-- ============================================
-- STEP 3: Create assembly_parts table THIRD
-- ============================================
-- THIS MUST BE LAST because it references the tables above
CREATE TABLE IF NOT EXISTS assembly_parts (
  id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
  assembly_id BIGINT NOT NULL REFERENCES machine_assemblies(id) ON DELETE CASCADE,
  sub_assembly_id BIGINT REFERENCES machine_sub_assemblies(id) ON DELETE SET NULL,
  part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assembly_parts_assembly_id ON assembly_parts(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_sub_assembly_id ON assembly_parts(sub_assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_parts_part_id ON assembly_parts(part_id);

-- ============================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE machine_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_sub_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_parts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================
-- Allow all operations for now (you can restrict later)
CREATE POLICY "machine_assemblies_allow_all" ON machine_assemblies FOR ALL USING (true);
CREATE POLICY "machine_sub_assemblies_allow_all" ON machine_sub_assemblies FOR ALL USING (true);
CREATE POLICY "assembly_parts_allow_all" ON assembly_parts FOR ALL USING (true);

-- ============================================
-- DONE! All tables created successfully
-- ============================================
-- Tables created:
-- ✅ machine_assemblies
-- ✅ machine_sub_assemblies
-- ✅ assembly_parts
--
-- Next steps:
-- 1. Verify tables exist in Supabase
-- 2. Run SAMPLE DATA INSERTION script
-- 3. Deploy app code
-- 4. Test in your application
-- ============================================