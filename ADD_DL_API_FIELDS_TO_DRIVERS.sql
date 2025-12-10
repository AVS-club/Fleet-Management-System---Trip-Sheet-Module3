-- ====================================================
-- Add DL API Fields to Drivers Table
-- Run this in Supabase SQL Editor
-- ====================================================

-- Add columns for DL API data that currently aren't in the database
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS father_or_husband_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS license_issue_date DATE,
ADD COLUMN IF NOT EXISTS valid_from DATE,
ADD COLUMN IF NOT EXISTS vehicle_class TEXT[], -- Array of license types
ADD COLUMN IF NOT EXISTS rto TEXT, -- RTO office name
ADD COLUMN IF NOT EXISTS rto_code TEXT, -- RTO code
ADD COLUMN IF NOT EXISTS state TEXT; -- State name

-- Add comments for documentation
COMMENT ON COLUMN public.drivers.father_or_husband_name IS 'Father or husband name from DL API';
COMMENT ON COLUMN public.drivers.gender IS 'Gender (MALE/FEMALE/OTHER) from DL API';
COMMENT ON COLUMN public.drivers.blood_group IS 'Blood group (A+, B+, O-, etc.) from DL API';
COMMENT ON COLUMN public.drivers.email IS 'Email address';
COMMENT ON COLUMN public.drivers.license_issue_date IS 'Date when driving license was issued';
COMMENT ON COLUMN public.drivers.valid_from IS 'License valid from date';
COMMENT ON COLUMN public.drivers.vehicle_class IS 'Array of vehicle classes (LMV, HMV, MCWG, etc.)';
COMMENT ON COLUMN public.drivers.rto IS 'RTO office name (e.g., BILASPUR)';
COMMENT ON COLUMN public.drivers.rto_code IS 'RTO office code (e.g., CG10)';
COMMENT ON COLUMN public.drivers.state IS 'State of residence';

-- Verify the columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'drivers' 
  AND column_name IN (
    'father_or_husband_name', 'gender', 'blood_group', 'email', 
    'license_issue_date', 'valid_from', 'vehicle_class', 
    'rto', 'rto_code', 'state'
  )
ORDER BY column_name;

-- Expected output: 10 rows showing the new columns

