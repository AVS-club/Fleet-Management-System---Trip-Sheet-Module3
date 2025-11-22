# KPI Zero Values Fix - Apply These Changes

## Problem Summary
KPIs were showing zero values because:
1. The `generate_kpi_cards()` function used incorrect key naming (`weekly.*`, `monthly.*`) instead of the expected format (`week.*`, `month.*`)
2. The function was DELETING old data every refresh, causing zeros between updates
3. Multiple unique constraints were causing conflicts

## Files Changed

### 1. Core Function Fix
**File:** `supabase/migrations/20251118000001_create_generate_kpi_cards_function.sql`

**Changes:**
- Removed DELETE statement that was wiping data (line 113-116)
- Changed `weekly.distance` → `week.distance`
- Changed `monthly.trips` → `month.trips`
- Changed `monthly.revenue` → `month.revenue`
- Changed `monthly.profit` → `month.pnl`
- Changed `fleet.utilization` → `current.fleet_utilization`
- Changed `fleet.active_drivers` → `current.active_drivers`
- Added `kpi_value_raw` column to all INSERT statements
- Updated themes to match frontend expectations

**Action Required:** Run this migration file in Supabase SQL Editor

### 2. Data Migration
**File:** `supabase/migrations/20251121_fix_kpi_key_naming.sql`

**Purpose:** Migrates existing data from old key format to new format

**Action Required:** Run this migration AFTER running the core function fix

### 3. Constraint Verification
**File:** `supabase/migrations/20251121_verify_unique_constraint.sql`

**Purpose:** Ensures only one unique constraint exists on `(kpi_key, organization_id)`

**Action Required:** Run this migration LAST

## How to Apply These Fixes

### Step 1: Backup Current KPIs (Optional but Recommended)
```sql
CREATE TABLE kpi_cards_backup AS SELECT * FROM kpi_cards;
```

### Step 2: Apply Core Function Fix
Run the entire content of: `supabase/migrations/20251118000001_create_generate_kpi_cards_function.sql`

This will recreate the `generate_kpi_cards()` function with correct key naming and without the DELETE statement.

### Step 3: Migrate Existing Data
Run: `supabase/migrations/20251121_fix_kpi_key_naming.sql`

This will copy data from old keys to new keys and delete the old entries.

### Step 4: Verify Constraints
Run: `supabase/migrations/20251121_verify_unique_constraint.sql`

This will ensure only the correct unique constraint exists.

### Step 5: Test the Fix
Manually trigger the KPI refresh:
```sql
SELECT generate_kpi_cards();
SELECT generate_comparative_kpis();
```

Then check the results:
```sql
SELECT kpi_key, kpi_title, kpi_value_human, computed_at, theme
FROM kpi_cards
ORDER BY computed_at DESC, kpi_key;
```

### Step 6: Verify GitHub Actions
The automated workflow at `.github/workflows/refresh-kpis.yml` should now work correctly every 15 minutes.

## Expected Results

After applying these fixes:
1. ✅ KPIs will no longer show zero values
2. ✅ Data persists between refreshes (no more DELETE)
3. ✅ Correct key format: `today.*`, `week.*`, `month.*`, `current.*`, `comparison.*`, `performance.*`, `efficiency.*`
4. ✅ UPSERT logic updates existing records instead of creating duplicates
5. ✅ GitHub Actions workflow runs successfully every 15 minutes

## Verification Queries

Check for zero-value KPIs:
```sql
SELECT kpi_key, kpi_value_human, kpi_value_raw, computed_at
FROM kpi_cards
WHERE kpi_value_raw::NUMERIC = 0
ORDER BY computed_at DESC;
```

Check for old key formats (should return 0 rows):
```sql
SELECT kpi_key, COUNT(*)
FROM kpi_cards
WHERE kpi_key LIKE 'weekly.%' OR kpi_key LIKE 'monthly.%' OR kpi_key LIKE 'fleet.%'
GROUP BY kpi_key;
```

Check constraint status:
```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'kpi_cards'::regclass 
AND contype = 'u';
```
Expected: Only `kpi_cards_unique_key_org` on `(kpi_key, organization_id)`

## Rollback Plan (If Needed)

If something goes wrong:
```sql
-- Restore from backup
DROP TABLE kpi_cards;
ALTER TABLE kpi_cards_backup RENAME TO kpi_cards;

-- Recreate constraints
ALTER TABLE kpi_cards 
ADD CONSTRAINT kpi_cards_unique_key_org 
UNIQUE (kpi_key, organization_id);
```

## Notes
- The fix preserves all existing KPI data
- The automation will continue to work after this fix
- No frontend changes are required
- The fix is backward compatible with the comparative KPIs function

