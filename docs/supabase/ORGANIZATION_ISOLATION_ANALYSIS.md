# Organization Isolation Analysis

> **📌 Critical Issue:** Verify that all tables have proper organization isolation to prevent data leakage between different companies.

---

## 🚨 Analysis of Your Actual Schema

Based on the schema you provided, here's the **organization_id** status for each table:

---

## ✅ Tables WITH organization_id (Properly Isolated)

### Core Fleet Management
1. ✅ **vehicles** - Has `organization_id`
2. ✅ **drivers** - Has `organization_id`
3. ✅ **trips** - Has `organization_id`
4. ✅ **destinations** - Has `organization_id`
5. ✅ **warehouses** - Has `organization_id`
6. ✅ **fuel_stations** - Has `organization_id`
7. ✅ **material_types** - Has `organization_id`

### Maintenance System
8. ✅ **maintenance_entries** - Has `organization_id`
9. ✅ **wear_parts** - Has `organization_id`
10. ✅ **maintenance_vendors** - Has `organization_id`
11. ✅ **maintenance_schedules** - Has `organization_id`
12. ✅ **admin_insurers** - Has `organization_id`
13. ✅ **admin_vendors** - Has `organization_id`

### Activity & Events
14. ✅ **events_feed** - Has `organization_id`
15. ✅ **kpi_cards** - Has `organization_id`

---

## ⚠️ Tables WITHOUT organization_id (POTENTIAL DATA LEAKAGE RISK!)

### User-Specific Tables (Using user_id instead)
16. ❌ **ai_alerts** - Has `user_id` only (NO organization_id)
17. ❌ **alert_settings** - Has `user_id` only
18. ❌ **alert_thresholds** - Has `user_id` only
19. ❌ **document_settings** - Has `user_id` only
20. ❌ **driver_ranking_settings** - Has `user_id` only
21. ❌ **global_settings** - Has `user_id` only

### Tracking Tables (Using created_by/added_by only)
22. ❌ **maintenance_tasks** - Has `added_by`, `created_by` (NO organization_id)
23. ❌ **maintenance_service_tasks** - No organization field at all
24. ❌ **maintenance_audit_logs** - No organization field at all
25. ❌ **maintenance_tasks_catalog** - Has `created_by` only
26. ❌ **vehicle_activity_log** - No organization field at all
27. ❌ **activity_log** - Has `action_by` only
28. ❌ **activity_logs** - Likely no organization_id
29. ❌ **audit_trail** - Has `created_by` only

### Reference/Master Data
30. ❌ **reminder_tracking** - Has `added_by` only
31. ❌ **reminder_templates** - Has `added_by`, `created_by` only
32. ❌ **reminder_contacts** - Has `added_by`, `created_by` only
33. ❌ **vehicle_configurations** - Has `created_by` only
34. ❌ **message_templates** - Has `created_by` only

### Performance & Corrections
35. ❌ **driver_vehicle_performance** - No organization field at all
36. ❌ **trip_corrections** - Has `corrected_by` only
37. ❌ **fuel_efficiency_baselines** - Has `created_by` only
38. ❌ **generated_reports** - Unknown structure

---

## 🔥 Critical Problem

### Current Isolation Method
Your database uses **TWO different methods** for data isolation:

1. **Method 1: organization_id** (Proper multi-tenancy)
   - Tables: vehicles, drivers, trips, etc.
   - ✅ Clean, clear isolation

2. **Method 2: user_id / created_by** (Relies on user-to-org mapping)
   - Tables: ai_alerts, maintenance_tasks, settings, etc.
   - ⚠️ Requires JOIN with `organization_users` table to filter by org
   - ⚠️ More complex, prone to errors

### The Risk

If a table uses only `user_id` or `created_by`:
- It relies on RLS policies to JOIN with `organization_users` table
- If the RLS policy is missing or incorrect → **DATA LEAKAGE**
- If a user belongs to multiple orgs → **CONFUSION**

---

## 🎯 Recommended Solution

### Option A: Add organization_id to ALL Tables (RECOMMENDED)

**Why this is better:**
- ✅ Simple, clear isolation
- ✅ Easy to query (no complex JOINs in RLS)
- ✅ Performance: Indexed `organization_id` is faster
- ✅ Fail-safe: Even if RLS fails, data is segregated
- ✅ Future-proof: Easy to add features

**Migration needed for these tables:**

```sql
-- Example migration to add organization_id
ALTER TABLE maintenance_tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE maintenance_service_tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE ai_alerts ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE alert_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE maintenance_audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);
-- ... repeat for all tables without organization_id

-- Create indexes
CREATE INDEX idx_maintenance_tasks_org ON maintenance_tasks(organization_id);
CREATE INDEX idx_ai_alerts_org ON ai_alerts(organization_id);
-- ... etc.

-- Update RLS policies to use organization_id
DROP POLICY IF EXISTS "maintenance_tasks_secure" ON maintenance_tasks;
CREATE POLICY "maintenance_tasks_org_select" ON maintenance_tasks FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
));
```

### Option B: Keep Current System (NOT RECOMMENDED)

