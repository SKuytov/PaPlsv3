-- ============================================================================
-- ITEM REQUEST FEATURE - DATABASE MIGRATION
-- ============================================================================
-- This migration creates the complete item request workflow system with
-- 4-level approval process and full audit trail tracking.
-- ============================================================================

-- ============================================================================
-- TABLE: item_requests
-- Main table for all item requests submitted by technicians
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitter_email VARCHAR(255) NOT NULL,
  building_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'SUBMITTED', 'BUILDING_APPROVED', 'MAINTENANCE_APPROVED', 
               'DIRECTOR_APPROVED', 'EXECUTED', 'REJECTED')
  ),
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (
    priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')
  ),
  description TEXT,
  notes TEXT,
  estimated_budget DECIMAL(12, 2) DEFAULT 0.00,
  actual_cost DECIMAL(12, 2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- TABLE: request_items
-- Line items within each request
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  estimated_unit_price DECIMAL(10, 2) NOT NULL,
  actual_unit_price DECIMAL(10, 2) DEFAULT NULL,
  specs JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- TABLE: request_approvals
-- Tracking approvals at each level (Level 1-4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
  approval_level INT NOT NULL CHECK (approval_level IN (1, 2, 3, 4)),
  approval_role VARCHAR(100) NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
  ),
  comments TEXT,
  requested_changes TEXT,
  edited_fields JSONB DEFAULT NULL,
  approval_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- TABLE: request_activity
-- Complete audit trail for all actions on requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  action_details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- TABLE: request_documents
-- For storing document attachments and file references
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
  document_type VARCHAR(100),
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  uploaded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_item_requests_status ON item_requests(status);
CREATE INDEX IF NOT EXISTS idx_item_requests_building_id ON item_requests(building_id);
CREATE INDEX IF NOT EXISTS idx_item_requests_submitter_id ON item_requests(submitter_id);
CREATE INDEX IF NOT EXISTS idx_item_requests_created_at ON item_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_requests_priority ON item_requests(priority);

CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON request_items(request_id);

CREATE INDEX IF NOT EXISTS idx_request_approvals_request_id ON request_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_request_approvals_approval_level ON request_approvals(approval_level);
CREATE INDEX IF NOT EXISTS idx_request_approvals_status ON request_approvals(status);
CREATE INDEX IF NOT EXISTS idx_request_approvals_approver_id ON request_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_request_activity_request_id ON request_activity(request_id);
CREATE INDEX IF NOT EXISTS idx_request_activity_timestamp ON request_activity(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_documents_request_id ON request_documents(request_id);

-- ============================================================================
-- FUNCTION: generate_request_number
-- Auto-generates unique request numbers (e.g., REQ-2024-00001)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS VARCHAR AS $$
DECLARE
  counter INT;
  year_str VARCHAR;
  request_num VARCHAR;
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO counter 
  FROM item_requests 
  WHERE request_number LIKE 'REQ-' || year_str || '-%';
  
  request_num := 'REQ-' || year_str || '-' || LPAD(counter::text, 5, '0');
  RETURN request_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: tr_set_request_number
-- Automatically generate request_number before insert
-- ============================================================================
CREATE OR REPLACE FUNCTION tr_set_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := generate_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_request_number ON item_requests;
CREATE TRIGGER trigger_set_request_number
BEFORE INSERT ON item_requests
FOR EACH ROW
EXECUTE FUNCTION tr_set_request_number();

-- ============================================================================
-- TRIGGER: tr_update_timestamp
-- Automatically update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION tr_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_timestamp_item_requests ON item_requests;
CREATE TRIGGER trigger_update_timestamp_item_requests
BEFORE UPDATE ON item_requests
FOR EACH ROW
EXECUTE FUNCTION tr_update_timestamp();

DROP TRIGGER IF EXISTS trigger_update_timestamp_request_items ON request_items;
CREATE TRIGGER trigger_update_timestamp_request_items
BEFORE UPDATE ON request_items
FOR EACH ROW
EXECUTE FUNCTION tr_update_timestamp();

DROP TRIGGER IF EXISTS trigger_update_timestamp_request_approvals ON request_approvals;
CREATE TRIGGER trigger_update_timestamp_request_approvals
BEFORE UPDATE ON request_approvals
FOR EACH ROW
EXECUTE FUNCTION tr_update_timestamp();

-- ============================================================================
-- TRIGGER: tr_log_request_activity
-- Log all request actions to activity table
-- ============================================================================
CREATE OR REPLACE FUNCTION tr_log_request_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO request_activity (request_id, action, action_details)
    VALUES (NEW.id, 'REQUEST_CREATED', jsonb_build_object(
      'priority', NEW.priority,
      'building_id', NEW.building_id,
      'description', NEW.description
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      INSERT INTO request_activity (request_id, action, action_details)
      VALUES (NEW.id, 'STATUS_CHANGED', jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_request_activity ON item_requests;
CREATE TRIGGER trigger_log_request_activity
AFTER INSERT OR UPDATE ON item_requests
FOR EACH ROW
EXECUTE FUNCTION tr_log_request_activity();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_documents ENABLE ROW LEVEL SECURITY;

-- item_requests RLS policies
CREATE POLICY "Users can view own requests"
ON item_requests FOR SELECT
USING (auth.uid() = submitter_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can create requests"
ON item_requests FOR INSERT
WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Users can update own draft requests"
ON item_requests FOR UPDATE
USING (auth.uid() = submitter_id AND status = 'DRAFT')
WITH CHECK (auth.uid() = submitter_id);

-- request_items RLS policies
CREATE POLICY "Users can view request items"
ON request_items FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert request items"
ON request_items FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update request items"
ON request_items FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- request_approvals RLS policies
CREATE POLICY "Users can view approval records"
ON request_approvals FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Approvers can update their approvals"
ON request_approvals FOR UPDATE
USING (auth.uid() = approver_id OR auth.role() = 'authenticated')
WITH CHECK (auth.uid() = approver_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert approval records"
ON request_approvals FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- request_activity RLS policies
CREATE POLICY "Users can view activity logs"
ON request_activity FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert activity logs"
ON request_activity FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- request_documents RLS policies
CREATE POLICY "Users can view documents"
ON request_documents FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload documents"
ON request_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
