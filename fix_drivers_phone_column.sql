-- Fix missing phone column in drivers table
-- Check if phone column exists, if not add it

DO $$
BEGIN
  -- Check if phone column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' 
    AND column_name = 'phone'
    AND table_schema = 'public'
  ) THEN
    -- Add the phone column
    ALTER TABLE public.drivers 
    ADD COLUMN phone VARCHAR(20);
    
    RAISE NOTICE 'Added phone column to drivers table';
  ELSE
    RAISE NOTICE 'Phone column already exists in drivers table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND table_schema = 'public'
ORDER BY ordinal_position;
