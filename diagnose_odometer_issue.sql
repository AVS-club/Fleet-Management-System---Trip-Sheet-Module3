-- 🔍 DIAGNOSTIC: Odometer Validation Issue
-- This script helps understand why odometer validation is failing between users

-- 1. Check all trips for the vehicle in question
-- Replace 'YOUR_VEHICLE_ID' with the actual vehicle ID from the error
SELECT 
    t.id,
    t.trip_serial_number,
    t.vehicle_id,
    t.start_km,
    t.end_km,
    t.trip_start_date,
    t.trip_end_date,
    t.created_by,
    u.email as created_by_email,
    t.created_at
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID'  -- Replace with actual vehicle ID
    AND t.deleted_at IS NULL
ORDER BY t.trip_end_date DESC;

-- 2. Check the specific validation query that's failing
-- This simulates what the validation function does
SELECT 
    t.id,
    t.trip_serial_number,
    t.start_km,
    t.end_km,
    t.trip_start_date,
    t.trip_end_date,
    t.created_by,
    u.email as created_by_email
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID'  -- Replace with actual vehicle ID
    AND t.id != 'NEW_TRIP_ID'  -- Replace with new trip ID
    AND t.trip_end_date < '2025-01-10'  -- Replace with new trip start date
    AND t.deleted_at IS NULL
    AND t.created_by = 'CURRENT_USER_ID'  -- Replace with current user ID
ORDER BY t.trip_end_date DESC
LIMIT 1;

-- 3. Check what the validation would find WITHOUT the created_by filter
-- This shows if there are trips from other users that should be considered
SELECT 
    t.id,
    t.trip_serial_number,
    t.start_km,
    t.end_km,
    t.trip_start_date,
    t.trip_end_date,
    t.created_by,
    u.email as created_by_email
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID'  -- Replace with actual vehicle ID
    AND t.id != 'NEW_TRIP_ID'  -- Replace with new trip ID
    AND t.trip_end_date < '2025-01-10'  -- Replace with new trip start date
    AND t.deleted_at IS NULL
    -- NO created_by filter here - shows ALL trips
ORDER BY t.trip_end_date DESC
LIMIT 1;

-- 4. Check organization users to understand the relationship
SELECT 
    ou.user_id,
    ou.role,
    u.email,
    o.name as organization_name
FROM organization_users ou
LEFT JOIN auth.users u ON ou.user_id = u.id
LEFT JOIN organizations o ON ou.organization_id = o.id
WHERE ou.organization_id = 'YOUR_ORG_ID'  -- Replace with actual org ID
ORDER BY ou.role, u.email;

-- 5. Check if there are any trips with the specific odometer readings mentioned in error
SELECT 
    t.id,
    t.trip_serial_number,
    t.vehicle_id,
    t.start_km,
    t.end_km,
    t.created_by,
    u.email as created_by_email,
    t.created_at
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
WHERE (t.start_km = 20835 OR t.end_km = 21111)
    AND t.deleted_at IS NULL
ORDER BY t.created_at DESC;

-- 6. Check the current validation function
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname LIKE '%odometer%continuity%';

-- 7. Check if there are any triggers on the trips table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trips';
