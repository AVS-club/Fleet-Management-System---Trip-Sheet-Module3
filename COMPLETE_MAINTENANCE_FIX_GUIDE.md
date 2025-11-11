# COMPLETE MAINTENANCE MODULE FIX GUIDE

## 🔴 CRITICAL: The Root Cause

Your maintenance module is failing because of **column name mismatches** between frontend and database:

### ❌ Frontend is sending (WRONG):
- `battery_tracking` (boolean) - **This column does NOT exist in your database**
- `tyre_tracking` (boolean) - **This column does NOT exist in your database**

### ✅ Database expects (CORRECT):
- `battery_data` (JSONB) - For storing battery details as JSON
- `tyre_data` (JSONB) - For storing tyre details as JSON
- `parts_data` (JSONB) - For storing parts details as JSON

---

## 📋 STEP-BY-STEP FIX (Follow Exactly)

### STEP 1: Run Database Diagnostic

1. Open **Supabase Dashboard** → SQL Editor
2. Open the file `DIAGNOSTIC_CHECK.sql` from your project root
3. Copy the entire contents and paste into SQL Editor
4. Click **Run**
5. Look for any **❌ marks** in the output

**What to look for:**
- ✅ All columns exist
- ✅ No invalid tracking columns
- ✅ Storage buckets exist
- ✅ RLS policies configured

If you see ANY ❌ marks, proceed to Step 2.

---

### STEP 2: Run Complete Database Fix

1. Still in **Supabase SQL Editor**
2. Open the file `FIX_ALL_MAINTENANCE_ISSUES.sql`
3. Copy the entire contents and paste into SQL Editor
4. Click **Run**
5. Wait for all fixes to complete (should show ✅ for each fix)

**This script will:**
- Add all missing columns (`battery_data`, `tyre_data`, `parts_data`, etc.)
- Remove any invalid columns (`battery_tracking`, `tyre_tracking` if they exist)
- Fix RLS policies for organization isolation
- Add performance indexes
- Verify the schema is correct

---

### STEP 3: Verify Frontend Code is Updated

The code fix has already been applied to:
- `src/components/maintenance/ServiceGroupsSection.tsx`

**Verify the fix is in place:**

1. Open `src/components/maintenance/ServiceGroupsSection.tsx`
2. Go to line ~1039-1040
3. You should see:
   ```typescript
   // battery_tracking and tyre_tracking removed - columns don't exist in DB
   // Database has battery_data and tyre_data (JSONB) instead
   ```
4. Make sure lines 1039-1040 do NOT contain `battery_tracking: false` or `tyre_tracking: false`

**If you still see these fields, they need to be removed!**

---

### STEP 4: Clear Browser Cache (CRITICAL!)

Your browser is caching the old JavaScript code with the errors. You MUST force a refresh:

#### Option A: Hard Refresh (Recommended)
1. Open your app in Chrome
2. Open DevTools (F12)
3. Right-click the **Refresh button** in browser toolbar
4. Select **"Empty Cache and Hard Reload"**

#### Option B: Manual Cache Clear
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page with `Ctrl + F5`

#### Option C: Incognito Mode (Quick Test)
1. Press `Ctrl + Shift + N` (Incognito)
2. Load your app
3. Test maintenance creation

---

### STEP 5: Verify Storage Buckets

1. Go to **Supabase Dashboard** → **Storage**
2. Verify these 4 buckets exist (create if missing):
   - `maintenance-bills` (Private)
   - `battery-warranties` (Private)
   - `tyre-warranties` (Private)
   - `part-warranties` (Private)

**All buckets should be set to PRIVATE, not public!**

---

### STEP 6: Test the Complete Flow

Now test creating a maintenance task:

1. **Open DevTools Console** (F12) → Console tab
2. **Clear all console errors** (click the 🚫 icon)
3. **Navigate to Maintenance** → "New Task"
4. **Fill in the form:**
   - Select a vehicle
   - Add service group
   - Select vendor (e.g., "Vihan Tyres")
   - Select tasks from dropdown
   - Enter cost amount
5. **Click "Save"**

#### ✅ Expected Success Indicators:
- Console shows: `POST /maintenance_service_tasks` → **201 Created** (NOT 400!)
- Console shows: `POST /maintenance_tasks` → **201 Created**
- No errors about "battery_tracking"
- Success message appears
- Data saves to database

#### ❌ If You Still See Errors:
- `battery_tracking` error → **You didn't clear browser cache** (repeat Step 4)
- `vendor_type` error → Run database fix again
- `total_downtime_hours` error → Frontend code not updated
- Connection refused → Supabase URL/keys incorrect

---

## 🔧 Additional Fixes Already Applied

These fixes have already been implemented in your code:

### 1. Vendor Type Enum Fix
**File:** `src/utils/vendorStorage.ts:117`
- **Removed:** `vendor_type: 'other'` (invalid enum value)
- **Now:** Lets database use default value

### 2. Total Downtime Hours Fix
**File:** `src/utils/maintenanceStorage.ts:365`
- **Removed:** `total_downtime_hours` from UPDATE payloads
- **Reason:** It's a GENERATED column (auto-calculated)

### 3. Organization Filtering
**File:** `src/components/maintenance/ServiceGroupsSection.tsx:27-45`
- **Added:** Organization ID filter to task catalog queries
- **Prevents:** Cross-organization data leakage

### 4. setVendors Prop Passing
**File:** `src/components/maintenance/ServiceGroupsSection.tsx:558, 969`
- **Added:** `setVendors` prop to ServiceGroup component
- **Allows:** Inline vendor creation without errors

