-- 🧪 TEST: Odometer Validation Fix
-- This script creates a simple test to verify the fix works

-- 1. First, let's see what we have in the database
SELECT 'Current trips in database:' as info;

SELECT 
    t.trip_serial_number,
    t.vehicle_id,
    t.start_km,
    t.end_km,
    t.trip_start_date,
    t.trip_end_date,
    u.email as created_by_email,
    ou.role as user_role
FROM trips t
LEFT JOIN auth.users u ON t.created_by = u.id
LEFT JOIN organization_users ou ON t.created_by = ou.user_id
WHERE t.deleted_at IS NULL
ORDER BY t.trip_end_date DESC
LIMIT 5;

-- 2. Check if the function is working
SELECT 'Function status:' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_odometer_continuity_enhanced') 
        THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as function_status;

-- 3. Check if the trigger is working
SELECT 'Trigger status:' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = 'trips' 
            AND trigger_name = 'enhanced_odometer_continuity_check'
        ) 
        THEN '✅ Trigger exists'
        ELSE '❌ Trigger missing'
    END as trigger_status;

-- 4. Show the function source to verify it has the organization-based logic
SELECT 'Function source (first 500 chars):' as info;

SELECT 
    LEFT(prosrc, 500) as function_source_preview
FROM pg_proc 
WHERE proname = 'validate_odometer_continuity_enhanced';

-- 5. Check if the function contains the organization-based validation
SELECT 'Organization validation check:' as info;

SELECT 
    CASE 
        WHEN prosrc LIKE '%organization_id%' 
        THEN '✅ Organization-based validation found'
        ELSE '❌ Organization-based validation missing'
    END as validation_type
FROM pg_proc 
WHERE proname = 'validate_odometer_continuity_enhanced';
