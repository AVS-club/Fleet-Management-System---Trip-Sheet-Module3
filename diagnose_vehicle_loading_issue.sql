-- Diagnostic script to identify vehicle loading issues
-- Run this in your Supabase SQL editor to diagnose the problem

-- 1. Check current user authentication
SELECT 'Current authenticated user:' as info;
SELECT auth.uid() as current_user_id;

-- 2. Check if user exists in profiles table
SELECT 'User profile check:' as info;
SELECT 
  id,
  active_organization_id,
  created_at
FROM profiles 
WHERE id = auth.uid();

-- 3. Check user's organization memberships
SELECT 'User organization memberships:' as info;
SELECT 
  ou.user_id,
  ou.organization_id,
  ou.role,
  o.name as organization_name,
  o.owner_id
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid();

-- 4. Check if user owns any organizations directly
SELECT 'Organizations owned by user:' as info;
SELECT 
  id,
  name,
  owner_id,
  created_at
FROM organizations 
WHERE owner_id = auth.uid();

-- 5. Check vehicles table and organization filtering
SELECT 'Vehicles accessible to user:' as info;
SELECT 
  v.id,
  v.registration_number,
  v.organization_id,
  o.name as organization_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
WHERE v.organization_id IN (
  SELECT organization_id FROM organization_users
  WHERE user_id = auth.uid()
);

-- 6. Check total vehicles count
SELECT 'Total vehicles in database:' as info;
SELECT COUNT(*) as total_vehicles FROM vehicles;

-- 7. Check vehicles by organization
SELECT 'Vehicles by organization:' as info;
SELECT 
  o.name as organization_name,
  COUNT(v.id) as vehicle_count
FROM organizations o
LEFT JOIN vehicles v ON o.id = v.organization_id
GROUP BY o.id, o.name
ORDER BY vehicle_count DESC;

-- 8. Check RLS policies on vehicles table
SELECT 'RLS policies on vehicles table:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'vehicles';

-- 9. Test direct query without RLS (if you have admin access)
-- Uncomment the next line if you want to see all vehicles regardless of RLS
-- SELECT 'All vehicles (bypassing RLS):' as info;
-- SET row_security = off;
-- SELECT id, registration_number, organization_id FROM vehicles LIMIT 10;
-- SET row_security = on;

-- 10. Check if there are any missing organization_users records
SELECT 'Missing organization_users records:' as info;
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.owner_id,
  'Missing organization_users record' as issue
FROM organizations o
LEFT JOIN organization_users ou ON o.id = ou.organization_id AND o.owner_id = ou.user_id
WHERE ou.organization_id IS NULL;

-- 11. Check for any data inconsistencies
SELECT 'Data consistency check:' as info;
SELECT 
  'vehicles_without_org' as issue_type,
  COUNT(*) as count
FROM vehicles 
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'vehicles_with_invalid_org' as issue_type,
  COUNT(*) as count
FROM vehicles v
LEFT JOIN organizations o ON v.organization_id = o.id
WHERE v.organization_id IS NOT NULL AND o.id IS NULL;
