-- Diagnostic SQL Queries for Vehicle Trips Data
-- Run these in Supabase SQL Editor to check your data

-- 1. Check if trips table exists and has data
SELECT 
  COUNT(*) as total_trips,
  COUNT(DISTINCT vehicle_id) as vehicles_with_trips,
  MIN(trip_date) as earliest_trip,
  MAX(trip_date) as latest_trip
FROM trips;

-- 2. Check trips for a specific vehicle (replace with your vehicle ID)
SELECT 
  t.id,
  t.trip_serial_number,
  t.trip_date,
  t.total_distance,
  t.calculated_kmpl,
  v.registration_number as vehicle,
  d.name as driver,
  w.name as warehouse
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
LEFT JOIN drivers d ON t.driver_id = d.id
LEFT JOIN warehouses w ON t.warehouse_id = w.id
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID_HERE'
ORDER BY t.trip_date DESC
LIMIT 10;

-- 3. Check for trips with missing relations
SELECT 
  'Missing Driver' as issue_type,
  COUNT(*) as count
FROM trips 
WHERE driver_id IS NULL
UNION ALL
SELECT 
  'Missing Warehouse' as issue_type,
  COUNT(*) as count
FROM trips 
WHERE warehouse_id IS NULL
UNION ALL
SELECT 
  'Missing Distance' as issue_type,
  COUNT(*) as count
FROM trips 
WHERE total_distance IS NULL OR total_distance = 0;

-- 4. Check trip_destinations table
SELECT 
  COUNT(*) as total_destinations,
  COUNT(DISTINCT trip_id) as trips_with_destinations
FROM trip_destinations;

-- 5. Check destinations for specific trips
SELECT 
  td.trip_id,
  td.destination_name,
  td.destination_type,
  t.trip_date
FROM trip_destinations td
JOIN trips t ON td.trip_id = t.id
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID_HERE'
ORDER BY t.trip_date DESC;

-- 6. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('trips', 'trip_destinations', 'vehicles', 'drivers', 'warehouses');

-- 7. Check if user can access trips (replace with your user ID)
SELECT 
  t.id,
  t.trip_date,
  t.vehicle_id,
  v.registration_number,
  v.created_by as vehicle_owner
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE v.created_by = 'YOUR_USER_ID_HERE'
ORDER BY t.trip_date DESC
LIMIT 5;

-- 8. Check foreign key constraints
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('trips', 'trip_destinations');

-- 9. Sample data check - get all vehicles with their trip counts
SELECT 
  v.id,
  v.registration_number,
  COUNT(t.id) as trip_count,
  MAX(t.trip_date) as last_trip_date
FROM vehicles v
LEFT JOIN trips t ON v.id = t.vehicle_id
GROUP BY v.id, v.registration_number
ORDER BY trip_count DESC;

-- 10. Check for data inconsistencies
SELECT 
  'Trips with invalid dates' as check_type,
  COUNT(*) as count
FROM trips 
WHERE trip_date > CURRENT_DATE OR trip_date < '2020-01-01'
UNION ALL
SELECT 
  'Trips with negative distance' as check_type,
  COUNT(*) as count
FROM trips 
WHERE total_distance < 0
UNION ALL
SELECT 
  'Trips with invalid mileage' as check_type,
  COUNT(*) as count
FROM trips 
WHERE calculated_kmpl < 0 OR calculated_kmpl > 50;
