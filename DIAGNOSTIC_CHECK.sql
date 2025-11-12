-- ================================================================
-- DIAGNOSTIC CHECK FOR MAINTENANCE MODULE
-- ================================================================
-- Run this to verify your database schema is correct
-- Look for ❌ marks which indicate issues that need fixing
-- ================================================================

\echo '=================================================='
\echo 'DIAGNOSTIC CHECK: Maintenance Module Database'
\echo '=================================================='
\echo ''

-- Check 1: Verify maintenance_service_tasks columns
\echo '📋 CHECK 1: maintenance_service_tasks columns'
\echo '----------------------------------------------'

SELECT
  CASE
    WHEN COUNT(*) = 11 THEN '✅ All expected columns exist'
    ELSE '❌ Missing columns - expected 11, found ' || COUNT(*)::text
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND column_name IN (
    'id', 'maintenance_task_id', 'vendor_id', 'tasks', 'cost',
    'service_type', 'notes', 'battery_data', 'tyre_data', 'parts_data',
    'bill_url'
  );

-- Show all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
ORDER BY ordinal_position;

\echo ''

-- Check 2: Verify NO battery_tracking or tyre_tracking columns exist
\echo '📋 CHECK 2: Verify old tracking columns removed'
\echo '----------------------------------------------'

SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No invalid tracking columns found'
    ELSE '❌ Found ' || COUNT(*)::text || ' invalid columns that should be removed'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND column_name IN ('battery_tracking', 'tyre_tracking');

-- Show if any exist
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND column_name IN ('battery_tracking', 'tyre_tracking');

\echo ''

-- Check 3: Verify maintenance_tasks_catalog exists
\echo '📋 CHECK 3: Maintenance tasks catalog'
\echo '----------------------------------------------'

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_tasks_catalog')
    THEN '✅ maintenance_tasks_catalog table exists'
    ELSE '❌ maintenance_tasks_catalog table MISSING'
  END as status;

-- Count tasks in catalog
SELECT
  COUNT(*) as total_tasks,
  COUNT(DISTINCT organization_id) as organizations,
  COUNT(DISTINCT task_category) as categories
FROM public.maintenance_tasks_catalog;

\echo ''

-- Check 4: Verify maintenance_vendors columns
\echo '📋 CHECK 4: Maintenance vendors table'
\echo '----------------------------------------------'

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'maintenance_vendors'
        AND column_name = 'active'
    )
    THEN '✅ maintenance_vendors has active column'
    ELSE '❌ maintenance_vendors MISSING active column'
  END as status;

-- Show vendor columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_vendors'
ORDER BY ordinal_position;

\echo ''

-- Check 5: Verify storage buckets
\echo '📋 CHECK 5: Storage buckets'
\echo '----------------------------------------------'

SELECT
  id as bucket_name,
  public,
  CASE WHEN public THEN '❌ Should be PRIVATE' ELSE '✅ Correctly set to private' END as security_status
FROM storage.buckets
WHERE id IN ('maintenance-bills', 'battery-warranties', 'tyre-warranties', 'part-warranties')
ORDER BY id;

SELECT
  CASE
    WHEN COUNT(*) = 4 THEN '✅ All 4 storage buckets exist'
    ELSE '❌ Missing buckets - expected 4, found ' || COUNT(*)::text
  END as status
FROM storage.buckets
WHERE id IN ('maintenance-bills', 'battery-warranties', 'tyre-warranties', 'part-warranties');

\echo ''

-- Check 6: Verify RLS policies on storage
\echo '📋 CHECK 6: Storage RLS policies'
\echo '----------------------------------------------'

SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 16 THEN '✅ Storage RLS policies exist (minimum 16 expected)'
    ELSE '❌ Missing RLS policies - found ' || COUNT(*)::text || ', expected at least 16'
  END as status
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (policyname LIKE '%maintenance%' OR policyname LIKE '%warranty%');

\echo ''

-- Check 7: Sample data test
\echo '📋 CHECK 7: Sample data integrity'
\echo '----------------------------------------------'

SELECT
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN service_groups IS NOT NULL THEN 1 END) as tasks_with_service_groups,
  COUNT(CASE WHEN service_groups IS NULL THEN 1 END) as tasks_without_service_groups
FROM public.maintenance_tasks;

SELECT
  COUNT(*) as total_service_groups,
  COUNT(CASE WHEN vendor_id IS NOT NULL AND vendor_id != '' THEN 1 END) as groups_with_vendor,
  COUNT(CASE WHEN tasks IS NOT NULL AND array_length(tasks, 1) > 0 THEN 1 END) as groups_with_tasks
FROM public.maintenance_service_tasks;

\echo ''
\echo '=================================================='
\echo 'DIAGNOSTIC COMPLETE'
\echo '=================================================='
\echo ''
\echo 'ACTION ITEMS:'
\echo '- If you see any ❌ marks above, run FIX_ALL_MAINTENANCE_ISSUES.sql'
\echo '- After fixes, refresh your browser with Ctrl+Shift+R'
\echo '- Check that frontend code does NOT reference battery_tracking or tyre_tracking'
\echo '=================================================='
