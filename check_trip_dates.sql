-- ================================================================
-- DIAGNOSTIC: Check Trip Dates
-- ================================================================
-- This will show you what dates you have trip data for
-- ================================================================

-- Count trips by date
SELECT
  trip_start_date::DATE as trip_date,
  COUNT(*) as trip_count,
  SUM(end_km - start_km) as total_distance,
  SUM(net_profit) as total_profit
FROM public.trips
WHERE trip_start_date IS NOT NULL
GROUP BY trip_start_date::DATE
ORDER BY trip_start_date::DATE DESC
LIMIT 30;

-- Check current date in database
SELECT CURRENT_DATE as database_current_date;

-- Check date range of all trips
SELECT
  MIN(trip_start_date::DATE) as earliest_trip,
  MAX(trip_start_date::DATE) as latest_trip,
  COUNT(*) as total_trips
FROM public.trips
WHERE trip_start_date IS NOT NULL;

-- Check how many trips are from today
SELECT
  COUNT(*) as trips_today,
  SUM(end_km - start_km) as distance_today,
  SUM(net_profit) as profit_today
FROM public.trips
WHERE trip_start_date >= CURRENT_DATE
  AND trip_start_date < CURRENT_DATE + INTERVAL '1 day';

-- Check how many trips are from this month
SELECT
  COUNT(*) as trips_this_month,
  SUM(end_km - start_km) as distance_this_month,
  SUM(net_profit) as profit_this_month
FROM public.trips
WHERE trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
