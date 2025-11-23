-- DIAGNOSE: Why is frontend still showing zeros from other orgs?

-- 1. Check what user you're logged in as
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    auth.role() as current_role;

-- 2. Check which organization you belong to
SELECT 
    ou.user_id,
    ou.organization_id,
    o.name as org_name,
    ou.role as user_role
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid();

-- 3. Test what KPIs you can see with current RLS
SELECT 
    kpi_key,
    kpi_value_human,
    organization_id,
    computed_at
FROM kpi_cards
WHERE kpi_key LIKE 'comparison.mtd%'
ORDER BY computed_at DESC
LIMIT 20;

-- 4. Check if RLS is actually enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'kpi_cards';

-- 5. Check the actual RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'kpi_cards';