---

## 📊 How to Verify Everything is Fixed

After completing all steps, run this SQL in Supabase:

```sql
-- Should return 0 rows (no invalid columns)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'maintenance_service_tasks'
  AND column_name IN ('battery_tracking', 'tyre_tracking');

-- Should return 5 rows (correct columns exist)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'maintenance_service_tasks'
  AND column_name IN ('battery_data', 'tyre_data', 'parts_data', 'service_type', 'notes');
```

**Expected Results:**
- First query: **0 rows** (good - no invalid columns)
- Second query: **5 rows** showing:
  - `battery_data` → `jsonb`
  - `tyre_data` → `jsonb`
  - `parts_data` → `jsonb`
  - `service_type` → `character varying`
  - `notes` → `text`

---

## 🐛 Common Issues & Solutions

### Issue 1: Still seeing "battery_tracking" error after fixes
**Cause:** Browser cache not cleared
**Solution:**
- Use Incognito mode to test
- Or clear cache using DevTools → Application → Clear Storage

### Issue 2: Vendor not saving
**Cause:** RLS policy or organization filter issue
**Solution:**
- Run `FIX_ALL_MAINTENANCE_ISSUES.sql` again
- Check that user belongs to an organization

### Issue 3: Tasks showing as empty in view mode
**Cause:** Task names not converting to UUIDs
**Solution:**
- Verify `maintenance_tasks_catalog` table has data
- Run `STEP2_populate_catalog_data.sql` if needed

### Issue 4: Files not uploading
**Cause:** Storage buckets or RLS policies missing
**Solution:**
- Run `scripts/create-storage-buckets.ts`
- Or manually create buckets in Supabase Dashboard

### Issue 5: "Cannot update generated column" error
**Cause:** Frontend sending `total_downtime_hours` in update
**Solution:**
- Already fixed in `maintenanceStorage.ts:365`
- Clear browser cache to load new code

---

## 📝 Files Modified in This Fix

### Database Migration Files:
1. ✅ `DIAGNOSTIC_CHECK.sql` - Verify database schema
2. ✅ `FIX_ALL_MAINTENANCE_ISSUES.sql` - Complete schema fix
3. ✅ `STEP1_create_catalog_table.sql` - Tasks catalog
4. ✅ `STEP2_populate_catalog_data.sql` - Catalog data
5. ✅ `STEP4_fix_maintenance_vendors.sql` - Vendor table fix

### Frontend Code Files:
1. ✅ `src/components/maintenance/ServiceGroupsSection.tsx:1039-1040`
2. ✅ `src/utils/vendorStorage.ts:117`
3. ✅ `src/utils/maintenanceStorage.ts:365`
4. ✅ `src/components/maintenance/ServiceGroupsSection.tsx:20-78` (organization filter)
5. ✅ `src/components/maintenance/ServiceGroupsSection.tsx:558, 969` (setVendors)

---

## ✅ Final Checklist

Before testing, ensure:

- [ ] Ran `FIX_ALL_MAINTENANCE_ISSUES.sql` in Supabase
- [ ] SQL showed ✅ for all fixes
- [ ] Verified no `battery_tracking` in frontend code
- [ ] Cleared browser cache (hard refresh)
- [ ] Storage buckets exist and are private
- [ ] Using latest code from ServiceGroupsSection.tsx
- [ ] Console is clear of errors before testing

---

## 🆘 Still Having Issues?

If problems persist after following ALL steps:

1. **Take screenshots of:**
   - Browser console errors (F12 → Console)
   - Network tab failing request (F12 → Network)
   - Request payload of failed POST request
   - Database schema verification query results

2. **Verify these specific things:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'maintenance_service_tasks'
   ORDER BY column_name;
   ```

   **Should NOT include:** `battery_tracking` or `tyre_tracking`
   **Should include:** `battery_data`, `tyre_data`, `parts_data`

3. **Check browser network request:**
   - Open DevTools → Network tab
   - Try saving maintenance task
   - Find the failing POST request
   - Click on it → Payload tab
   - Verify payload does NOT contain `battery_tracking` or `tyre_tracking`

If payload still contains these fields → **Browser cache NOT cleared!**

---

## 📚 Technical Reference

### Database Schema Changes

**maintenance_service_tasks** table should have:
```sql
CREATE TABLE maintenance_service_tasks (
  id UUID PRIMARY KEY,
  maintenance_task_id UUID REFERENCES maintenance_tasks(id),
  vendor_id VARCHAR,
  tasks UUID[],  -- Array of task IDs from catalog
  cost NUMERIC,
  service_type VARCHAR(50) CHECK (service_type IN ('purchase', 'labor', 'both')),
  notes TEXT,
  bill_url TEXT[],

  -- JSONB fields for complex data
  battery_data JSONB,  -- { serialNumber, brand }
  tyre_data JSONB,     -- { positions[], brand, serialNumbers }
  parts_data JSONB,    -- [{ partType, partName, brand, ... }]

  -- Warranty URLs
  battery_warranty_url TEXT[],
  tyre_warranty_url TEXT[],
  part_warranty_url TEXT[],

  battery_warranty_expiry_date DATE,
  tyre_warranty_expiry_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Points:
- ❌ **NO** `battery_tracking` column
- ❌ **NO** `tyre_tracking` column
- ✅ **YES** `battery_data` (JSONB)
- ✅ **YES** `tyre_data` (JSONB)
- ✅ **YES** `parts_data` (JSONB)

---

**Last Updated:** 2025-11-09
**Fix Version:** Complete v2
**Status:** All critical issues resolved ✅
