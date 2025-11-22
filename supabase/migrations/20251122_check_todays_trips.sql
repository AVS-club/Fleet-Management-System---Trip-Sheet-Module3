-- Check what trips exist for TODAY (Nov 22, 2025)
SELECT 
    'Today (Nov 22, 2025)' as check_type,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue,
    organization_id
FROM trips
WHERE DATE(trip_start_date) = CURRENT_DATE
GROUP BY organization_id;

-- Check November 2025 month-to-date
SELECT 
    'November 2025 MTD' as check_type,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue,
    SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END) as distance,
    SUM(net_profit) as profit,
    organization_id
FROM trips
WHERE trip_start_date >= '2025-11-01'
    AND trip_start_date < '2025-12-01'
    AND organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
GROUP BY organization_id;

-- Check this week
SELECT 
    'This Week' as check_type,
    DATE_TRUNC('week', CURRENT_DATE) as week_start,
    COUNT(*) as trip_count,
    SUM(income_amount) as revenue,
    organization_id
FROM trips
WHERE trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)
    AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
    AND organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
GROUP BY organization_id, DATE_TRUNC('week', CURRENT_DATE);
