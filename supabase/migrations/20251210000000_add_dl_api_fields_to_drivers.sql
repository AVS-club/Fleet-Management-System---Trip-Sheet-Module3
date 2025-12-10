-- Add DL API fields to drivers table
-- These fields are returned by the Driver License API and should be stored

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS father_or_husband_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', '')),
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS license_issue_date DATE,
ADD COLUMN IF NOT EXISTS valid_from DATE,
ADD COLUMN IF NOT EXISTS vehicle_class TEXT[], -- Array of vehicle classes (e.g., ['LMV', 'HMV'])
ADD COLUMN IF NOT EXISTS rto TEXT, -- RTO name (e.g., 'BILASPUR')
ADD COLUMN IF NOT EXISTS rto_code TEXT, -- RTO code (e.g., 'CG10')
ADD COLUMN IF NOT EXISTS state TEXT; -- State name (e.g., 'Chhattisgarh')

-- Add comments for documentation
COMMENT ON COLUMN public.drivers.father_or_husband_name IS 'Father or husband name from DL';
COMMENT ON COLUMN public.drivers.gender IS 'Gender (MALE/FEMALE/OTHER)';
COMMENT ON COLUMN public.drivers.blood_group IS 'Blood group (A+, B+, etc.)';
COMMENT ON COLUMN public.drivers.email IS 'Email address';
COMMENT ON COLUMN public.drivers.license_issue_date IS 'Date when license was issued';
COMMENT ON COLUMN public.drivers.valid_from IS 'License valid from date';
COMMENT ON COLUMN public.drivers.vehicle_class IS 'Array of vehicle classes driver is licensed for';
COMMENT ON COLUMN public.drivers.rto IS 'RTO office name';
COMMENT ON COLUMN public.drivers.rto_code IS 'RTO office code';
COMMENT ON COLUMN public.drivers.state IS 'State of residence';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name IN (
  'father_or_husband_name', 'gender', 'blood_group', 'email', 
  'license_issue_date', 'valid_from', 'vehicle_class', 
  'rto', 'rto_code', 'state'
)
ORDER BY column_name;

