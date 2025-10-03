-- Fix missing organization_users records for existing organizations
-- This script will create organization_users records for users who own organizations
-- but don't have corresponding organization_users records

-- First, let's see what we're working with
SELECT 'Current state:' as info;
SELECT 
  'organizations' as table_name,
  COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
  'organization_users' as table_name,
  COUNT(*) as count
FROM organization_users;

-- Find organizations that don't have corresponding organization_users records
SELECT 'Organizations without organization_users records:' as info;
SELECT 
  o.id,
  o.name,
  o.owner_id,
  o.created_at
FROM organizations o
LEFT JOIN organization_users ou ON o.id = ou.organization_id AND o.owner_id = ou.user_id
WHERE ou.organization_id IS NULL;

-- Create missing organization_users records
INSERT INTO organization_users (user_id, organization_id, role)
SELECT 
  o.owner_id,
  o.id,
  'owner'::text
FROM organizations o
LEFT JOIN organization_users ou ON o.id = ou.organization_id AND o.owner_id = ou.user_id
WHERE ou.organization_id IS NULL;

-- Verify the fix
SELECT 'After fix - organization_users count:' as info;
SELECT COUNT(*) as count FROM organization_users;

-- Show the newly created records
SELECT 'Newly created organization_users records:' as info;
SELECT 
  ou.user_id,
  ou.organization_id,
  ou.role,
  o.name as organization_name
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.role = 'owner'
ORDER BY ou.created_at DESC;
