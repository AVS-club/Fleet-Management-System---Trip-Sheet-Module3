-- =====================================================
-- DIAGNOSTIC QUERY: Check maintenance_service_tasks table structure
-- Run this in Supabase SQL Editor to diagnose the issue
-- =====================================================

-- 1. Check if the column exists and its definition
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND column_name = 'maintenance_task_id'
ORDER BY ordinal_position;

-- 2. Check all columns in the table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
ORDER BY ordinal_position;

-- 3. Check for any triggers that might modify the data
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'maintenance_service_tasks';

-- 4. Check RLS policies (these shouldn't affect INSERT but worth checking)
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'maintenance_service_tasks';

-- 5. Check constraints on the table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.maintenance_service_tasks'::regclass;

-- 6. Try a test insert to see what happens (use a test task ID)
-- Replace 'YOUR_TEST_TASK_ID' with an actual maintenance_tasks.id
/*
INSERT INTO public.maintenance_service_tasks (
    maintenance_task_id,
    vendor_id,
    service_cost,
    service_type,
    organization_id,
    tasks,
    notes,
    bill_url,
    battery_warranty_url,
    tyre_warranty_url
) VALUES (
    'YOUR_TEST_TASK_ID'::uuid,  -- Replace with actual ID
    '953f941d-aca2-459e-9867-a3541f6b624b'::uuid,
    1000,
    'both',
    'ab6c2178-32f9-4a03-b5ab-d535db827a58'::uuid,
    ARRAY[]::text[],
    '',
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[]
) RETURNING *;
*/

