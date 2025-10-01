-- Comprehensive fix for drivers table issues
-- This will ensure all columns exist and are properly configured

-- First, let's see the current state
SELECT 'Current drivers table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ensure all required columns exist with correct types
DO $$
BEGIN
  -- Add phone column if missing (should exist but let's be sure)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'phone' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN phone VARCHAR(20);
    RAISE NOTICE 'Added phone column to drivers table';
  END IF;

  -- Ensure organization_id is properly set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'organization_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN organization_id UUID;
    RAISE NOTICE 'Added organization_id column to drivers table';
  END IF;

  -- Update any drivers that don't have organization_id
  UPDATE drivers 
  SET organization_id = (
    SELECT ou.organization_id 
    FROM organization_users ou 
    WHERE ou.user_id = COALESCE(drivers.added_by, drivers.created_by)
    LIMIT 1
  )
  WHERE organization_id IS NULL;

  RAISE NOTICE 'Updated organization_id for drivers';

END $$;

-- Test the exact query the frontend makes
SELECT 'Testing frontend query:' as info;
SELECT 
  id,
  name,
  license_number,
  phone,
  address,
  date_of_birth,
  date_of_joining,
  license_expiry,
  medical_certificate_expiry,
  aadhar_number,
  status,
  experience_years,
  salary,
  added_by,
  created_at,
  updated_at
FROM drivers 
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
ORDER BY created_at DESC
LIMIT 5;

-- Check RLS policies
SELECT 'Current RLS policies:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'drivers';

-- Temporarily disable RLS to test
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

SELECT 'Testing without RLS:' as info;
SELECT COUNT(*) as drivers_count FROM drivers;

-- Re-enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that should work
DROP POLICY IF EXISTS "drivers_org_select" ON drivers;
CREATE POLICY "drivers_org_select" ON drivers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

SELECT 'Final test with new policy:' as info;
SELECT COUNT(*) as accessible_drivers 
FROM drivers 
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';
