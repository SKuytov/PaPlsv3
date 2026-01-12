-- ============================================================
-- BLADE LIFECYCLE TRACKING SYSTEM
-- Complete cleanup + fresh creation
-- Safe to run multiple times
-- ============================================================

-- ============================================================
-- CLEANUP: Drop everything blade-related
-- ============================================================

DROP TRIGGER IF EXISTS update_blade_types_timestamp_trigger ON blade_types CASCADE;
DROP TRIGGER IF EXISTS update_blade_timestamp_trigger ON blades CASCADE;
DROP FUNCTION IF EXISTS update_blade_types_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_blade_timestamp() CASCADE;
DROP TABLE IF EXISTS blade_alerts CASCADE;
DROP TABLE IF EXISTS blade_sharpening CASCADE;
DROP TABLE IF EXISTS blade_usage_logs CASCADE;
DROP TABLE IF EXISTS blades CASCADE;
DROP TABLE IF EXISTS blade_types CASCADE;

-- ============================================================
-- CREATE: Blade Types Table
-- ============================================================

CREATE TABLE blade_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_type VARCHAR(100) NOT NULL,
  blade_type_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blade_types_machine_type ON blade_types(machine_type);
CREATE INDEX idx_blade_types_blade_type_code ON blade_types(blade_type_code);

-- ============================================================
-- CREATE: Blades Table
-- ============================================================

CREATE TABLE blades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blade_type_id UUID NOT NULL REFERENCES blade_types(id) ON DELETE CASCADE,
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  purchase_date DATE,
  usage_hours DECIMAL(10,2) DEFAULT 0,
  sharpening_count INT DEFAULT 0,
  last_sharpened_date DATE,
  retired_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blades_blade_type_id ON blades(blade_type_id);
CREATE INDEX idx_blades_serial_number ON blades(serial_number);
CREATE INDEX idx_blades_status ON blades(status);

-- ============================================================
-- CREATE: Blade Usage Logs Table
-- ============================================================

CREATE TABLE blade_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blade_id UUID NOT NULL REFERENCES blades(id) ON DELETE CASCADE,
  operation VARCHAR(50),
  hours_used DECIMAL(10,2),
  notes TEXT,
  logged_by_user_id UUID,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blade_usage_logs_blade_id ON blade_usage_logs(blade_id);
CREATE INDEX idx_blade_usage_logs_logged_at ON blade_usage_logs(logged_at);

-- ============================================================
-- CREATE: Blade Sharpening Table
-- ============================================================

CREATE TABLE blade_sharpening (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blade_id UUID NOT NULL REFERENCES blades(id) ON DELETE CASCADE,
  sharpening_date DATE NOT NULL,
  sharpening_method VARCHAR(100),
  cost DECIMAL(10,2),
  provider VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blade_sharpening_blade_id ON blade_sharpening(blade_id);
CREATE INDEX idx_blade_sharpening_date ON blade_sharpening(sharpening_date);

-- ============================================================
-- CREATE: Blade Alerts Table
-- ============================================================

CREATE TABLE blade_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blade_id UUID NOT NULL REFERENCES blades(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  alert_message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blade_alerts_blade_id ON blade_alerts(blade_id);
CREATE INDEX idx_blade_alerts_resolved ON blade_alerts(is_resolved);

-- ============================================================
-- CREATE: Timestamp Update Functions
-- ============================================================

CREATE FUNCTION update_blade_types_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION update_blade_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATE: Triggers
-- ============================================================

CREATE TRIGGER update_blade_types_timestamp_trigger
BEFORE UPDATE ON blade_types
FOR EACH ROW
EXECUTE FUNCTION update_blade_types_timestamp();

CREATE TRIGGER update_blade_timestamp_trigger
BEFORE UPDATE ON blades
FOR EACH ROW
EXECUTE FUNCTION update_blade_timestamp();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run these queries to verify everything was created correctly:
--
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema='public' AND table_name LIKE 'blade%'
-- ORDER BY table_name;
--
-- Should show:
-- blade_alerts
-- blade_sharpening
-- blade_types
-- blade_usage_logs
-- blades
--
-- ============================================================
