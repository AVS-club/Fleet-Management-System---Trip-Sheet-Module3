# Post-Migration Verification Guide

**Date:** 2025-11-03
**Migration:** add_organization_id to all tables
**Status:** ✅ Migration executed successfully

---

## 🎯 Purpose

This guide will help you verify that the organization_id migration worked correctly and that your data is properly isolated between organizations.

---

## ⚡ Quick Verification (5 minutes)

Run these queries in Supabase SQL Editor to verify basic functionality:

### Step 1: Verify organization_id columns were added

```sql
-- Check which tables now have organization_id
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'organization_id'
  AND table_schema = 'public'
ORDER BY table_name;
```

**Expected Result:** Should show ~30+ tables with organization_id column

**What to look for:**
- All critical tables (maintenance_tasks, maintenance_entries, wear_parts, etc.) should appear
- data_type should be 'uuid'
- is_nullable should be 'NO' (NOT NULL)

---

### Step 2: Check for NULL organization_id values (orphaned records)

```sql
-- Find any records with NULL organization_id
SELECT
  'vehicles' as table_name,
  COUNT(*) as null_org_count
FROM vehicles
WHERE organization_id IS NULL

UNION ALL

SELECT 'drivers', COUNT(*)
FROM drivers
WHERE organization_id IS NULL

UNION ALL

SELECT 'trips', COUNT(*)
FROM trips
WHERE organization_id IS NULL

UNION ALL

SELECT 'maintenance_tasks', COUNT(*)
FROM maintenance_tasks
WHERE organization_id IS NULL

UNION ALL

SELECT 'maintenance_entries', COUNT(*)
FROM maintenance_entries
WHERE organization_id IS NULL

UNION ALL

SELECT 'wear_parts', COUNT(*)
FROM wear_parts
WHERE organization_id IS NULL

UNION ALL

SELECT 'ai_alerts', COUNT(*)
FROM ai_alerts
WHERE organization_id IS NULL;
```

**Expected Result:** All counts should be 0

**⚠️ If you see non-zero counts:**
- Some records couldn't be backfilled automatically
- Check the ORPHANED_RECORDS section below for resolution steps

---

### Step 3: Verify indexes were created

```sql
-- Check for organization_id indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%organization_id%'
ORDER BY tablename;
```

**Expected Result:** Should see indexes like:
- idx_maintenance_tasks_org
- idx_maintenance_entries_org
- idx_wear_parts_org
- idx_ai_alerts_org
- etc.

**What to look for:**
- Every table with organization_id should have an index
- Index names should follow pattern: `idx_[table_name]_org`

---

## 🔒 Data Isolation Tests (10 minutes)

Now verify that RLS policies are working correctly with the new organization_id columns.

### Step 4: Identify your organization

```sql
-- Which organization am I in?
SELECT
  auth.uid() as my_user_id,
  ou.organization_id as my_organization_id,
  o.name as my_organization_name,
  CASE
    WHEN ou.organization_id = 'e2c41d39-9776-463a-b756-21b582ea1bdb' THEN 'Organization 1'
    WHEN ou.organization_id = '931e4479-b6de-46f7-86a4-66c2a9d4432f' THEN 'Organization 2'
    WHEN ou.organization_id = '379cbd2e-02ac-4ca2-a612-9fecc456b9a0' THEN 'Organization 3'
    WHEN ou.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58' THEN 'Organization 4'
  END as org_number
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid();
```

**Write down your organization number** - you'll need it for the next tests!

---

### Step 5: Test basic isolation - count your data

```sql
-- Count your data (should only see YOUR org's data)
SELECT
  'Vehicles' as table_name,
  COUNT(*) as my_count
FROM vehicles

UNION ALL

SELECT 'Drivers', COUNT(*)
FROM drivers

UNION ALL

SELECT 'Trips', COUNT(*)
FROM trips

UNION ALL

SELECT 'Maintenance Tasks', COUNT(*)
FROM maintenance_tasks

UNION ALL

SELECT 'Maintenance Entries', COUNT(*)
FROM maintenance_entries

UNION ALL

SELECT 'Wear Parts', COUNT(*)
FROM wear_parts

UNION ALL

SELECT 'AI Alerts', COUNT(*)
FROM ai_alerts;
```

**Expected Result:** You should see counts for YOUR organization only

**Note these counts** - you'll compare them with other users later

---

### Step 6: Try to access another organization's data

