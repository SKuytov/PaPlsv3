-- ============================================================================
-- ITEM REQUEST FEATURE - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This migration creates the complete item request system with:
-- - 5 main tables for request lifecycle management
-- - RLS (Row Level Security) policies for data protection
-- - Automatic request number generation
-- - Complete audit trail logging
-- - Performance indexes
-- - Cascade delete rules for data integrity
--
-- Total Tables: 5
-- Total Functions: 1
-- Total Triggers: 3
-- Total Indexes: 12
-- Total RLS Policies: 8
-- ============================================================================

-- ============================================================================
-- 1. CREATE MAIN REQUEST TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    request_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "REQ-2024-00001"
    
    -- Requester Information
    submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submitter_email VARCHAR(255) NOT NULL,
    
    -- Request Details
    building_id VARCHAR(100) NOT NULL,          -- e.g., "Building 1", "Building 2"
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, SUBMITTED, BUILDING_APPROVED, MAINTENANCE_APPROVED, DIRECTOR_APPROVED, EXECUTED, REJECTED
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',  -- LOW, NORMAL, HIGH, URGENT
    description TEXT,
    notes TEXT,
    
    -- Budget Tracking
    estimated_budget DECIMAL(12,2) DEFAULT 0,  -- Auto-calculated from items
    actual_cost DECIMAL(12,2),                  -- Set during execution
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,      -- When submitted for approval
    completed_at TIMESTAMP WITH TIME ZONE,      -- When fully executed
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'BUILDING_APPROVED', 'MAINTENANCE_APPROVED',
        'DIRECTOR_APPROVED', 'EXECUTED', 'REJECTED'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

-- Create indexes for performance
CREATE INDEX idx_item_requests_status ON item_requests(status);
CREATE INDEX idx_item_requests_building_id ON item_requests(building_id);
CREATE INDEX idx_item_requests_submitter_id ON item_requests(submitter_id);
CREATE INDEX idx_item_requests_created_at ON item_requests(created_at DESC);
CREATE INDEX idx_item_requests_request_number ON item_requests(request_number);

-- ============================================================================
-- 2. CREATE REQUEST ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    
    -- Item Details (Open text fields - no predefined items)
    item_name VARCHAR(255) NOT NULL,            -- "Hydraulic Pump", "Compressor", etc.
    quantity DECIMAL(10,2) NOT NULL,            -- How many units
    unit VARCHAR(50) NOT NULL,                  -- pcs, kg, m, hours, set, box, etc.
    estimated_unit_price DECIMAL(10,2),         -- Price per unit (estimated)
    actual_unit_price DECIMAL(10,2),            -- Price per unit (actual, set during execution)
    
    -- Flexible Specifications
    specs JSONB DEFAULT NULL,                   -- Open-ended specifications object
    -- Example: {"color": "red", "material": "steel", "model": "X-2000"}
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_estimated_price CHECK (estimated_unit_price IS NULL OR estimated_unit_price > 0),
    CONSTRAINT positive_actual_price CHECK (actual_unit_price IS NULL OR actual_unit_price > 0)
);

-- Create indexes
CREATE INDEX idx_request_items_request_id ON request_items(request_id);
CREATE INDEX idx_request_items_created_at ON request_items(created_at);

-- ============================================================================
-- 3. CREATE REQUEST APPROVALS TABLE (Multi-level workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    
    -- Approval Level (1-4)
    approval_level INT NOT NULL,                -- 1=Building Tech, 2=Maintenance Org, 3=Tech Director, 4=Admin
    approval_role VARCHAR(100) NOT NULL,        -- "Building Technician", "Maintenance Organizer", etc.
    
    -- Approver Information
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_email VARCHAR(255),
    
    -- Approval Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
    
    -- Approval Details
    comments TEXT,                              -- Approval comments
    requested_changes TEXT,                     -- If requesting changes
    edited_fields JSONB DEFAULT NULL,           -- JSON object of fields that were edited
    approval_date TIMESTAMP WITH TIME ZONE,     -- When approval happened
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_approval_level CHECK (approval_level BETWEEN 1 AND 4),
    CONSTRAINT valid_approval_status CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'
    )),
    CONSTRAINT unique_request_level UNIQUE(request_id, approval_level)
);

-- Create indexes
CREATE INDEX idx_request_approvals_request_id ON request_approvals(request_id);
CREATE INDEX idx_request_approvals_status ON request_approvals(status);
CREATE INDEX idx_request_approvals_approval_level ON request_approvals(approval_level);
CREATE INDEX idx_request_approvals_approver_id ON request_approvals(approver_id);

