-- Test query to verify drivers table access
-- This should work if the table and columns exist

-- Test 1: Simple count query
SELECT COUNT(*) as total_drivers FROM drivers;

-- Test 2: Test the exact query the frontend is making
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

-- Test 3: Check if RLS is blocking access
SELECT 
  'RLS Status' as info,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'drivers' AND schemaname = 'public';

-- Test 4: Check current RLS policies on drivers
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'drivers';
