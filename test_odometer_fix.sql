-- 🧪 TEST: Odometer Validation Fix
-- This script tests if the odometer validation now works across different users

-- 1. First, let's see what trips exist for a specific vehicle
-- Replace 'YOUR_VEHICLE_ID' with the actual vehicle ID from your error
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
    ou.role as user_role
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
LEFT JOIN organization_users ou ON t.created_by = ou.user_id
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID'  -- Replace with actual vehicle ID
    AND t.deleted_at IS NULL
ORDER BY t.trip_end_date DESC;

-- 2. Test the validation query that the fixed function uses
-- This simulates what happens when a new trip is created
WITH current_user_org AS (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = 'CURRENT_USER_ID'  -- Replace with current user ID
    LIMIT 1
)
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
CROSS JOIN current_user_org cuo
WHERE t.vehicle_id = 'YOUR_VEHICLE_ID'  -- Replace with actual vehicle ID
    AND t.id != 'NEW_TRIP_ID'  -- Replace with new trip ID
    AND t.trip_end_date < '2025-01-10'  -- Replace with new trip start date
    AND t.deleted_at IS NULL
    AND ou.organization_id = cuo.organization_id  -- ✅ This is the key fix!
ORDER BY t.trip_end_date DESC
LIMIT 1;

-- 3. Check if there are any organization users for testing
SELECT 
    ou.user_id,
    ou.role,
    u.email,
    o.name as organization_name
FROM organization_users ou
LEFT JOIN auth.users u ON ou.user_id = u.id
LEFT JOIN organizations o ON ou.organization_id = o.id
ORDER BY ou.role, u.email;

-- 4. Verify the function is working by checking its source
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'validate_odometer_continuity_enhanced';

-- 5. Check if the trigger is active
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trips' 
    AND trigger_name = 'enhanced_odometer_continuity_check';
