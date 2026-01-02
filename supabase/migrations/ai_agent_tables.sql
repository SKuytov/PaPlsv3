-- AI Maintenance Agent Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- Table: ai_diagnoses
-- Purpose: Store all AI diagnoses for learning and audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  error_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_response TEXT NOT NULL,
  user_context TEXT,
  status VARCHAR(50) DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified_correct', 'verified_incorrect')),
  feedback TEXT,
  actual_resolution TEXT,
  model_used VARCHAR(50) DEFAULT 'gpt-4',
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_machine_id ON ai_diagnoses(machine_id);
CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_created_at ON ai_diagnoses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_status ON ai_diagnoses(status);

-- Enable Row Level Security
ALTER TABLE ai_diagnoses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view diagnoses for their machines
CREATE POLICY ai_diagnoses_view_policy ON ai_diagnoses
  FOR SELECT
  USING (TRUE); -- Adjust based on your organization

-- RLS Policy: Only system can insert
CREATE POLICY ai_diagnoses_insert_policy ON ai_diagnoses
  FOR INSERT
  WITH CHECK (TRUE);

-- RLS Policy: Users can update their own diagnoses' feedback
CREATE POLICY ai_diagnoses_update_policy ON ai_diagnoses
  FOR UPDATE
  USING (created_by = auth.uid() OR created_by IS NULL)
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- ============================================================================
-- Table: repair_history
-- Purpose: Track actual repairs and their outcomes (linked to AI diagnoses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS repair_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  ai_diagnosis_id UUID REFERENCES ai_diagnoses(id) ON DELETE SET NULL,
  problem_description TEXT NOT NULL,
  symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
  resolution TEXT NOT NULL,
  parts_used UUID[] DEFAULT ARRAY[]::UUID[],
  parts_used_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  downtime_hours FLOAT,
  performed_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_repair_history_machine_id ON repair_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_repair_history_created_at ON repair_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_history_ai_diagnosis_id ON repair_history(ai_diagnosis_id);

-- Enable RLS
ALTER TABLE repair_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY repair_history_view_policy ON repair_history
  FOR SELECT
  USING (TRUE);

CREATE POLICY repair_history_insert_policy ON repair_history
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- Table: spare_parts_with_ai
-- Purpose: Spare parts catalog with AI metadata for recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS spare_parts_with_ai (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manufacturer VARCHAR(255),
  machine_ids UUID[] DEFAULT ARRAY[]::UUID[],
  failure_modes TEXT[] DEFAULT ARRAY[]::TEXT[],
  replacement_difficulty VARCHAR(50) CHECK (replacement_difficulty IN ('easy', 'moderate', 'complex')),
  estimated_replacement_time_minutes INTEGER,
  common_issues TEXT,
  current_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 5,
  unit_cost DECIMAL(10, 2),
  supplier VARCHAR(255),
  lead_time_days INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON spare_parts_with_ai(part_number);
CREATE INDEX IF NOT EXISTS idx_spare_parts_machine_ids ON spare_parts_with_ai USING GIN(machine_ids);

-- Enable RLS
ALTER TABLE spare_parts_with_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY spare_parts_view_policy ON spare_parts_with_ai
  FOR SELECT
  USING (TRUE);

-- ============================================================================
-- Table: ai_chat_sessions
-- Purpose: Store conversation history for context (optional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_machine_id ON ai_chat_sessions(machine_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);

-- Enable RLS
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_chat_sessions_view_policy ON ai_chat_sessions
  FOR SELECT
  USING (TRUE);

-- ============================================================================
-- View: ai_diagnosis_stats
-- Purpose: Quick statistics on AI diagnosis accuracy
-- ============================================================================
CREATE OR REPLACE VIEW ai_diagnosis_stats AS
SELECT
  COUNT(*) as total_diagnoses,
  SUM(CASE WHEN status = 'verified_correct' THEN 1 ELSE 0 END) as correct_diagnoses,
  SUM(CASE WHEN status = 'verified_incorrect' THEN 1 ELSE 0 END) as incorrect_diagnoses,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'verified_correct' THEN 1 ELSE 0 END) / 
    NULLIF(COUNT(*), 0)
  , 2) as accuracy_percentage,
  SUM(tokens_used) as total_tokens_used,
  DATE(MAX(created_at)) as last_diagnosis_date
FROM ai_diagnoses
WHERE status IS NOT NULL;

-- ============================================================================
-- View: top_failure_modes
-- Purpose: Identify most common failure modes for predictive maintenance
-- ============================================================================
CREATE OR REPLACE VIEW top_failure_modes AS
SELECT
  machine_id,
  unnest(failure_modes) as failure_mode,
  COUNT(*) as frequency
FROM spare_parts_with_ai
GROUP BY machine_id, failure_mode
ORDER BY frequency DESC;

-- ============================================================================
-- Function: get_machine_diagnostic_history
-- Purpose: Quick diagnostic history for a machine
-- ============================================================================
CREATE OR REPLACE FUNCTION get_machine_diagnostic_history(p_machine_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  diagnosis_id UUID,
  symptoms TEXT,
  status VARCHAR,
  created_at TIMESTAMP,
  accuracy_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.symptoms,
    ad.status,
    ad.created_at,
    ad.status IN ('verified_correct', 'verified_incorrect') as accuracy_verified
  FROM ai_diagnoses ad
  WHERE ad.machine_id = p_machine_id
  ORDER BY ad.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Function: update_modified_column
-- Purpose: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-update
CREATE TRIGGER update_ai_diagnoses_modified
BEFORE UPDATE ON ai_diagnoses
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_repair_history_modified
BEFORE UPDATE ON repair_history
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_spare_parts_with_ai_modified
BEFORE UPDATE ON spare_parts_with_ai
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- Insert sample spare parts (OPTIONAL - Remove if not needed)
-- ============================================================================
-- INSERT INTO spare_parts_with_ai (
--   part_number,
--   name,
--   description,
--   machine_ids,
--   failure_modes,
--   replacement_difficulty,
--   estimated_replacement_time_minutes,
--   common_issues,
--   current_stock,
--   unit_cost
-- ) VALUES
-- ('SP-MOTOR-001', 'Servo Motor', '3-Phase Servo Motor 5.5kW', ARRAY[]::UUID[], 
--  ARRAY['grinding noise', 'overheating', 'no response'], 'complex', 180, 
--  'Motor making noise or not responding to commands', 2, 850.00),
-- ('SP-BEARING-001', 'Spindle Bearing', 'Deep groove ball bearing', ARRAY[]::UUID[], 
--  ARRAY['noise', 'vibration', 'temperature'], 'moderate', 120, 
--  'Bearing wear causing noise and vibration', 5, 120.00),
-- ('SP-PUMP-001', 'Hydraulic Pump', 'Variable displacement pump', ARRAY[]::UUID[], 
--  ARRAY['leaking', 'low pressure', 'noise'], 'complex', 240, 
--  'Pump seal degradation or internal damage', 1, 2400.00);

print('AI Maintenance Agent tables created successfully!');
