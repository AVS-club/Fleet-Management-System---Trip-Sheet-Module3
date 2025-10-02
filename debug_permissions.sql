-- Debug script to check permission issues
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check if organization_users table exists and has data
SELECT 'organization_users table check' as check_type, COUNT(*) as count FROM organization_users;

-- 2. Check if organizations table exists and has data  
SELECT 'organizations table check' as check_type, COUNT(*) as count FROM organizations;

-- 3. Check current RLS policies on organization_users
SELECT 
  'organization_users policies' as check_type,
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'organization_users';

-- 4. Check if RLS is enabled on organization_users
SELECT 
  'organization_users RLS status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'organization_users';

-- 5. Sample data from organization_users (if accessible)
SELECT 
  'organization_users sample data' as check_type,
  user_id,
  organization_id,
  role,
  created_at
FROM organization_users 
LIMIT 5;

-- 6. Check if there are any users with owner role
SELECT 
  'owner users check' as check_type,
  COUNT(*) as owner_count
FROM organization_users 
WHERE role = 'owner';

-- 7. Test the exact query that the frontend makes (replace with actual user ID)
-- You'll need to replace 'YOUR_USER_ID_HERE' with the actual user ID from auth.users
SELECT 
  'frontend query test' as check_type,
  ou.role,
  ou.organization_id,
  o.name as organization_name
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
WHERE ou.user_id = 'YOUR_USER_ID_HERE';

-- 8. Check auth.users table for reference
SELECT 
  'auth users check' as check_type,
  id,
  email,
  created_at
FROM auth.users 
LIMIT 3;
