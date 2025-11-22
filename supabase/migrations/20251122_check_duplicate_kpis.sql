-- Check for duplicate KPI entries
-- This will tell us why you're seeing multiple entries

-- 1. How many organizations exist?
SELECT 
    'Total Organizations' as check,
    COUNT(*) as count,
    array_agg(id) as org_ids,
    array_agg(name) as org_names
FROM organizations;

-- 2. How many KPI entries per key?
SELECT 
    kpi_key,
    COUNT(*) as duplicate_count,
    array_agg(organization_id) as org_ids,
    array_agg(kpi_value_human) as values,
    array_agg(TO_CHAR(computed_at, 'HH24:MI:SS')) as times
FROM kpi_cards
WHERE computed_at >= NOW() - INTERVAL '30 minutes'
GROUP BY kpi_key
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 3. Check the unique constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'kpi_cards'::regclass
    AND contype = 'u';

-- 4. Show all recent comparative KPIs
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw,
    organization_id,
    TO_CHAR(computed_at, 'HH24:MI:SS') as time
FROM kpi_cards
WHERE kpi_key LIKE 'comparison.%'
    AND computed_at >= NOW() - INTERVAL '30 minutes'
ORDER BY kpi_key, computed_at DESC;
