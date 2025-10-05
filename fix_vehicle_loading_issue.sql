-- Fix script for vehicle loading issues
-- This script addresses common organization setup problems

-- 1. Create missing organization_users records for organization owners
INSERT INTO organization_users (user_id, organization_id, role)
SELECT 
  o.owner_id,
  o.id,
  'owner'::text
FROM organizations o
LEFT JOIN organization_users ou ON o.id = ou.organization_id AND o.owner_id = ou.user_id
WHERE ou.organization_id IS NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 2. Update profiles table to set active_organization_id for users who don't have one
UPDATE profiles 
SET active_organization_id = (
  SELECT organization_id 
  FROM organization_users 
  WHERE user_id = profiles.id 
  LIMIT 1
)
WHERE active_organization_id IS NULL 
AND id IN (
  SELECT user_id 
  FROM organization_users
);

-- 3. Ensure all vehicles have valid organization_id
-- First, let's see if there are any vehicles without organization_id
SELECT 'Vehicles without organization_id:' as info;
SELECT COUNT(*) as count 
FROM vehicles 
WHERE organization_id IS NULL;

-- If there are vehicles without organization_id, you'll need to assign them manually
-- This is a safety check - we won't automatically assign them to avoid data corruption

-- 4. Create a function to help with organization setup
CREATE OR REPLACE FUNCTION ensure_user_organization_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is creating an organization, automatically add them to organization_users
  IF TG_OP = 'INSERT' AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO organization_users (user_id, organization_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    -- Also update their profile to set this as active organization
    UPDATE profiles 
    SET active_organization_id = NEW.id
    WHERE id = NEW.owner_id 
    AND active_organization_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically handle organization membership
DROP TRIGGER IF EXISTS trigger_ensure_organization_membership ON organizations;
CREATE TRIGGER trigger_ensure_organization_membership
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_organization_membership();

-- 6. Verify the fixes
SELECT 'After fixes - verification:' as info;

-- Check organization_users count
SELECT 'organization_users count:' as info, COUNT(*) as count FROM organization_users;

-- Check profiles with active organization
SELECT 'profiles with active organization:' as info, COUNT(*) as count 
FROM profiles 
WHERE active_organization_id IS NOT NULL;

-- Check vehicles accessible to current user (if authenticated)
SELECT 'vehicles accessible to current user:' as info, COUNT(*) as count
FROM vehicles v
WHERE v.organization_id IN (
  SELECT organization_id FROM organization_users
  WHERE user_id = auth.uid()
);

-- 7. Create a helper view for debugging
CREATE OR REPLACE VIEW user_organization_debug AS
SELECT 
  p.id as user_id,
  p.active_organization_id,
  ou.organization_id as membership_org_id,
  ou.role,
  o.name as organization_name,
  o.owner_id,
  CASE 
    WHEN p.active_organization_id IS NULL THEN 'No active organization'
    WHEN ou.organization_id IS NULL THEN 'No organization membership'
    WHEN p.active_organization_id = ou.organization_id THEN 'OK'
    ELSE 'Mismatch between active and membership'
  END as status
FROM profiles p
LEFT JOIN organization_users ou ON p.id = ou.user_id
LEFT JOIN organizations o ON ou.organization_id = o.id
WHERE p.id = auth.uid();

-- 8. Show current user's organization status
SELECT 'Current user organization status:' as info;
SELECT * FROM user_organization_debug;
