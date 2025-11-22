-- ================================================================
-- DIAGNOSTIC: Check Actual Trip Dates
-- ================================================================
-- This will help us understand what dates your trips actually have
-- ================================================================

-- Step 1: Check trip dates distribution
SELECT 
    DATE(trip_start_date) as trip_date,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue,
    EXTRACT(YEAR FROM trip_start_date) as year,
    EXTRACT(MONTH FROM trip_start_date) as month
FROM trips
GROUP BY DATE(trip_start_date), EXTRACT(YEAR FROM trip_start_date), EXTRACT(MONTH FROM trip_start_date)
ORDER BY trip_date DESC
LIMIT 30;

-- Step 2: Check organization_id distribution
SELECT 
    'Organization Distribution' as check_type,
    organization_id,
    COUNT(*) as trip_count,
    MIN(trip_start_date) as earliest_trip,
    MAX(trip_start_date) as latest_trip
FROM trips
GROUP BY organization_id;

-- Step 3: Check for November 2025 trips specifically
SELECT 
    'November 2025 Trips' as check_type,
    COUNT(*) as total_trips,
    SUM(income_amount) as total_revenue,
    SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END) as total_distance,
    SUM(net_profit) as total_profit,
    COUNT(DISTINCT organization_id) as org_count
FROM trips
WHERE trip_start_date >= '2025-11-01'
    AND trip_start_date < '2025-12-01';

-- Step 4: Check what the current KPI function would see
WITH org AS (
    SELECT id FROM organizations LIMIT 1
)
SELECT 
    'What Function Sees' as check_type,
    org.id as organization_id,
    COUNT(*) as trips_for_org,
    COUNT(*) FILTER (WHERE trip_start_date >= CURRENT_DATE) as today_trips,
    COUNT(*) FILTER (WHERE trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)) as week_trips,
    COUNT(*) FILTER (WHERE trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_trips
FROM trips t
CROSS JOIN org
WHERE t.organization_id = org.id
GROUP BY org.id;

-- Step 5: Check for NULL organization_id trips
SELECT 
    'NULL Organization Check' as check_type,
    COUNT(*) as trips_with_null_org,
    SUM(income_amount) as revenue,
    MIN(trip_start_date) as earliest,
    MAX(trip_start_date) as latest
FROM trips
WHERE organization_id IS NULL;

-- Step 6: Summary by month and year
SELECT 
    EXTRACT(YEAR FROM trip_start_date) as year,
    EXTRACT(MONTH FROM trip_start_date) as month,
    TO_CHAR(trip_start_date, 'Month YYYY') as period,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue,
    organization_id
FROM trips
GROUP BY EXTRACT(YEAR FROM trip_start_date), EXTRACT(MONTH FROM trip_start_date), 
         TO_CHAR(trip_start_date, 'Month YYYY'), organization_id
ORDER BY year DESC, month DESC;
