-- Add preferred_language column to suppliers table
-- Supports multilingual quote email generation
-- Defaults to 'EN' for backward compatibility

ALTER TABLE public.suppliers
ADD COLUMN preferred_language text NOT NULL DEFAULT 'EN';

-- Add constraint to ensure valid language codes (ISO 639-1)
-- Supported: EN (English), BG (Bulgarian), DE (German), FR (French), ES (Spanish)
ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_language_check 
CHECK (preferred_language IN ('EN', 'BG', 'DE', 'FR', 'ES'));

-- Create index for language-based queries if needed
CREATE INDEX idx_suppliers_language ON public.suppliers(preferred_language);

-- Optional: Add comment for documentation
COMMENT ON COLUMN public.suppliers.preferred_language IS 'ISO 639-1 language code for quote emails. Defaults to EN. Supported: EN, BG, DE, FR, ES';

-- Verification query - run this to confirm migration
-- SELECT id, name, preferred_language FROM public.suppliers LIMIT 5;