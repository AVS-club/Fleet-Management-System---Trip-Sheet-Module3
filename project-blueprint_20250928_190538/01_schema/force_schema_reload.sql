-- Force PostgREST to reload its schema cache
-- Run this in Supabase SQL Editor after schema changes

-- Method 1: Using NOTIFY
NOTIFY pgrst, 'reload schema';

-- Method 2: Touch a system table to trigger reload
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS _temp_reload BOOLEAN DEFAULT false;
ALTER TABLE public.trips DROP COLUMN IF EXISTS _temp_reload;

-- Method 3: Force function recreation to trigger cache update
CREATE OR REPLACE FUNCTION public.force_schema_reload()
RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql;

SELECT public.force_schema_reload();

-- Verify the refuelings column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'trips' 
  AND column_name = 'refuelings';