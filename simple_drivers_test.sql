-- Simple test to isolate the drivers table issue

-- Test 1: Can we access the drivers table at all?
SELECT COUNT(*) as total_drivers FROM drivers;

-- Test 2: Can we select the phone column specifically?
SELECT phone FROM drivers LIMIT 1;

-- Test 3: Test the exact columns the frontend is requesting
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
LIMIT 1;

-- Test 4: Check if there are any views or functions that might be interfering
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name LIKE '%driver%' 
AND table_schema = 'public';
