-- Fix permissions issue for owners
-- This script addresses potential RLS and data issues

-- 1. First, let's check the current state
SELECT 'Current organization_users policies:' as info;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'organization_users';

-- 2. Temporarily disable RLS on organization_users to test
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;

-- 3. Check if there are any users in organization_users
SELECT 'organization_users data:' as info;
SELECT user_id, organization_id, role, created_at 
FROM organization_users 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check if there are any organizations
SELECT 'organizations data:' as info;
SELECT id, name, username, owner_email, created_at 
FROM organizations 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Re-enable RLS with a simple policy
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "organization_users_select_own" ON organization_users;
DROP POLICY IF EXISTS "organization_users_simple_select" ON organization_users;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
DROP POLICY IF EXISTS "org_users_select_self" ON organization_users;
DROP POLICY IF EXISTS "Users can read own membership" ON organization_users;

-- Create a simple, non-recursive policy
CREATE POLICY "organization_users_select_own"
ON organization_users
FOR SELECT
USING (user_id = auth.uid());

-- 6. Test the policy works
SELECT 'Policy test - should work now:' as info;
SELECT user_id, organization_id, role 
FROM organization_users 
WHERE user_id = auth.uid();

-- 7. If the above works, the issue was with RLS policies
-- If it doesn't work, the issue is with data or user authentication
