-- Test the activity log system
-- This migration tests the basic functionality of the activity log system

-- Test inserting a user activity log
DO $$
DECLARE
    test_user_id UUID;
    log_id UUID;
BEGIN
    -- Get a test user ID (use the first user from auth.users)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test user activity logging
        SELECT log_user_activity(
            test_user_id,
            'LOGIN',
            'auth',
            'login',
            '{"test": true}'::jsonb,
            '127.0.0.1'::inet,
            'Mozilla/5.0 (Test Browser)',
            'Desktop',
            'Test Location'
        ) INTO log_id;
        
        RAISE NOTICE 'User activity log created with ID: %', log_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;

-- Test inserting a vehicle activity log (if vehicles table exists)
DO $$
DECLARE
    test_vehicle_id UUID;
    log_id UUID;
BEGIN
    -- Get a test vehicle ID (use the first vehicle from vehicles table)
    SELECT id INTO test_vehicle_id FROM vehicles LIMIT 1;
    
    IF test_vehicle_id IS NOT NULL THEN
        -- Test vehicle activity logging
        SELECT log_vehicle_activity(
            test_vehicle_id,
            'UPDATED',
            'Test User',
            'Test vehicle update',
            '{"test": true}'::jsonb,
            '127.0.0.1'::inet,
            'Mozilla/5.0 (Test Browser)',
            'Desktop',
            'Test Location'
        ) INTO log_id;
        
        RAISE NOTICE 'Vehicle activity log created with ID: %', log_id;
    ELSE
        RAISE NOTICE 'No vehicles found in vehicles table';
    END IF;
END $$;

-- Test the combined view
SELECT COUNT(*) as total_combined_logs FROM combined_activity_logs;

-- Test analytics function
SELECT get_activity_log_analytics() as analytics_data;

-- Show sample data
SELECT 
    log_type,
    action_type,
    user_name,
    description,
    timestamp
FROM combined_activity_logs 
ORDER BY timestamp DESC 
LIMIT 5;
