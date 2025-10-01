-- Direct Organization Name Fix
-- This query will help us verify the organization data exists and is accessible

-- Check if the user has organization data
SELECT 
    ou.user_id,
    ou.role,
    ou.organization_id,
    o.name as organization_name,
    o.id as org_id
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = '603cf685-2779-49e0-838c-078db5d94ab4'; -- Data entry user ID

-- Check if the organization exists
SELECT * FROM organizations WHERE id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';

-- Check all organization_users for this user
SELECT * FROM organization_users WHERE user_id = '603cf685-2779-49e0-838c-078db5d94ab4';
