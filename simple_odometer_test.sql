-- 🧪 SIMPLE TEST: Odometer Validation Fix
-- This script tests the fix without needing to replace placeholder values

-- 1. Check if the fixed function exists and is properly configured
SELECT 
    proname as function_name,
    prokind as function_type,
    provolatile as volatility
FROM pg_proc 
WHERE proname = 'validate_odometer_continuity_enhanced';

-- 2. Check if the trigger is active
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trips' 
    AND trigger_name = 'enhanced_odometer_continuity_check';

-- 3. Show recent trips to understand the data structure
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
    ou.role as user_role,
    o.name as organization_name
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
LEFT JOIN organization_users ou ON t.created_by = ou.user_id
LEFT JOIN organizations o ON ou.organization_id = o.id
WHERE t.deleted_at IS NULL
ORDER BY t.trip_end_date DESC
LIMIT 10;

-- 4. Check organization users to understand the relationship
SELECT 
    ou.user_id,
    ou.role,
    u.email,
    o.name as organization_name
FROM organization_users ou
LEFT JOIN auth.users u ON ou.user_id = u.id
LEFT JOIN organizations o ON ou.organization_id = o.id
ORDER BY ou.role, u.email;

-- 5. Show vehicles to understand the vehicle structure
SELECT 
    v.id,
    v.registration_number,
    v.type,
    v.added_by,
    u.email as created_by_email
FROM vehicles v
LEFT JOIN auth.users u ON v.added_by = u.id
WHERE v.status != 'archived'
ORDER BY v.created_at DESC
LIMIT 5;

-- 6. Test the validation logic by showing what trips would be considered
-- for a specific vehicle (replace with actual vehicle ID from step 5)
-- This is just to show the structure, not to execute
/*
SELECT 
    t.id,
    t.trip_serial_number,
    t.start_km,
    t.end_km,
    t.trip_start_date,
    t.trip_end_date,
    t.created_by,
    u.email as created_by_email,
    ou.role as user_role
FROM trips t
JOIN organization_users ou ON t.created_by = ou.user_id
LEFT JOIN auth.users u ON t.created_by = u.id
WHERE t.vehicle_id = 'REPLACE_WITH_ACTUAL_VEHICLE_ID'
    AND t.deleted_at IS NULL
    AND ou.organization_id = 'REPLACE_WITH_ACTUAL_ORG_ID'
ORDER BY t.trip_end_date DESC;
*/
