-- ================================================================
-- STEP 4: Fix maintenance_vendors Table - Add Missing Columns
-- ================================================================
-- Adds the 'active' column that the vendorStorage.ts code expects
-- ================================================================

-- Add 'active' column to maintenance_vendors if it doesn't exist
ALTER TABLE public.maintenance_vendors
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Add 'created_by' column if it doesn't exist (for audit tracking)
ALTER TABLE public.maintenance_vendors
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index on active column for faster queries
CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_active
  ON public.maintenance_vendors(active);

-- Update existing vendors to be active
UPDATE public.maintenance_vendors
SET active = TRUE
WHERE active IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'maintenance_vendors'
  AND column_name IN ('active', 'created_by')
ORDER BY column_name;
