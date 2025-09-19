-- Add odometer_image column to maintenance_tasks table
-- Run this in your Supabase SQL Editor

-- Add the missing odometer_image column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks' 
    AND column_name = 'odometer_image'
  ) THEN
    ALTER TABLE public.maintenance_tasks 
    ADD COLUMN odometer_image TEXT;
  END IF;
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'maintenance_tasks' 
  AND column_name = 'odometer_image';