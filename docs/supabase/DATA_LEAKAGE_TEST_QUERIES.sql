-- ================================================================
-- DATA LEAKAGE TEST QUERIES
-- ================================================================
-- Purpose: Test if data from one organization can be accessed by another
-- Date: 2025-11-03
-- IMPORTANT: Run these queries as different users to verify isolation!
-- ================================================================

-- ================================================================
-- PREREQUISITE: Verify Test Setup
-- ================================================================

-- ⚠️ YOUR ORGANIZATION UUIDs (from actual database):
-- Org 1: e2c41d39-9776-463a-b756-21b582ea1bdb
-- Org 2: 931e4479-b6de-46f7-86a4-66c2a9d4432f
-- Org 3: 379cbd2e-02ac-4ca2-a612-9fecc456b9a0
-- Org 4: ab6c2178-32f9-4a03-b5ab-d535db827a58

-- 1. Check how many organizations exist
SELECT
  id,
  name,
  login_username,
  active
FROM organizations
ORDER BY name;

-- Expected: You should see 4 organizations
-- Verify the UUIDs match the ones listed above

-- 2. Check organization_users mapping
SELECT
  ou.user_id,
  u.email,
  ou.organization_id,
  o.name as organization_name,
  ou.role
FROM organization_users ou
JOIN auth.users u ON ou.user_id = u.id
JOIN organizations o ON ou.organization_id = o.id
ORDER BY o.name, u.email;

-- Expected: Each user should belong to one (or more) organizations

-- 3. Identify which organization YOU belong to (run as current user)
SELECT
  auth.uid() as my_user_id,
  ou.organization_id as my_organization_id,
  o.name as my_organization_name,
  ou.role as my_role,
  CASE
    WHEN ou.organization_id = 'e2c41d39-9776-463a-b756-21b582ea1bdb' THEN 'Organization 1'
    WHEN ou.organization_id = '931e4479-b6de-46f7-86a4-66c2a9d4432f' THEN 'Organization 2'
    WHEN ou.organization_id = '379cbd2e-02ac-4ca2-a612-9fecc456b9a0' THEN 'Organization 3'
    WHEN ou.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58' THEN 'Organization 4'
    ELSE 'Unknown Organization'
  END as org_identifier
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid();

-- ⚠️ IMPORTANT: Remember your organization number for tests below!

-- ================================================================
-- TEST 1: Check Tables WITHOUT organization_id (CRITICAL!)
-- ================================================================

-- List all tables that DON'T have organization_id column
SELECT DISTINCT
  t.table_name,
  'MISSING organization_id - DATA LEAKAGE RISK!' as status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_name = t.table_name
      AND c.column_name = 'organization_id'
  )
ORDER BY t.table_name;

-- Expected after migration: Empty result set
-- If tables show up here, they need organization_id added!

-- ================================================================
-- TEST 2: Cross-Organization Data Access Test
-- ================================================================

-- Instructions:
-- 1. Login as User A from Organization 1
-- 2. Run the queries below
-- 3. Login as User B from Organization 2
-- 4. Run the same queries again
-- 5. Compare results - they should be COMPLETELY DIFFERENT

-- ----------------------------------------------------------------
-- Test 2.1: Vehicles
-- ----------------------------------------------------------------
-- Query: Show current user's organization(s)
SELECT DISTINCT
  o.id,
  o.name as organization_name,
  current_user as database_user,
  auth.uid() as authenticated_user_id
FROM organizations o
JOIN organization_users ou ON o.id = ou.organization_id
WHERE ou.user_id = auth.uid();

-- Query: Count vehicles visible to current user
SELECT
  COUNT(*) as vehicle_count,
  auth.uid() as user_id
FROM vehicles;

-- Query: List vehicles with organization info
SELECT
  v.id,
  v.registration_number,
  v.make,
  v.model,
  v.organization_id,
  o.name as organization_name
FROM vehicles v
LEFT JOIN organizations o ON v.organization_id = o.id
ORDER BY v.registration_number
LIMIT 10;

-- ⚠️ EXPECTED RESULT:
-- User A should see ONLY Organization 1 vehicles
-- User B should see ONLY Organization 2 vehicles
-- NO OVERLAP!