**IMPORTANT:** Pick a UUID from a DIFFERENT organization than yours:
- Organization 1: `e2c41d39-9776-463a-b756-21b582ea1bdb`
- Organization 2: `931e4479-b6de-46f7-86a4-66c2a9d4432f`
- Organization 3: `379cbd2e-02ac-4ca2-a612-9fecc456b9a0`
- Organization 4: `ab6c2178-32f9-4a03-b5ab-d535db827a58`

```sql
-- Replace with a DIFFERENT org UUID than yours
SELECT
  v.id,
  v.registration_number,
  v.organization_id,
  o.name as organization_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
WHERE v.organization_id = 'PASTE-DIFFERENT-ORG-UUID-HERE';
```

**Expected Result:** Empty result (0 rows)

**✅ If empty:** RLS is working correctly - you cannot see other organization's data!

**❌ If you see rows:** RLS policies may need to be updated. See TROUBLESHOOTING section.

---

### Step 7: Check for cross-organization references

```sql
-- Check if any trips reference vehicles from different organizations
SELECT
  t.id as trip_id,
  t.organization_id as trip_org,
  v.organization_id as vehicle_org,
  'CROSS-ORG REFERENCE!' as error
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.organization_id != v.organization_id;
```

**Expected Result:** Empty result (0 rows)

**⚠️ If you see rows:**
- Data corruption exists
- Some trips reference vehicles from other organizations
- Need to run data cleanup (see TROUBLESHOOTING)

---

### Step 8: Verify maintenance entries isolation

```sql
-- Check maintenance_entries (was newly added with organization_id)
SELECT
  COUNT(*) as my_maintenance_entries,
  auth.uid() as my_user_id
FROM maintenance_entries;
```

**Expected Result:** You should see only YOUR organization's maintenance entries

```sql
-- Try to access another org's maintenance entries
SELECT
  me.id,
  me.vendor_name,
  me.organization_id,
  o.name as organization_name
FROM maintenance_entries me
JOIN organizations o ON me.organization_id = o.id
WHERE me.organization_id = 'PASTE-DIFFERENT-ORG-UUID-HERE';
```

**Expected Result:** Empty result (0 rows)

---

## ✅ Success Criteria

Your migration is successful if:

- [x] All tables have organization_id column
- [x] No NULL organization_id values exist (all counts = 0)
- [x] Indexes created on all organization_id columns
- [x] You can only see YOUR organization's data
- [x] Querying other org's UUID returns empty results
- [x] No cross-org foreign key references exist
- [x] maintenance_entries properly isolated

---

## 🚨 TROUBLESHOOTING

### Issue 1: Found NULL organization_id values

**Symptom:** Step 2 shows non-zero counts

**Cause:** Some records couldn't be backfilled automatically

**Solution:**

1. Identify which tables have orphaned records:
```sql
-- Get details of orphaned records
SELECT 'maintenance_tasks' as table_name, id, vehicle_id
FROM maintenance_tasks
WHERE organization_id IS NULL
LIMIT 10;
```

2. Check if related vehicle/driver exists:
```sql
-- For maintenance_tasks
SELECT mt.id, mt.vehicle_id, v.organization_id
FROM maintenance_tasks mt
LEFT JOIN vehicles v ON mt.vehicle_id = v.id
WHERE mt.organization_id IS NULL;
```

3. Manual backfill:
```sql
-- If vehicle exists, copy its organization_id
UPDATE maintenance_tasks mt
SET organization_id = v.organization_id
FROM vehicles v
WHERE mt.vehicle_id = v.id
  AND mt.organization_id IS NULL;
```

4. If no related entity exists, assign to default org:
```sql
-- Assign to Organization 1 (or your preferred default)
UPDATE maintenance_tasks
SET organization_id = 'e2c41d39-9776-463a-b756-21b582ea1bdb'
WHERE organization_id IS NULL;
```

---

### Issue 2: Can see other organization's data

**Symptom:** Step 6 returns rows from other organizations

**Cause:** RLS policies not working correctly

**Solution:**

1. Check if RLS is enabled:
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('vehicles', 'drivers', 'trips', 'maintenance_tasks')
ORDER BY tablename;
```

2. If rls_enabled = false:
```sql
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
-- Repeat for all sensitive tables
```

3. Check if policies exist:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'vehicles'
ORDER BY policyname;
```

4. If no policies exist, create them:
```sql
-- Example for vehicles table
CREATE POLICY "Users can view vehicles from their organization"
ON vehicles
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);

-- Repeat for INSERT, UPDATE, DELETE
```

---

### Issue 3: Cross-org references found

**Symptom:** Step 7 shows cross-organization references

