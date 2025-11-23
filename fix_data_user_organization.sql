-- Fix data user organization access
-- Run this in Supabase SQL Editor

-- 1. First, let's check if the data user exists and what organizations they should belong to
SELECT 
  u.id as user_id,
  u.email,
  o.id as org_id,
  o.name as org_name,
  ou.role,
  ou.created_at
FROM auth.users u
LEFT JOIN organization_users ou ON ou.user_id = u.id
LEFT JOIN organizations o ON o.id = ou.organization_id
WHERE u.email = 'sud.22.halt@icloud.com';

-- 2. If the above shows NULL for organization, we need to link the user to the organization
-- Find the organization (assuming it's the one the owner owns)
-- Replace 'ORGANIZATION_ID_HERE' with the actual organization ID from your database

-- First, find the organization ID:
SELECT id, name, owner_email FROM organizations LIMIT 5;

-- Then insert the organization_users record (uncomment and update with correct organization_id):
/*
INSERT INTO organization_users (user_id, organization_id, role)
SELECT 
  u.id,
  'ORGANIZATION_ID_HERE', -- Replace with actual organization ID
  'data_entry'
FROM auth.users u
WHERE u.email = 'sud.22.halt@icloud.com'
ON CONFLICT (user_id, organization_id) DO NOTHING;
*/

-- 3. Verify the fix
SELECT 
  u.email,
  o.name as organization_name,
  ou.role
FROM auth.users u
JOIN organization_users ou ON ou.user_id = u.id
JOIN organizations o ON o.id = ou.organization_id
WHERE u.email = 'sud.22.halt@icloud.com';

