-- Create quote_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  budget DECIMAL(12, 2) NOT NULL,
  required_by_date DATE,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'quoted', 'ordered', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_by ON public.quote_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON public.quote_requests(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own quote requests
CREATE POLICY "Users can view own quote_requests"
  ON public.quote_requests FOR SELECT
  USING (auth.uid() = created_by);

-- RLS Policy: Users can create quote requests
CREATE POLICY "Users can create quote_requests"
  ON public.quote_requests FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Users can update their own quote requests
CREATE POLICY "Users can update own quote_requests"
  ON public.quote_requests FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policy: Users can delete their own quote requests
CREATE POLICY "Users can delete own quote_requests"
  ON public.quote_requests FOR DELETE
  USING (auth.uid() = created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quote_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quote_requests_timestamp ON public.quote_requests;
CREATE TRIGGER trigger_update_quote_requests_timestamp
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_requests_timestamp();