**Risks:**
- Complex RLS policies
- Performance overhead (JOINs in every query)
- Easy to miss a policy
- Hard to debug data leakage

---

## 🔍 How to Check Current Isolation

### Query to find tables WITHOUT organization_id:

```sql
SELECT
  table_name,
  string_agg(column_name, ', ') as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'organization_id'
  )
GROUP BY table_name
ORDER BY table_name;
```

### Check if data is leaking between orgs:

```sql
-- Example: Check if maintenance_tasks can leak
-- Login as User A from Org 1, then run:
SELECT * FROM maintenance_tasks;

-- Should return ONLY tasks from Org 1
-- If you see tasks from other orgs → DATA LEAKAGE!
```

---

## 📋 Action Plan

### Step 1: Verify Current Isolation
Ask your Supabase AI:
```
For each table in the public schema, show:
1. Does it have organization_id column?
2. What RLS policies exist for it?
3. How does it filter data per organization?
```

### Step 2: Identify Tables to Fix
Create a list of tables that need `organization_id` added.

### Step 3: Create Migration
For each table without `organization_id`:
1. Add `organization_id` column
2. Backfill data (set organization_id based on created_by user's org)
3. Update RLS policies to use `organization_id`
4. Add indexes on `organization_id`

### Step 4: Update RLS Policies
Simplify all policies to use:
```sql
USING (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
))
```

---

## 🚨 Immediate Actions Needed

### High Priority Tables (Add organization_id NOW):

1. **maintenance_tasks** - Critical! Contains maintenance data
2. **ai_alerts** - Could show wrong alerts to wrong users
3. **trip_corrections** - Must be org-isolated
4. **fuel_efficiency_baselines** - Vehicle data must be isolated
5. **driver_vehicle_performance** - Performance data must be isolated

### Medium Priority:

6. **maintenance_service_tasks** - Inherits from maintenance_tasks
7. **maintenance_audit_logs** - Audit trails must be isolated
8. **vehicle_activity_log** - Activity must be isolated
9. **reminder_tracking** - Reminders must be org-specific

### Lower Priority (Settings - user-specific might be OK):

10. **alert_settings** - User settings (might be OK as user_id only)
11. **document_settings** - User settings
12. **driver_ranking_settings** - User settings
13. **global_settings** - User settings

---

## 🛡️ Testing Isolation

After adding `organization_id`:

### Test 1: Cross-Org Data Access
```sql
-- Create test data in Org A
-- Login as user from Org B
-- Try to query data
-- Should return 0 rows
```

### Test 2: RLS Policy Verification
```sql
-- Check all policies use organization_id
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
AND qual NOT LIKE '%organization_id%'
AND tablename NOT LIKE 'auth.%';
```

### Test 3: Query Performance
```sql
-- Verify indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%organization_id%';
```

---

## 📝 Migration Script Template

```sql
-- ========================================
-- MIGRATION: Add organization_id to all tables
-- ========================================

-- 1. Add column (allow NULL initially)
ALTER TABLE maintenance_tasks
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- 2. Backfill organization_id from created_by
UPDATE maintenance_tasks mt
SET organization_id = (
  SELECT ou.organization_id
  FROM organization_users ou
  WHERE ou.user_id = mt.created_by
  LIMIT 1
);

-- 3. Make NOT NULL (after backfill)
ALTER TABLE maintenance_tasks
ALTER COLUMN organization_id SET NOT NULL;

-- 4. Create index
CREATE INDEX idx_maintenance_tasks_org
ON maintenance_tasks(organization_id);

-- 5. Update RLS policy
DROP POLICY IF EXISTS "maintenance_tasks_secure" ON maintenance_tasks;

CREATE POLICY "maintenance_tasks_org_select"
ON maintenance_tasks FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
));

CREATE POLICY "maintenance_tasks_org_insert"
ON maintenance_tasks FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
));

CREATE POLICY "maintenance_tasks_org_update"
ON maintenance_tasks FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
))
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
));

CREATE POLICY "maintenance_tasks_org_delete"
ON maintenance_tasks FOR DELETE
USING (organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
));
```

---

## 💡 Recommendation

**I STRONGLY RECOMMEND Option A:**

1. Add `organization_id` to **ALL** tables
2. Update all RLS policies to use `organization_id`
3. Add indexes on `organization_id`

**Benefits:**
- ✅ No data leakage risk
- ✅ Simple queries
- ✅ Better performance
- ✅ Easy to understand
- ✅ Future-proof

**Cost:**
- One-time migration effort
- ~1 hour of work to create and test migration

---

## 🎯 Next Steps

1. **Verify current state:** Query Supabase to confirm which tables lack `organization_id`
2. **Create migration:** Use the template above for each table
3. **Test thoroughly:** Verify no data leakage
4. **Update documentation:** Update this doc with "FIXED" status

Would you like me to:
1. Create the complete migration script for all tables?
2. Generate test queries to verify isolation?
3. Update the RLS_POLICIES.md with correct policies after migration?

---

**Last Updated:** 2025-11-03
**Status:** ⚠️ CRITICAL - Needs immediate attention
**Priority:** 🔥 HIGH - Data security issue
