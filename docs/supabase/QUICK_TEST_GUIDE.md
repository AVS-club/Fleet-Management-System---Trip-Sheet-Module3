# Quick Data Leakage Testing Guide

> **📌 Purpose:** Quick reference for running data leakage tests with your actual organization UUIDs.

---

## 🔑 Your Organization UUIDs

| Org # | UUID | Name |
|-------|------|------|
| **Org 1** | `e2c41d39-9776-463a-b756-21b582ea1bdb` | (Check organizations table) |
| **Org 2** | `931e4479-b6de-46f7-86a4-66c2a9d4432f` | (Check organizations table) |
| **Org 3** | `379cbd2e-02ac-4ca2-a612-9fecc456b9a0` | (Check organizations table) |
| **Org 4** | `ab6c2178-32f9-4a03-b5ab-d535db827a58` | (Check organizations table) |

---

## 🚀 Quick Start Testing

### Step 1: Identify Your Organization (2 minutes)

Open Supabase SQL Editor and run:

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

**Remember your org number for tests below!**

---

### Step 2: Basic Isolation Test (2 minutes)

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
FROM maintenance_tasks;
```

**Expected:** You see only your organization's data counts.

---

### Step 3: Cross-Org Access Test (5 minutes)

#### Test A: Try to View Another Org's Data

```sql
-- Replace with a UUID from a DIFFERENT organization than yours
-- Pick one: e2c41d39-9776-463a-b756-21b582ea1bdb
--           931e4479-b6de-46f7-86a4-66c2a9d4432f
--           379cbd2e-02ac-4ca2-a612-9fecc456b9a0
--           ab6c2178-32f9-4a03-b5ab-d535db827a58

SELECT
  v.id,
  v.registration_number,
  v.organization_id,
  o.name as organization_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
WHERE v.organization_id = 'paste-different-org-uuid-here';
```

**Expected:** Empty result (0 rows) - RLS blocks access to other org's data!

---

#### Test B: Try to Access Specific Vehicle from Another Org

```sql
-- Step 1: Get a vehicle ID from any org
SELECT
  v.id,
  v.registration_number,
  v.organization_id,
  o.name as org_name
FROM vehicles v
JOIN organizations o ON v.organization_id = o.id
LIMIT 10;

-- Step 2: Pick a vehicle from a DIFFERENT org and try to access it
SELECT *
FROM vehicles
WHERE id = 'paste-vehicle-id-from-different-org-here';
```

**Expected:**
- If same org: Shows vehicle details ✅
- If different org: Empty result (RLS blocked) ✅

---

### Step 4: Data Integrity Check (3 minutes)

```sql
-- Check for cross-org references (should be 0!)
SELECT
  t.id as trip_id,
  t.organization_id as trip_org,
  v.organization_id as vehicle_org,
  'CROSS-ORG REFERENCE!' as error
FROM trips t
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.organization_id != v.organization_id;
```

**Expected:** Empty result (0 rows) - No cross-org references!

---

### Step 5: Check for Orphaned Records (2 minutes)

```sql
-- Find records without organization_id (should be 0 after migration!)
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
WHERE organization_id IS NULL;
```

**Expected:** All counts = 0 (no orphaned records!)

---

## ✅ Pass/Fail Criteria

### ✅ PASS if:
- [ ] You can only see your organization's data
- [ ] Querying other org's UUID returns empty results
- [ ] Accessing other org's specific IDs returns empty results
- [ ] No cross-org foreign key references exist
- [ ] No NULL organization_id values exist

### ❌ FAIL if:
- [ ] You can see data from other organizations
- [ ] Cross-org references found
- [ ] NULL organization_id values found
- [ ] Can access/modify other org's records

**If ANY test fails → DO NOT use in production! Fix isolation first!**

---

## 🔧 Advanced Testing

### Test Multi-User Isolation (10 minutes)

**Requirements:** Access to 2+ user accounts from different orgs

1. **Login as User A** (from Org 1)
   - Run Step 2 queries above
   - Note the counts
   - Try Step 3 with Org 2 UUID

2. **Login as User B** (from Org 2)
   - Run Step 2 queries again
   - Note the counts
   - **Counts should be COMPLETELY DIFFERENT**

3. **Compare Results:**
   - User A sees ONLY Org 1 data
   - User B sees ONLY Org 2 data
   - NO OVERLAP!

---

## 🚨 If Data Leakage Detected

### Immediate Actions:

1. **Stop using the system** for production data
2. **Document what you found:**
   ```sql
   -- Save the problematic query
   -- Save the results that shouldn't be visible
   ```
3. **Check which table is leaking:**
   - Run TEST 1 from DATA_LEAKAGE_TEST_QUERIES.sql
   - Identify tables without organization_id
4. **Run the migration:**
   - Use `supabase/migrations/99999999999999_add_organization_id_to_all_tables.sql`
5. **Retest everything**

---

## 📊 Quick Organization Data Summary

```sql
-- See data distribution across all organizations
SELECT
  o.name as organization_name,
  o.id as organization_id,
  (SELECT COUNT(*) FROM vehicles WHERE organization_id = o.id) as vehicles,
  (SELECT COUNT(*) FROM drivers WHERE organization_id = o.id) as drivers,
  (SELECT COUNT(*) FROM trips WHERE organization_id = o.id) as trips,
  (SELECT COUNT(*) FROM maintenance_tasks WHERE organization_id = o.id) as maintenance_tasks
FROM organizations o
WHERE o.active = true
ORDER BY o.name;
```

**When logged in as User A:** You should only see Org A's row!

---

## 📝 Testing Checklist

Before going to production:

- [ ] Identified my organization
- [ ] Verified I can only see my org's data
- [ ] Tested cross-org access (blocked ✅)
- [ ] Checked data integrity (no cross-org refs ✅)
- [ ] Verified no orphaned records (no NULL org_id ✅)
- [ ] Tested with multiple users from different orgs
- [ ] All tests passed ✅

---

## 🎯 Next Steps

### After Testing:

1. **If ALL tests pass:**
   - ✅ Your isolation is working
   - ✅ Safe to use in production
   - ✅ Document test results

2. **If ANY test fails:**
   - ⚠️ Run full migration from MIGRATION_GUIDE.md
   - ⚠️ Fix RLS policies
   - ⚠️ Retest thoroughly
   - ⚠️ Do NOT go to production until fixed

---

**Quick Reference:** [DATA_LEAKAGE_TEST_QUERIES.sql](./DATA_LEAKAGE_TEST_QUERIES.sql) - Complete test suite

**Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Full migration instructions

**Analysis:** [ORGANIZATION_ISOLATION_ANALYSIS.md](./ORGANIZATION_ISOLATION_ANALYSIS.md) - Detailed analysis
