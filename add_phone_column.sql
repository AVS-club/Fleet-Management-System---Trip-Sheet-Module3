-- Simple script to add the missing phone column to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name = 'phone'
AND table_schema = 'public';
