# Organization ID Migration Guide

> **📌 Critical:** Step-by-step guide to add organization_id to all tables and ensure complete data isolation.

---

## 🚨 Before You Start

### Understanding the Issue

Your database currently uses **TWO methods** for data isolation:
1. ✅ **organization_id column** - Simple, safe, fast
2. ⚠️ **user_id/created_by** - Complex RLS policies, potential leakage risk

**Goal:** Migrate ALL tables to use `organization_id` for consistent, secure isolation.

### Prerequisites

- [ ] You have **Supabase CLI** installed
- [ ] You have **database backup** (CRITICAL!)
- [ ] You have **staging environment** to test first
- [ ] You understand your organization structure
- [ ] You have **admin access** to Supabase dashboard

---

## 📊 Migration Overview

### What This Migration Does

1. Adds `organization_id` column to 22+ tables
2. Backfills `organization_id` from related tables or users
3. Creates indexes for performance
4. Makes column NOT NULL for data integrity
5. (Next phase) Updates RLS policies to use `organization_id`

### Tables Being Updated

**High Priority (5 tables):**
- maintenance_tasks
- ai_alerts
- trip_corrections
- fuel_efficiency_baselines
- driver_vehicle_performance

**Medium Priority (16 tables):**
- maintenance_service_tasks, maintenance_audit_logs, maintenance_tasks_catalog
- vehicle_configurations, vehicle_activity_log, activity_log, audit_trail
- reminder_tracking, reminder_templates, reminder_contacts
- alert_settings, alert_thresholds
- document_settings, driver_ranking_settings, global_settings, message_templates

**Reports (1 table):**
- generated_reports (if exists)

### Estimated Time
- **Testing:** 30 minutes
- **Running migration:** 5-10 minutes
- **Verification:** 20 minutes
- **Total:** ~1 hour

---

## 📋 Step-by-Step Guide

### Phase 1: Backup (CRITICAL!)

#### Option A: Supabase Dashboard Backup
1. Go to https://supabase.com/dashboard
2. Select your project: `oosrmuqfcqtojflruhww`
3. Go to Settings → Database
4. Click "Create Backup"
5. Wait for backup to complete
6. **Verify backup exists** before proceeding

#### Option B: CLI Backup (Recommended)
```bash
# Export complete database schema and data
supabase db dump -f backup_before_org_migration_$(date +%Y%m%d).sql

# Verify backup file exists and is not empty
ls -lh backup_before_org_migration_*.sql
```

⚠️ **DO NOT PROCEED WITHOUT BACKUP!**

---

### Phase 2: Pre-Migration Testing

#### Test 1: Check Current Data Leakage

1. Open Supabase SQL Editor
2. Open file: `docs/supabase/DATA_LEAKAGE_TEST_QUERIES.sql`
3. Run **TEST 1** (Check Tables WITHOUT organization_id)

**Expected result:** List of ~22 tables missing organization_id

```sql
-- Should show tables like:
-- maintenance_tasks
-- ai_alerts
-- trip_corrections
-- etc.
```