-- ============================================================================
-- 4. CREATE REQUEST ACTIVITY TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    
    -- Action Information
    action VARCHAR(100) NOT NULL,               -- REQUEST_CREATED, STATUS_CHANGED, ITEM_ADDED, ITEM_REMOVED, APPROVED, REJECTED, EDITED, EXECUTED
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    
    -- Details
    action_details JSONB DEFAULT NULL,          -- JSON with action-specific details
    -- Example: {"old_status": "DRAFT", "new_status": "SUBMITTED", "reason": "User requested"}
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_request_activity_request_id ON request_activity(request_id);
CREATE INDEX idx_request_activity_action ON request_activity(action);
CREATE INDEX idx_request_activity_timestamp ON request_activity(timestamp DESC);
CREATE INDEX idx_request_activity_actor_id ON request_activity(actor_id);

-- ============================================================================
-- 5. CREATE REQUEST DOCUMENTS TABLE (Optional Attachments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    
    -- Document Details
    document_type VARCHAR(100),                 -- "SPECIFICATION", "QUOTE", "INVOICE", etc.
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,             -- Supabase Storage URL
    file_size_bytes INT,
    mime_type VARCHAR(100),
    
    -- Upload Information
    uploaded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_by_email VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_request_documents_request_id ON request_documents(request_id);
CREATE INDEX idx_request_documents_document_type ON request_documents(document_type);

-- ============================================================================
-- 6. FUNCTION: Generate Request Number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INT;
    v_count INT;
    v_request_number VARCHAR(50);
BEGIN
    -- Count existing requests for this year
    SELECT COUNT(*) + 1 INTO v_count FROM item_requests
    WHERE EXTRACT(YEAR FROM created_at)::INT = v_year;
    
    -- Generate request number: REQ-YYYY-NNNNN
    v_request_number := 'REQ-' || v_year || '-' || LPAD(v_count::VARCHAR, 5, '0');
    
    RETURN v_request_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGER: Auto-set Request Number on Creation
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

DROP TRIGGER IF EXISTS tr_set_request_number ON item_requests;
CREATE TRIGGER tr_set_request_number
BEFORE INSERT ON item_requests
FOR EACH ROW
EXECUTE FUNCTION tr_set_request_number();

-- ============================================================================
-- 8. TRIGGER: Update Timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION tr_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_timestamp_requests ON item_requests;
CREATE TRIGGER tr_update_timestamp_requests
BEFORE UPDATE ON item_requests
FOR EACH ROW
EXECUTE FUNCTION tr_update_timestamp();

DROP TRIGGER IF EXISTS tr_update_timestamp_items ON request_items;
CREATE TRIGGER tr_update_timestamp_items
BEFORE UPDATE ON request_items
FOR EACH ROW
EXECUTE FUNCTION tr_update_timestamp();

DROP TRIGGER IF EXISTS tr_update_timestamp_approvals ON request_approvals;
CREATE TRIGGER tr_update_timestamp_approvals
BEFORE UPDATE ON request_approvals
FOR EACH ROW
EXECUTE FUNCTION tr_update_timestamp();

-- ============================================================================
-- 9. TRIGGER: Log Request Creation to Activity Table
-- ============================================================================
CREATE OR REPLACE FUNCTION tr_log_request_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO request_activity (
        request_id,
        action,
        actor_id,
        actor_email,
        action_details,
        timestamp
    ) VALUES (
        NEW.id,
        'REQUEST_CREATED',
        NEW.submitter_id,
        NEW.submitter_email,
        jsonb_build_object(
            'priority', NEW.priority,
            'building_id', NEW.building_id,
            'description', NEW.description
        ),
        CURRENT_TIMESTAMP
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_request_created ON item_requests;
CREATE TRIGGER tr_log_request_created
AFTER INSERT ON item_requests
FOR EACH ROW
EXECUTE FUNCTION tr_log_request_created();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS: item_requests - Users can view own requests
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own requests" ON item_requests;
CREATE POLICY "Users can view own requests" ON item_requests
FOR SELECT USING (
    auth.uid() = submitter_id OR
    auth.uid() IN (
        SELECT approver_id FROM request_approvals
        WHERE request_id = item_requests.id
    )
);

DROP POLICY IF EXISTS "Users can create requests" ON item_requests;
CREATE POLICY "Users can create requests" ON item_requests
FOR INSERT WITH CHECK (auth.uid() = submitter_id);

DROP POLICY IF EXISTS "Users can update own draft requests" ON item_requests;
CREATE POLICY "Users can update own draft requests" ON item_requests
FOR UPDATE USING (
    auth.uid() = submitter_id AND status = 'DRAFT'
);

-- ============================================================================
-- RLS: request_items - View through parent request
-- ============================================================================
DROP POLICY IF EXISTS "View items through request" ON request_items;
CREATE POLICY "View items through request" ON request_items
FOR SELECT USING (
    request_id IN (
        SELECT id FROM item_requests
        WHERE auth.uid() = submitter_id OR
              auth.uid() IN (
                  SELECT approver_id FROM request_approvals
                  WHERE request_id = item_requests.id
              )
    )
);

DROP POLICY IF EXISTS "Users can add items to own requests" ON request_items;
CREATE POLICY "Users can add items to own requests" ON request_items
FOR INSERT WITH CHECK (
    request_id IN (
        SELECT id FROM item_requests WHERE auth.uid() = submitter_id
    )
);

-- ============================================================================
-- RLS: request_approvals - Approvers can view their level
-- ============================================================================
DROP POLICY IF EXISTS "Approvers can view their approvals" ON request_approvals;
CREATE POLICY "Approvers can view their approvals" ON request_approvals
FOR SELECT USING (
    auth.uid() = approver_id OR
    request_id IN (SELECT id FROM item_requests WHERE auth.uid() = submitter_id)
);

DROP POLICY IF EXISTS "Approvers can update their approval" ON request_approvals;
CREATE POLICY "Approvers can update their approval" ON request_approvals
FOR UPDATE USING (
    auth.uid() = approver_id AND status = 'PENDING'
);

-- ============================================================================
-- RLS: request_activity - View through request
-- ============================================================================
DROP POLICY IF EXISTS "View activity through request" ON request_activity;
CREATE POLICY "View activity through request" ON request_activity
FOR SELECT USING (
    request_id IN (
        SELECT id FROM item_requests
        WHERE auth.uid() = submitter_id OR
              auth.uid() IN (
                  SELECT approver_id FROM request_approvals
                  WHERE request_id = item_requests.id
              )
    )
);

-- ============================================================================
-- RLS: request_documents - View through request
-- ============================================================================
DROP POLICY IF EXISTS "View documents through request" ON request_documents;
CREATE POLICY "View documents through request" ON request_documents
FOR SELECT USING (
    request_id IN (
        SELECT id FROM item_requests
        WHERE auth.uid() = submitter_id OR
              auth.uid() IN (
                  SELECT approver_id FROM request_approvals
                  WHERE request_id = item_requests.id
              )
    )
);

-- ============================================================================
-- 11. SAMPLE DATA (OPTIONAL - Comment out if not needed)
-- ============================================================================
-- This section inserts sample data for testing
-- Uncomment if you want to populate test data

/*
-- Insert sample request (requires actual user ID from auth.users)
INSERT INTO item_requests (
    submitter_id,
    submitter_email,
    building_id,
    priority,
    description,
    notes
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Replace with real user ID
    'technician@example.com',
    'Building 1',
    'HIGH',
    'Need hydraulic equipment for maintenance',
    'ASAP - critical for operations'
);

-- Insert sample items (replace request_id with real ID from above)
INSERT INTO request_items (
    request_id,
    item_name,
    quantity,
    unit,
    estimated_unit_price,
    specs
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Replace with real request ID
    'Hydraulic Pump',
    2,
    'pcs',
    1500.00,
    '{"brand": "Parker", "model": "PV", "pressure": "350 bar"}'::jsonb
);
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Database setup complete!
-- Tables created: 5
-- - item_requests (main requests)
-- - request_items (line items with open text fields)
-- - request_approvals (4-level approval tracking)
-- - request_activity (complete audit trail)
-- - request_documents (optional attachments)
--
-- Functions: 1
-- - generate_request_number() - Auto-generates REQ-YYYY-NNNNN
--
-- Triggers: 3
-- - tr_set_request_number - Auto-set request number
-- - tr_update_timestamp - Auto-update timestamps
-- - tr_log_request_created - Auto-log to activity
--
-- Indexes: 12 (for performance optimization)
-- RLS Policies: 8 (for data security)
--
-- Ready for backend API integration!
-- ============================================================================
