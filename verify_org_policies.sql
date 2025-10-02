-- ============================================
-- VERIFICATION SCRIPT FOR ORGANIZATION-LEVEL POLICIES
-- ============================================
-- Run this AFTER applying the migration to verify everything is correct

-- 1. Check all policies are using organization_id pattern
SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN qual LIKE '%organization_id%' OR with_check LIKE '%organization_id%' THEN '✅ ORG-LEVEL'
    WHEN qual LIKE '%created_by%' OR with_check LIKE '%created_by%' THEN '❌ USER-LEVEL (created_by)'
    WHEN qual LIKE '%added_by%' OR with_check LIKE '%added_by%' THEN '❌ USER-LEVEL (added_by)'
    ELSE '⚠️ OTHER'
  END as policy_type
FROM pg_policies
WHERE tablename IN ('trips', 'destinations', 'warehouses', 'drivers', 'vehicles', 'organization_users')
ORDER BY tablename, policyname;

-- 2. Count policies per table (should be 4 for most tables)
SELECT
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename IN ('trips', 'destinations', 'warehouses', 'drivers', 'vehicles', 'organization_users')
GROUP BY tablename
ORDER BY tablename;

-- 3. Check for any remaining user-level policies (should be ZERO)
SELECT
  tablename,
  policyname,
  'WARNING: Still using user-level isolation!' as issue
FROM pg_policies
WHERE tablename IN ('trips', 'destinations', 'warehouses', 'drivers', 'vehicles')
  AND (qual LIKE '%created_by%' OR qual LIKE '%added_by%' OR with_check LIKE '%created_by%' OR with_check LIKE '%added_by%')
ORDER BY tablename;

-- 4. Verify DELETE policies have role restrictions
SELECT
  tablename,
  policyname,
  CASE
    WHEN cmd = 'DELETE' AND (qual LIKE '%role%' OR qual LIKE '%owner%' OR qual LIKE '%admin%')
      THEN '✅ HAS ROLE CHECK'
    WHEN cmd = 'DELETE'
      THEN '❌ NO ROLE CHECK - ANYONE CAN DELETE!'
    ELSE 'N/A'
  END as delete_security
FROM pg_policies
WHERE tablename IN ('trips', 'destinations', 'warehouses', 'drivers', 'vehicles')
  AND cmd = 'DELETE'
ORDER BY tablename;

-- 5. Check organization_users is non-recursive
SELECT
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%user_id = auth.uid()%' THEN '✅ NON-RECURSIVE'
    WHEN qual LIKE '%organization_id%' THEN '❌ RECURSIVE - WILL CAUSE ISSUES!'
    ELSE '⚠️ CHECK MANUALLY'
  END as recursion_check
FROM pg_policies
WHERE tablename = 'organization_users'
ORDER BY policyname;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Query 1: All policies should show "✅ ORG-LEVEL" except organization_users
-- Query 2: Each table should have 4 policies (select, insert, update, delete), organization_users should have 1
-- Query 3: Should return ZERO rows
-- Query 4: All should show "✅ HAS ROLE CHECK"
-- Query 5: Should show "✅ NON-RECURSIVE"
