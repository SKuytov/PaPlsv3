-- ============================================================
-- MIGRATION 002: Manager Dashboards Tables
-- Purpose: Support quote management, order tracking, invoice verification
-- Status: Production Ready
-- ============================================================

-- Drop existing tables if rerunning
DROP TABLE IF EXISTS supplier_quotes CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS invoice_checklist CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;

-- ============================================================
-- TABLE: supplier_quotes
-- Purpose: Store supplier quotes for requests
-- ============================================================
CREATE TABLE supplier_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    quote_pdf_url VARCHAR(1000),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_selected BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_supplier_quotes_request_id ON supplier_quotes(request_id);
CREATE INDEX idx_supplier_quotes_created_by ON supplier_quotes(created_by);
CREATE INDEX idx_supplier_quotes_is_selected ON supplier_quotes(is_selected);

-- ============================================================
-- TABLE: purchase_orders
-- Purpose: Track purchase orders and delivery status
-- ============================================================
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    supplier_quote_id UUID REFERENCES supplier_quotes(id),
    po_number VARCHAR(50) UNIQUE,
    order_status VARCHAR(50) DEFAULT 'NOT_PLACED', -- NOT_PLACED, ORDER_PLACED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED
    tracking_number VARCHAR(255),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_request_id ON purchase_orders(request_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(order_status);
CREATE INDEX idx_purchase_orders_tracking ON purchase_orders(tracking_number);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);

-- ============================================================
-- TABLE: invoice_checklist
-- Purpose: Track invoice verification checklist items
-- ============================================================
CREATE TABLE invoice_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    items_received BOOLEAN DEFAULT FALSE,
    quantities_verified BOOLEAN DEFAULT FALSE,
    invoice_matches_po BOOLEAN DEFAULT FALSE,
    prices_verified BOOLEAN DEFAULT FALSE,
    no_damages BOOLEAN DEFAULT FALSE,
    documentation_complete BOOLEAN DEFAULT FALSE,
    invoice_file_url VARCHAR(1000),
    checklist_notes TEXT,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_checklist_request_id ON invoice_checklist(request_id);
CREATE INDEX idx_invoice_checklist_verified_by ON invoice_checklist(verified_by);

-- ============================================================
-- TABLE: payment_records
-- Purpose: Track payment processing for requests
-- ============================================================
CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSED, CANCELLED
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    payment_date DATE,
    processed_by UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_records_request_id ON payment_records(request_id);
CREATE INDEX idx_payment_records_status ON payment_records(payment_status);
CREATE INDEX idx_payment_records_processed_by ON payment_records(processed_by);

-- ============================================================
-- TABLE: dashboard_views
-- Purpose: Store dashboard preferences and filters
-- ============================================================
CREATE TABLE dashboard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    default_view VARCHAR(100), -- quotes, orders, received, accounting
    filter_priority VARCHAR(20), -- ALL, URGENT, HIGH, MEDIUM, LOW
    sort_by VARCHAR(50) DEFAULT 'created_at',
    items_per_page INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_dashboard_preferences_user_role ON dashboard_preferences(user_id, role);

-- ============================================================
-- ADD COLUMNS TO item_requests (if not exists)
-- ============================================================
ALTER TABLE item_requests
ADD COLUMN IF NOT EXISTS quote_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';

-- ============================================================
-- CREATE TRIGGERS FOR TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_supplier_quotes_timestamp ON supplier_quotes;
CREATE TRIGGER update_supplier_quotes_timestamp BEFORE UPDATE
    ON supplier_quotes FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_timestamp ON purchase_orders;
CREATE TRIGGER update_purchase_orders_timestamp BEFORE UPDATE
    ON purchase_orders FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoice_checklist_timestamp ON invoice_checklist;
CREATE TRIGGER update_invoice_checklist_timestamp BEFORE UPDATE
    ON invoice_checklist FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_records_timestamp ON payment_records;
CREATE TRIGGER update_payment_records_timestamp BEFORE UPDATE
    ON payment_records FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_preferences_timestamp ON dashboard_preferences;
CREATE TRIGGER update_dashboard_preferences_timestamp BEFORE UPDATE
    ON dashboard_preferences FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Supplier Quotes RLS
CREATE POLICY "Users can view quotes for their requests" ON supplier_quotes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM item_requests r 
                WHERE r.id = request_id AND r.submitter_id = auth.uid())
        OR
        auth.jwt() ->> 'role' IN ('maintenance_org', 'god_admin')
    );

CREATE POLICY "Maintenance org can create quotes" ON supplier_quotes
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('maintenance_org', 'god_admin'));

CREATE POLICY "Users can update own quotes" ON supplier_quotes
    FOR UPDATE USING (created_by = auth.uid() OR auth.jwt() ->> 'role' = 'god_admin');

-- Purchase Orders RLS
CREATE POLICY "Authorized users can view purchase orders" ON purchase_orders
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('maintenance_org', 'tech_director', 'god_admin')
    );

CREATE POLICY "Maintenance org can create orders" ON purchase_orders
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('maintenance_org', 'god_admin'));

CREATE POLICY "Users can update own orders" ON purchase_orders
    FOR UPDATE USING (created_by = auth.uid() OR auth.jwt() ->> 'role' = 'god_admin');

-- Invoice Checklist RLS
CREATE POLICY "Authorized users can view checklist" ON invoice_checklist
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('maintenance_org', 'accountant', 'god_admin')
    );

CREATE POLICY "Maintenance org can update checklist" ON invoice_checklist
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('maintenance_org', 'god_admin'));

CREATE POLICY "Users can update checklist" ON invoice_checklist
    FOR UPDATE USING (auth.jwt() ->> 'role' IN ('maintenance_org', 'accountant', 'god_admin'));

-- Payment Records RLS
CREATE POLICY "Authorized users can view payments" ON payment_records
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('accountant', 'god_admin')
    );

CREATE POLICY "Accountants can process payments" ON payment_records
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('accountant', 'god_admin'));

CREATE POLICY "Accountants can update payments" ON payment_records
    FOR UPDATE USING (auth.jwt() ->> 'role' IN ('accountant', 'god_admin'));

-- Dashboard Preferences RLS
CREATE POLICY "Users can view own preferences" ON dashboard_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences" ON dashboard_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON dashboard_preferences
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
SELECT 'Migration 002 completed successfully!' as status;