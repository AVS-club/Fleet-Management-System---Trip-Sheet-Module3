-- Fix: Ensure total_fuel_cost column exists and refresh schema cache
-- This migration addresses the PGRST204 error where total_fuel_cost column is not found in schema cache

-- Add total_fuel_cost column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'trips' 
    AND column_name = 'total_fuel_cost'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN total_fuel_cost DECIMAL(10,2);
  END IF;
END $$;

-- Ensure the column has the correct data type and constraints
ALTER TABLE public.trips 
ALTER COLUMN total_fuel_cost TYPE DECIMAL(10,2);

-- Add comment for documentation
COMMENT ON COLUMN public.trips.total_fuel_cost IS 'Total cost of fuel for this trip';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Also try to refresh the schema cache with a different approach
SELECT pg_notify('pgrst', 'reload schema');
