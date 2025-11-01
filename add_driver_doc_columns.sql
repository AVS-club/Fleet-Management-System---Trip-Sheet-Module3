-- Add document URL columns to drivers table
-- Run this script in your Supabase SQL editor

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS license_doc_url TEXT[],
ADD COLUMN IF NOT EXISTS aadhar_doc_url TEXT[],
ADD COLUMN IF NOT EXISTS police_doc_url TEXT[],
ADD COLUMN IF NOT EXISTS medical_doc_url TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.drivers.license_doc_url IS 'Array of file paths for license documents';
COMMENT ON COLUMN public.drivers.aadhar_doc_url IS 'Array of file paths for Aadhar/ID proof documents';
COMMENT ON COLUMN public.drivers.police_doc_url IS 'Array of file paths for police verification documents';
COMMENT ON COLUMN public.drivers.medical_doc_url IS 'Array of file paths for medical certificate documents';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name IN ('license_doc_url', 'aadhar_doc_url', 'police_doc_url', 'medical_doc_url');
