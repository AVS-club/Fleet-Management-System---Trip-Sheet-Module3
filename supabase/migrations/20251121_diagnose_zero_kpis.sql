-- Diagnose why KPIs are showing zeros
-- Run each section to identify the issue

-- 1. Check if we have any trips data at all
SELECT 
    'Total trips in database' as check_type,
    COUNT(*) as count,
    MIN(trip_start_date) as earliest_date,
    MAX(trip_start_date) as latest_date
FROM trips;

-- 2. Check trips for today (likely zero since it's late in the day)
SELECT 
    'Trips today' as check_type,
    COUNT(*) as count,
    CURRENT_DATE as checking_date,
    MIN(trip_start_date) as earliest,
    MAX(trip_start_date) as latest
FROM trips
WHERE trip_start_date >= CURRENT_DATE
    AND trip_start_date < CURRENT_DATE + INTERVAL '1 day';

-- 3. Check trips for this week
SELECT 
    'Trips this week' as check_type,
    COUNT(*) as count,
    DATE_TRUNC('week', CURRENT_DATE) as week_start,
    MIN(trip_start_date) as earliest,
    MAX(trip_start_date) as latest
FROM trips
WHERE trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)
    AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';

-- 4. Check trips for this month
SELECT 
    'Trips this month' as check_type,
    COUNT(*) as count,
    DATE_TRUNC('month', CURRENT_DATE) as month_start,
    MIN(trip_start_date) as earliest,
    MAX(trip_start_date) as latest
FROM trips
WHERE trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- 5. Check what organization_id is being used
SELECT 
    'Organizations' as check_type,
    id,
    name,
    created_at
FROM organizations;

-- 6. Check if trips have organization_id set
SELECT 
    'Trips by organization' as check_type,
    organization_id,
    COUNT(*) as trip_count,
    MIN(trip_start_date) as earliest,
    MAX(trip_start_date) as latest
FROM trips
GROUP BY organization_id;

-- 7. Check the actual KPI values stored
SELECT 
    kpi_key,
    kpi_value_human,
    kpi_value_raw,
    organization_id,
    computed_at
FROM kpi_cards
WHERE kpi_key IN ('today.distance', 'week.distance', 'month.trips', 'month.revenue')
ORDER BY computed_at DESC
LIMIT 20;

-- 8. Test the query logic directly for your organization
WITH org AS (
    SELECT id FROM organizations LIMIT 1
)
SELECT 
    'Direct query test' as check_type,
    (SELECT COUNT(*) FROM trips WHERE organization_id = org.id AND trip_start_date >= CURRENT_DATE) as today_trips,
    (SELECT COUNT(*) FROM trips WHERE organization_id = org.id AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)) as week_trips,
    (SELECT COUNT(*) FROM trips WHERE organization_id = org.id AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_trips,
    (SELECT COUNT(*) FROM trips WHERE organization_id = org.id) as total_trips
FROM org;

-- 9. Check if it's a timezone issue
SELECT 
    'Timezone check' as check_type,
    CURRENT_DATE as current_date,
    CURRENT_TIMESTAMP as current_timestamp,
    NOW() as now_time,
    TIMEZONE('UTC', NOW()) as utc_time,
    DATE_TRUNC('week', CURRENT_DATE) as week_start,
    DATE_TRUNC('month', CURRENT_DATE) as month_start;