-- ----------------------------------------------------------------
-- Test 2.2: Drivers
-- ----------------------------------------------------------------
SELECT
  COUNT(*) as driver_count,
  auth.uid() as user_id
FROM drivers;

SELECT
  d.id,
  d.name,
  d.license_number,
  d.organization_id,
  o.name as organization_name
FROM drivers d
LEFT JOIN organizations o ON d.organization_id = o.id
ORDER BY d.name
LIMIT 10;

-- ⚠️ EXPECTED: User A sees only Org 1 drivers, User B sees only Org 2 drivers

-- ----------------------------------------------------------------
-- Test 2.3: Trips
-- ----------------------------------------------------------------
SELECT
  COUNT(*) as trip_count,
  auth.uid() as user_id
FROM trips;

SELECT
  t.id,
  t.trip_serial_number,
  t.organization_id,
  o.name as organization_name,
  v.registration_number as vehicle
FROM trips t
LEFT JOIN organizations o ON t.organization_id = o.id
LEFT JOIN vehicles v ON t.vehicle_id = v.id
ORDER BY t.created_at DESC
LIMIT 10;

-- ⚠️ EXPECTED: User A sees only Org 1 trips, User B sees only Org 2 trips

-- ----------------------------------------------------------------
-- Test 2.4: Maintenance Tasks (HIGH PRIORITY!)
-- ----------------------------------------------------------------
SELECT
  COUNT(*) as maintenance_count,
  auth.uid() as user_id
FROM maintenance_tasks;

SELECT
  mt.id,
  mt.title,
  mt.task_type,
  mt.organization_id,
  o.name as organization_name,
  v.registration_number as vehicle
FROM maintenance_tasks mt
LEFT JOIN organizations o ON mt.organization_id = o.id
LEFT JOIN vehicles v ON mt.vehicle_id = v.id
ORDER BY mt.created_at DESC
LIMIT 10;

-- ⚠️ CRITICAL: This table had NO organization_id before!
-- After migration, User A should see ONLY Org 1 maintenance
-- User B should see ONLY Org 2 maintenance

-- ----------------------------------------------------------------
-- Test 2.5: AI Alerts
-- ----------------------------------------------------------------
SELECT
  COUNT(*) as alert_count,
  auth.uid() as user_id
FROM ai_alerts;

SELECT
  aa.id,
  aa.alert_type,
  aa.title,
  aa.severity,
  aa.organization_id,
  o.name as organization_name
FROM ai_alerts aa
LEFT JOIN organizations o ON aa.organization_id = o.id
ORDER BY aa.created_at DESC
LIMIT 10;

-- ⚠️ CRITICAL: Alerts must NEVER leak to other organizations!

-- ================================================================
-- TEST 3: Foreign Key Integrity Check
-- ================================================================

-- Check if any records reference entities from different organizations

-- Test 3.1: Trips referencing vehicles from different org
SELECT
  t.id as trip_id,
  t.organization_id as trip_org,
  v.id as vehicle_id,
  v.organization_id as vehicle_org,
  'CROSS-ORG REFERENCE - DATA CORRUPTION!' as error
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.organization_id != v.organization_id;

-- ⚠️ EXPECTED: Empty result set
-- If rows appear, there's data corruption!

-- Test 3.2: Trips referencing drivers from different org
SELECT
  t.id as trip_id,
  t.organization_id as trip_org,
  d.id as driver_id,
  d.organization_id as driver_org,
  'CROSS-ORG REFERENCE - DATA CORRUPTION!' as error
FROM trips t
JOIN drivers d ON t.driver_id = d.id
WHERE t.organization_id != d.organization_id;

-- ⚠️ EXPECTED: Empty result set

-- Test 3.3: Maintenance tasks referencing vehicles from different org
SELECT
  mt.id as maintenance_task_id,
  mt.organization_id as task_org,
  v.id as vehicle_id,
  v.organization_id as vehicle_org,
  'CROSS-ORG REFERENCE - DATA CORRUPTION!' as error
FROM maintenance_tasks mt
JOIN vehicles v ON mt.vehicle_id = v.id
WHERE mt.organization_id != v.organization_id;

