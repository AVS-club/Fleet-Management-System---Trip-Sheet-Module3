-- Test script to create and verify a data_entry user
-- Run this in your Supabase SQL Editor

-- 1. First, check your current user and organization
SELECT 
  auth.uid() as current_user_id,
  ou.organization_id,
  ou.role as current_role,
  o.name as organization_name
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid();

-- 2. Create a data_entry user for testing (if not exists)
-- Note: You'll need to create the user through Supabase Auth first
-- Go to Authentication > Users > Invite User with email like: dataentry@test.com

-- 3. Once the user is created in Auth, run this to set their role:
-- Replace 'USER_ID_HERE' with the actual user ID from auth.users
/*
INSERT INTO organization_users (user_id, organization_id, role)
SELECT 
  'USER_ID_HERE', -- Replace with actual user ID
  organization_id,
  'data_entry'
FROM organization_users
WHERE user_id = auth.uid()
LIMIT 1
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET role = 'data_entry';
*/

-- 4. Verify the data_entry user was created correctly
SELECT 
  u.email,
  ou.user_id,
  ou.organization_id,
  ou.role,
  o.name as organization_name
FROM organization_users ou
JOIN auth.users u ON ou.user_id = u.id
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.role = 'data_entry'
ORDER BY ou.created_at DESC;

-- 5. Test what a data_entry user would see (permissions check)
-- This shows what permissions the data_entry role should have
SELECT 
  'data_entry' as role,
  false as canAccessDashboard,
  false as canAccessReports,
  false as canAccessAdmin,
  false as canAccessAlerts,
  false as canViewDriverInsights,
  false as canViewVehicleOverview;
