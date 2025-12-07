-- Migration: Add Quote Tracking Fields
-- Description: Adds quote_id and send_method columns for tracking quote requests
-- Date: 2025-12-07

ALTER TABLE quote_requests
ADD COLUMN IF NOT EXISTS quote_id VARCHAR(50) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS send_method VARCHAR(20) DEFAULT 'system'; -- system, outlook, copy

-- Create index on quote_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_quote_requests_quote_id ON quote_requests(quote_id);

-- Create index on send_method for filtering
CREATE INDEX IF NOT EXISTS idx_quote_requests_send_method ON quote_requests(send_method);
