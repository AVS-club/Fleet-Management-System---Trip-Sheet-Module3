-- Debug: Check what the service role sees vs what you see
-- This helps us understand why automation shows zeros

-- 1. Check RLS policies on trips table
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
WHERE tablename = 'trips';

-- 2. Check if RLS is enabled on trips
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'trips';

-- 3. Test the query as if we're the service role (bypass RLS)
-- This simulates what the Edge Function sees
SET ROLE postgres; -- Service role

SELECT 
    'Service Role View - November 2025' as check_type,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue,
    MIN(trip_start_date) as earliest,
    MAX(trip_start_date) as latest
FROM trips
WHERE trip_start_date >= '2025-11-01'
    AND trip_start_date < '2025-12-01';

-- 4. Check if organization_id filter is the issue
SELECT 
    'With Org Filter' as check_type,
    organization_id,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue
FROM trips
WHERE trip_start_date >= '2025-11-01'
    AND trip_start_date < '2025-12-01'
GROUP BY organization_id;

RESET ROLE;