**Cause:** Data was created before proper isolation

**Solution:**

1. Document the issues:
```sql
-- Save problematic records
CREATE TEMP TABLE cross_org_issues AS
SELECT
  t.id as trip_id,
  t.organization_id as trip_org,
  v.organization_id as vehicle_org,
  t.vehicle_id
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.organization_id != v.organization_id;

SELECT * FROM cross_org_issues;
```

2. Decide on resolution strategy:
   - **Option A:** Update trip to match vehicle's org (if trip belongs to vehicle's org)
   - **Option B:** Delete invalid trips (if they're test data)
   - **Option C:** Reassign vehicle to trip's org (rare case)

3. Implement fix (example for Option A):
```sql
-- Update trips to match their vehicle's organization
UPDATE trips t
SET organization_id = v.organization_id
FROM vehicles v
WHERE t.vehicle_id = v.id
  AND t.organization_id != v.organization_id;
```

4. Verify fix:
```sql
-- Should return 0 rows now
SELECT COUNT(*) FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.organization_id != v.organization_id;
```

---

### Issue 4: Missing indexes

**Symptom:** Step 3 shows fewer indexes than expected

**Cause:** Index creation failed or was skipped

**Solution:**

```sql
-- Create missing indexes manually
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_org ON maintenance_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_entries_org ON maintenance_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_wear_parts_org ON wear_parts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_org ON ai_alerts(organization_id);
-- Add more as needed
```

---

## 📊 Multi-User Testing (Optional but Recommended)

If you have access to multiple user accounts:

1. **Login as User A** (from Organization 1)
   - Run Step 5 - note the counts
   - Run Step 6 with Org 2 UUID - should be empty

2. **Login as User B** (from Organization 2)
   - Run Step 5 - note the counts
   - Counts should be DIFFERENT from User A
   - Run Step 6 with Org 1 UUID - should be empty

3. **Verify complete isolation:**
   - User A and User B see completely different data
   - No overlap in vehicles, drivers, trips, etc.

---

## 📝 Test Results Template

Copy this template and fill it out:

```
=== POST-MIGRATION VERIFICATION RESULTS ===
Date: 2025-11-03
Tested by: [Your name]
Organization: [Your org name/number]

STEP 1 - organization_id columns added:
[ ] PASS - All tables have organization_id
[ ] FAIL - Missing from: _______________

STEP 2 - No orphaned records:
[ ] PASS - All counts = 0
[ ] FAIL - Found NULL in: _______________

STEP 3 - Indexes created:
[ ] PASS - All indexes exist
[ ] FAIL - Missing indexes: _______________

STEP 4 - Organization identified:
My organization: _______________
My org UUID: _______________

STEP 5 - Data counts:
Vehicles: _____
Drivers: _____
Trips: _____
Maintenance Tasks: _____
Maintenance Entries: _____
Wear Parts: _____
AI Alerts: _____

STEP 6 - Cross-org access blocked:
[ ] PASS - Cannot see other org's data
[ ] FAIL - Can see: _______________

STEP 7 - No cross-org references:
[ ] PASS - No cross-org references
[ ] FAIL - Found references in: _______________

STEP 8 - Maintenance entries isolated:
[ ] PASS - Only see my org's entries
[ ] FAIL - Details: _______________

OVERALL RESULT:
[ ] ✅ ALL TESTS PASSED - Migration successful!
[ ] ⚠️ SOME ISSUES - See troubleshooting
[ ] ❌ CRITICAL ISSUES - Do not use in production
```

---

## 🎯 Next Steps

### If all tests passed:
1. ✅ Migration is successful
2. ✅ Data is properly isolated
3. ✅ Safe to continue using the system
4. ✅ Document your test results
5. ✅ Monitor for any issues over the next few days

### If some tests failed:
1. ⚠️ Follow troubleshooting steps above
2. ⚠️ Re-run tests after fixes
3. ⚠️ Do not add new data until issues resolved

### If critical issues found:
1. ❌ Stop using the system for production data
2. ❌ Contact support or DBA
3. ❌ Consider rollback if data corruption is severe
4. ❌ Review migration logs for errors

---

## 📞 Support Resources

- **Quick Test Guide:** [QUICK_TEST_GUIDE.md](./QUICK_TEST_GUIDE.md)
- **Full Test Suite:** [DATA_LEAKAGE_TEST_QUERIES.sql](./DATA_LEAKAGE_TEST_QUERIES.sql)
- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Schema Reference:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

**Important:** Keep this verification document for your records. It proves that you've tested data isolation after migration.
