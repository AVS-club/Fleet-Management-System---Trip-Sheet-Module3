-- Simple test for activity logs without profiles table dependency
-- This query should work with your existing database structure

-- Test the combined_activity_logs view
SELECT 
    log_type,
    action_type,
    user_name,
    description,
    timestamp
FROM combined_activity_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Test inserting a sample user activity log
DO $$
DECLARE
    test_user_id UUID;
    log_id UUID;
BEGIN
    -- Get a test user ID from auth.users
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

-- Test inserting a sample vehicle activity log
DO $$
DECLARE
    test_vehicle_id UUID;
    log_id UUID;
BEGIN
    -- Get a test vehicle ID from vehicles table
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

-- Show the results
SELECT 
    'Total combined logs' as metric,
    COUNT(*) as count
FROM combined_activity_logs
UNION ALL
SELECT 
    'Vehicle logs' as metric,
    COUNT(*) as count
FROM vehicle_activity_log
UNION ALL
SELECT 
    'User logs' as metric,
    COUNT(*) as count
FROM user_activity_log;