-- ⚠️ EXPECTED: Empty result set

-- ================================================================
-- TEST 4: RLS Policy Verification
-- ================================================================

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ⚠️ EXPECTED: rls_enabled = true for all sensitive tables

-- Check RLS policies exist for organization isolation
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%organization_id%'
    OR with_check LIKE '%organization_id%'
  )
ORDER BY tablename, policyname;

-- ⚠️ EXPECTED: Every table should have SELECT, INSERT, UPDATE, DELETE policies
-- using organization_id for filtering

-- ================================================================
-- TEST 5: Specific Data Leakage Scenarios
-- ================================================================

-- Test 5.1: Try to access another org's vehicle by ID
-- Instructions:
-- 1. First, get a vehicle ID from a DIFFERENT organization:
SELECT
  v.id,
  v.registration_number,
  v.organization_id,
  o.name as org_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
LIMIT 5;

-- 2. Then try to access a vehicle from a different org (copy actual ID from above)
SELECT *
FROM vehicles
WHERE id = 'paste-vehicle-id-from-different-org-here'; -- Replace with actual ID

-- ⚠️ EXPECTED when run as User A from Org A: Empty result or permission denied
-- RLS should prevent access to Org B's vehicle

-- Test 5.2: Try to update another org's driver
-- Instructions:
-- 1. First, get a driver ID from a DIFFERENT organization:
SELECT
  d.id,
  d.name,
  d.organization_id,
  o.name as org_name
FROM drivers d
JOIN organizations o ON d.organization_id = o.id
LIMIT 5;

-- 2. Then try to update a driver from a different org (copy actual ID from above)
UPDATE drivers
SET name = 'HACKED NAME'
WHERE id = 'paste-driver-id-from-different-org-here'; -- Replace with actual ID

-- ⚠️ EXPECTED: 0 rows affected (RLS blocks update)
-- Then verify no change occurred:
SELECT name FROM drivers WHERE id = 'paste-same-driver-id-here';

-- Test 5.3: Try to insert trip for another org's vehicle
-- Instructions:
-- 1. Get your current organization ID
SELECT organization_id
FROM organization_users
WHERE user_id = auth.uid();

-- 2. Get a vehicle from a DIFFERENT organization
SELECT
  v.id as vehicle_id,
  v.registration_number,
  v.organization_id as vehicle_org,
  o.name as vehicle_org_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
WHERE v.organization_id != (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1
)
LIMIT 1;

-- 3. Try to create a trip using that vehicle (should FAIL)
INSERT INTO trips (
  vehicle_id,
  organization_id,
  trip_serial_number,
  start_km
) VALUES (
  'paste-vehicle-id-from-different-org', -- Vehicle from Org B
  'paste-your-org-id-here',              -- Your Org ID
  'TEST-LEAK-001',
  1000
);

-- ⚠️ EXPECTED: Error or policy violation
-- Should not allow creating trip for another org's vehicle
-- Either RLS blocks it OR foreign key constraint prevents cross-org reference

-- ================================================================
-- TEST 6: Orphaned Records Check
-- ================================================================

-- Find records with NULL organization_id (should be none after migration)
SELECT
  'vehicles' as table_name,
  COUNT(*) as null_org_count
FROM vehicles
WHERE organization_id IS NULL

UNION ALL

SELECT
  'drivers',
  COUNT(*)
FROM drivers
WHERE organization_id IS NULL

UNION ALL

SELECT
  'trips',
  COUNT(*)
FROM trips
WHERE organization_id IS NULL

UNION ALL

SELECT
  'maintenance_tasks',
  COUNT(*)
FROM maintenance_tasks
WHERE organization_id IS NULL

UNION ALL

SELECT
  'ai_alerts',
  COUNT(*)
FROM ai_alerts
WHERE organization_id IS NULL;

-- ⚠️ EXPECTED: All counts should be 0
-- NULL organization_id means orphaned records!

-- ================================================================
-- TEST 7: Performance Check
-- ================================================================

-- Verify indexes exist on organization_id (for query performance)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%organization_id%'
ORDER BY tablename, indexname;