4. Run **TEST 2** (Cross-Organization Data Access Test)
   - Login as User from Organization A
   - Run the vehicle/driver/trip queries
   - **Document the counts** (you'll compare these later)

---

### Phase 3: Run Migration in Staging (If Available)

**If you have a staging environment:**

1. Apply migration to staging first
2. Run all tests
3. Verify data integrity
4. Only proceed to production if all tests pass

**If no staging (skip to Phase 4 for production):**

⚠️ You'll run directly in production (risky but manageable with backup)

---

### Phase 4: Run Migration

#### Option A: Via Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd "c:\Users\nishi\OneDrive\Desktop\Fleet-Management-System---Trip-Sheet-Module3-main (2)\Fleet-Management-System---Trip-Sheet-Module3"

# Apply migration
supabase db push

# Or apply specific migration file
supabase migration up
```

#### Option B: Via Supabase Dashboard (Easier)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Click "New Query"
5. Open file: `supabase/migrations/99999999999999_add_organization_id_to_all_tables.sql`
6. **Copy entire contents** of the file
7. **Paste into SQL Editor**
8. **Review the SQL** (make sure you understand what it does)
9. Click **"Run"** button
10. **Wait for completion** (should take 2-5 minutes)

#### Expected Output

You should see messages like:
```
NOTICE: Added organization_id to maintenance_tasks
NOTICE: Added organization_id to ai_alerts
NOTICE: Added organization_id to trip_corrections
...
NOTICE: ============================================
NOTICE: MIGRATION COMPLETE
NOTICE: Total tables with organization_id: 40
NOTICE: ============================================
```

#### If Errors Occur

**Error: "column already exists"**
- This is OK! Migration is idempotent
- It means some tables already had organization_id
- Continue to next phase

**Error: "violates foreign key constraint"**
- Stop immediately
- Check that `organizations` table exists
- Verify organization IDs are valid
- Contact support if needed

**Error: "cannot update NULL to NOT NULL"**
- Some records couldn't be backfilled
- Run this query to find orphaned records:
  ```sql
  SELECT * FROM maintenance_tasks WHERE organization_id IS NULL;
  ```
- Manually assign organization_id to these records
- Re-run migration

---

### Phase 5: Verification

#### Step 1: Verify Column Addition

Run this query:
```sql
-- Check that all tables now have organization_id
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
ORDER BY table_name;
```

**Expected:** ~40 tables listed

#### Step 2: Check for NULL Values

```sql
-- Find any tables with NULL organization_id (should be 0)
SELECT
  'maintenance_tasks' as table_name,
  COUNT(*) as null_count
FROM maintenance_tasks
WHERE organization_id IS NULL

UNION ALL

SELECT 'ai_alerts', COUNT(*)
FROM ai_alerts
WHERE organization_id IS NULL

UNION ALL

SELECT 'trip_corrections', COUNT(*)
FROM trip_corrections
WHERE organization_id IS NULL;
```

**Expected:** All counts = 0

If any counts > 0, you have orphaned records that need manual fixing.

#### Step 3: Verify Indexes

```sql
-- Check that indexes were created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%organization_id%'
ORDER BY tablename;
```

**Expected:** Index for each table (e.g., `idx_maintenance_tasks_org`)

#### Step 4: Run Full Data Leakage Tests

1. Open `docs/supabase/DATA_LEAKAGE_TEST_QUERIES.sql`
2. Run **all tests** (TEST 1 through TEST 10)
3. Verify results:
   - TEST 1: Should show 0 tables without organization_id
   - TEST 2: User A sees only Org A data
   - TEST 3: No cross-org references
   - TEST 6: No NULL organization_id values
   - TEST 7: All indexes exist

#### Step 5: Application Testing

1. **Login to your application** as different users
2. **Verify each user sees only their organization's data**
3. **Test critical workflows:**
   - View vehicles list
   - View drivers list
   - View trips list
   - Create new trip
   - View maintenance tasks
   - Create maintenance task
   - Check AI alerts
   - View dashboard KPIs

4. **Monitor for errors** in browser console and application logs

---

### Phase 6: Update RLS Policies (CRITICAL!)

⚠️ **Next step after migration:** Update RLS policies to use organization_id

The migration added the column but didn't update policies. You need to:

1. Review current RLS policies
2. Update policies to use `organization_id` instead of complex JOINs
3. Test policies thoroughly

**This will be a separate migration** - see below.

---

## 🔧 Troubleshooting

### Issue 1: Migration Takes Too Long

**Symptoms:** Migration running for 10+ minutes

**Solution:**
- This is normal for large databases
- Wait patiently
- Check Supabase logs for progress
- If stuck for 30+ minutes, contact support

### Issue 2: Orphaned Records

**Symptoms:** Records with NULL organization_id after migration

**Cause:** Records that couldn't be backfilled (no way to determine org)

**Solution:**
```sql
-- Find orphaned records in maintenance_tasks
SELECT
  mt.*,
  v.registration_number,
  v.organization_id as vehicle_org_id
FROM maintenance_tasks mt
LEFT JOIN vehicles v ON mt.vehicle_id = v.id
WHERE mt.organization_id IS NULL;

-- Manually assign to correct organization
UPDATE maintenance_tasks
SET organization_id = 'correct-org-uuid-here'
WHERE id IN (SELECT id FROM maintenance_tasks WHERE organization_id IS NULL);
```

### Issue 3: Application Errors After Migration

**Symptoms:** "column organization_id does not exist" errors in application

**Cause:** Frontend code trying to access non-existent column (unlikely but possible)

**Solution:**
- Check error logs for specific table
- Verify migration completed for that table
- Clear application cache
- Restart application

### Issue 4: Performance Degradation

**Symptoms:** Queries running slower after migration

**Cause:** Missing indexes or outdated query plans

**Solution:**
```sql
-- Rebuild indexes
REINDEX TABLE maintenance_tasks;
REINDEX TABLE ai_alerts;

-- Analyze tables for query planner
ANALYZE maintenance_tasks;
ANALYZE ai_alerts;
ANALYZE trip_corrections;
```

---

## 🎯 Post-Migration Checklist

After completing migration, verify:

- [ ] ✅ All tables have organization_id column
- [ ] ✅ No NULL organization_id values
- [ ] ✅ Indexes created on all organization_id columns
- [ ] ✅ Data leakage tests pass
- [ ] ✅ Application works correctly
- [ ] ✅ Users see only their organization's data
- [ ] ✅ No cross-org foreign key references
- [ ] ✅ Performance is acceptable
- [ ] ⏳ RLS policies updated (next phase)
- [ ] ⏳ Documentation updated

---

## 📝 Next Steps: Update RLS Policies

After this migration, you need to update RLS policies.

### Why Update Policies?

Current policies use complex JOINs:
```sql
-- Old policy (complex, slow)
USING (created_by IN (
  SELECT user_id FROM organization_users
  WHERE organization_id = [user's org]
))
```

New policies should be simple:
```sql
-- New policy (simple, fast)
USING (organization_id IN (
  SELECT organization_id FROM organization_users
  WHERE user_id = auth.uid()
))
```

### RLS Policy Migration Script

Create a new migration file:
`supabase/migrations/99999999999998_update_rls_policies_for_org_id.sql`

**Template for each table:**
```sql
-- Drop old policies
DROP POLICY IF EXISTS "old_policy_name" ON maintenance_tasks;

-- Create new organization-based policies
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

Repeat for all 22 tables.

---

## 🆘 Rollback Plan (If Something Goes Wrong)

### Option 1: Restore from Backup (Nuclear Option)

```bash
# Restore from backup (will lose data since backup!)
supabase db reset --db-url "your-database-url"
psql -h db.xxx.supabase.co -U postgres -d postgres -f backup_before_org_migration_YYYYMMDD.sql
```

⚠️ **WARNING:** This will lose ALL data created since backup!

### Option 2: Remove organization_id Columns (Partial Rollback)

```sql
-- Remove organization_id from specific table
ALTER TABLE maintenance_tasks DROP COLUMN IF EXISTS organization_id CASCADE;

-- Drop associated index
DROP INDEX IF EXISTS idx_maintenance_tasks_org;

-- Restore old RLS policy (if needed)
CREATE POLICY "maintenance_tasks_secure" ON maintenance_tasks
FOR ALL TO PUBLIC
USING (auth.uid() = created_by);
```

Repeat for each table you want to rollback.

---

## 📞 Support

**If you encounter issues:**

1. **Check Supabase Logs:**
   - Dashboard → Database → Logs
   - Look for errors during migration time

2. **Run Diagnostic Queries:**
   ```sql
   -- Check migration progress
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC
   LIMIT 10;
   ```

3. **Contact Support:**
   - Supabase Discord: https://discord.supabase.com
   - Include error message and migration step

---

## ✅ Success Criteria

Migration is successful when:

1. ✅ All tables have organization_id
2. ✅ No data leakage between organizations
3. ✅ Application functions normally
4. ✅ Query performance is acceptable
5. ✅ Users are satisfied with data visibility

---

## 📊 Monitoring Post-Migration

**Week 1:** Monitor closely
- Check application logs daily
- Ask users to report any data issues
- Monitor query performance

**Week 2-4:** Regular checks
- Weekly data leakage tests
- Performance monitoring
- User feedback

**Ongoing:**
- Include organization_id in all new tables
- Use templates from TEMPLATE_FOR_UPDATES.md
- Keep documentation updated

---

**Last Updated:** 2025-11-03
**Migration Version:** 1.0
**Status:** Ready for testing

---

## 🎉 Congratulations!

Once you complete this migration, your database will have:
- ✅ Complete organization isolation
- ✅ No data leakage risk
- ✅ Simple, fast RLS policies
- ✅ Better query performance
- ✅ Future-proof architecture

Good luck! 🚀
