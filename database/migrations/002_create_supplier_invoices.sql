-- Create supplier_invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  supplier_invoice_number VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  received_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent_to_accounting', 'processed', 'rejected')),
  notes TEXT,
  attachment_url TEXT,
  sent_to_accounting_at DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_order_id ON public.supplier_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_created_by ON public.supplier_invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON public.supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON public.supplier_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_created_at ON public.supplier_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_invoice_number ON public.supplier_invoices(supplier_invoice_number);

-- Enable Row Level Security (RLS)
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own supplier invoices
CREATE POLICY "Users can view own supplier_invoices"
  ON public.supplier_invoices FOR SELECT
  USING (auth.uid() = created_by);

-- RLS Policy: Users can create supplier invoices
CREATE POLICY "Users can create supplier_invoices"
  ON public.supplier_invoices FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Users can update their own supplier invoices
CREATE POLICY "Users can update own supplier_invoices"
  ON public.supplier_invoices FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policy: Users can delete their own supplier invoices
CREATE POLICY "Users can delete own supplier_invoices"
  ON public.supplier_invoices FOR DELETE
  USING (auth.uid() = created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_supplier_invoices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supplier_invoices_timestamp ON public.supplier_invoices;
CREATE TRIGGER trigger_update_supplier_invoices_timestamp
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_invoices_timestamp();