-- ⚠️ EXPECTED: Every table with organization_id should have an index

-- Check query plan uses index (should show "Index Scan" not "Seq Scan")
EXPLAIN ANALYZE
SELECT * FROM vehicles WHERE organization_id = (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1
);

-- ⚠️ EXPECTED: Query plan shows "Index Scan using idx_vehicles_org"

-- ================================================================
-- TEST 8: Activity Log Isolation
-- ================================================================

-- Check if activity logs are properly isolated
SELECT
  COUNT(*) as activity_count,
  auth.uid() as user_id
FROM activity_log;

SELECT
  al.id,
  al.entity_type,
  al.action_type,
  al.organization_id,
  o.name as organization_name
FROM activity_log al
LEFT JOIN organizations o ON al.organization_id = o.id
ORDER BY al.timestamp DESC
LIMIT 10;

-- ⚠️ EXPECTED: User A sees only Org A activities

-- ================================================================
-- TEST 9: Comprehensive Organization Isolation Report
-- ================================================================

-- Generate summary report of data per organization
SELECT
  o.name as organization_name,
  (SELECT COUNT(*) FROM vehicles WHERE organization_id = o.id) as vehicles,
  (SELECT COUNT(*) FROM drivers WHERE organization_id = o.id) as drivers,
  (SELECT COUNT(*) FROM trips WHERE organization_id = o.id) as trips,
  (SELECT COUNT(*) FROM maintenance_tasks WHERE organization_id = o.id) as maintenance_tasks,
  (SELECT COUNT(*) FROM ai_alerts WHERE organization_id = o.id) as alerts,
  (SELECT COUNT(*) FROM events_feed WHERE organization_id = o.id) as events
FROM organizations o
WHERE o.active = true
ORDER BY o.name;

-- ⚠️ EXPECTED: Each organization should have distinct counts
-- When logged in as User A, you should only see Org A's row

-- ================================================================
-- TEST 10: RLS Bypass Attempt (Security Test)
-- ================================================================

-- Try to bypass RLS with direct WHERE clause
-- (This SHOULD fail due to RLS policies)

-- Instructions:
-- 1. First see what organization you're in
SELECT
  o.id,
  o.name as your_organization
FROM organizations o
JOIN organization_users ou ON o.id = ou.organization_id
WHERE ou.user_id = auth.uid();

-- 2. Then try to query a DIFFERENT organization's data by filtering on organization_id
-- Replace with one of the other org UUIDs:
-- • e2c41d39-9776-463a-b756-21b582ea1bdb
-- • 931e4479-b6de-46f7-86a4-66c2a9d4432f
-- • 379cbd2e-02ac-4ca2-a612-9fecc456b9a0
-- • ab6c2178-32f9-4a03-b5ab-d535db827a58
SELECT
  v.id,
  v.registration_number,
  v.organization_id,
  o.name as organization_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
WHERE v.organization_id = 'paste-different-org-uuid-here'; -- Try to access different org

-- ⚠️ EXPECTED when run as User A from Org A:
-- Empty result set (RLS should still filter this even with explicit WHERE clause!)

-- ================================================================
-- SUMMARY & CHECKLIST
-- ================================================================

-- After running all tests, verify:
-- ☐ No tables missing organization_id
-- ☐ User A can only see Org A data
-- ☐ User B can only see Org B data
-- ☐ No cross-org foreign key references
-- ☐ All tables have RLS policies
-- ☐ No NULL organization_id values
-- ☐ Indexes exist on organization_id
-- ☐ Activity logs are isolated
-- ☐ Cannot bypass RLS with WHERE clauses
-- ☐ Cannot UPDATE/DELETE other org's data

-- If ANY test fails, DO NOT deploy to production!
-- Fix the issue and retest.

-- ================================================================
-- EMERGENCY: If Data Leakage Detected
-- ================================================================

-- 1. IMMEDIATELY disable public access:
-- ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS [policy_name] ON [table_name];

-- 2. Notify all users of potential breach
-- 3. Audit access logs
-- 4. Fix RLS policies
-- 5. Retest thoroughly
-- 6. Consider data breach reporting requirements

-- ================================================================
