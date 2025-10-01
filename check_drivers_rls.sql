-- Check RLS status and policies for drivers table

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'drivers' AND schemaname = 'public';

-- 2. Check all policies on drivers table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'drivers'
ORDER BY policyname;

-- 3. Test if we can access drivers as the owner user
SET LOCAL "request.jwt.claim.sub" = '216a04c7-9d95-411e-b986-b7a17038bbc3';

SELECT COUNT(*) as accessible_drivers
FROM drivers 
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';

RESET "request.jwt.claim.sub";

-- 4. Test without RLS (temporarily disable)
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

SELECT COUNT(*) as drivers_without_rls FROM drivers;

-- Re-enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
