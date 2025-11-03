# Driver Storage Path Migration Guide

## Overview

This guide explains the driver photo storage migration from license-number-based or temp-ID folder names to UUID-based folder names.

## Problem Statement

Driver photos were being stored in Supabase Storage using inconsistent folder naming:
- ✅ **Correct:** `17a36562-d6d4-423b-b893.../profile-photo/photo.jpg` (UUID)
- ❌ **Incorrect:** `CG041990078925/profile-photo/photo.jpg` (License Number)
- ❌ **Incorrect:** `temp-1234567890/profile-photo/photo.jpg` (Temporary ID)

**Why this is a problem:**
- License numbers can change (renewals, corrections)
- UUIDs are immutable and the standard for database relations
- Inconsistent naming makes file management difficult
- Breaks referential integrity with database records

## Solution

### 1. Code Fix (Completed)

**Files Modified:**
- [src/pages/DriversPage.tsx](../src/pages/DriversPage.tsx)

**Changes Made:**
- New drivers are now created in the database FIRST to generate UUID
- All file uploads use the UUID instead of temporary IDs
- Eliminates use of `temp-${Date.now()}` for storage paths

**New Workflow:**
```
BEFORE:
1. Generate temp ID
2. Upload photos with temp ID
3. Create driver in database (get UUID)
4. Photos remain with temp ID folder ❌

AFTER:
1. Create driver in database (get UUID) ✅
2. Upload photos with UUID ✅
3. All files use consistent UUID-based paths ✅
```

### 2. Data Migration (To Be Run)

The migration consists of 3 steps:

#### Step 1: Audit Current State

**Run:** [supabase/migrations/20251103000001_audit_driver_storage_paths.sql](../supabase/migrations/20251103000001_audit_driver_storage_paths.sql)

**Purpose:** Identify which drivers need migration

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the audit SQL
3. Execute and review results

**Expected Output:**
```
path_status          | driver_count
---------------------|-------------
UUID_CORRECT ✓       | 5
LICENSE_NUMBER ✗     | 12
TEMP_ID ✗            | 2
DATA_URL             | 3
NO_PHOTO             | 8
```

#### Step 2: Run Migration Script

**Script:** [scripts/migrate_driver_photos.js](../scripts/migrate_driver_photos.js)

**Prerequisites:**
1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Get your Supabase credentials:
   - URL: `https://your-project.supabase.co`
   - Service Role Key: From Supabase Dashboard → Settings → API

**Dry Run (Recommended First):**
```bash
DRY_RUN=true \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
node scripts/migrate_driver_photos.js
```

**Actual Migration:**
```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
node scripts/migrate_driver_photos.js
```

**What it does:**
1. Downloads photos from old paths (e.g., `CG041990078925/profile-photo/photo.jpg`)
2. Uploads to new paths using UUID (e.g., `abc-123-uuid/profile-photo/photo.jpg`)
3. Updates `driver_photo_url` in database
4. Keeps old files for safety (manual cleanup later)
5. Logs all operations with detailed status

**Expected Output:**
```
================================================================================
Migration Summary
================================================================================
Total drivers processed:  15
✅ Successfully migrated:  14
⏭️  Skipped (already OK):   5
❌ Errors:                 0
================================================================================
```

#### Step 3: Verify Migration

**Run:** [supabase/migrations/20251103000002_verify_driver_storage_migration.sql](../supabase/migrations/20251103000002_verify_driver_storage_migration.sql)

**Purpose:** Confirm all drivers now use UUID paths

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the verification SQL
3. Execute and review results

**Expected Output:**
```
no_photo | data_url | full_url | uuid_correct | needs_migration | total_drivers
---------|----------|----------|--------------|-----------------|---------------
8        | 3        | 0        | 19           | 0               | 30
```

✅ **Success Criteria:** `needs_migration` = 0

## Storage Cleanup (Optional)

After verification, old storage folders can be deleted:

**Steps:**
1. Wait at least 7 days to ensure everything works
2. Go to Supabase Dashboard → Storage → `driver-docs` bucket
3. Identify old folders:
   - Look for folder names matching license patterns (e.g., `CG041990078925`)
   - Look for temp folders (e.g., `temp-1234567890`)
4. Manually delete old folders
5. Keep backups for 30 days before permanent deletion

**Folders to keep:**
- All UUID-format folders (e.g., `17a36562-d6d4-423b-b893...`)
- Any non-driver-related folders

## Troubleshooting

### Migration Script Errors

**Error: "Bucket not found"**
- Ensure `driver-docs` bucket exists in Supabase Storage
- Check bucket name spelling

**Error: "Failed to download"**
- Old file may have been deleted
- Folder name in database may not match actual storage
- Check Supabase Storage browser to locate actual file

**Error: "Failed to upload"**
- Check Supabase service key permissions
- Verify storage bucket policies allow uploads
- Check file size limits

**Error: "Database update failed"**
- Check RLS policies on drivers table
- Verify service key has update permissions
- Check for database constraints

### Verification Fails

**If `needs_migration` > 0 after running migration:**

1. Check migration script logs for specific errors
2. Run audit SQL to see which drivers failed:
   ```sql
   SELECT id, name, driver_photo_url
   FROM public.drivers
   WHERE driver_photo_url NOT LIKE id::text || '/%';
   ```
3. Manually investigate and fix problematic drivers
4. Re-run migration script (it will skip already-migrated drivers)

### New Drivers Still Using Wrong Paths

**If new drivers created after code fix still have temp/license paths:**

1. Verify [src/pages/DriversPage.tsx](../src/pages/DriversPage.tsx) was updated
2. Clear browser cache and reload application
3. Check for TypeScript compilation errors:
   ```bash
   npx tsc --noEmit
   ```
4. Restart development server

## Testing

### Test New Driver Creation

1. Go to Drivers page
2. Click "Add Driver"
3. Fill in driver details and upload photo
4. Save driver
5. Verify:
   - Driver created successfully
   - Photo displays correctly
   - Check Supabase Storage: Photo should be at `{uuid}/profile-photo/photo.jpg`
   - Check database: `driver_photo_url` should contain UUID-based path

### Test Driver Photo Update

1. Edit an existing driver
2. Upload new photo
3. Save changes
4. Verify:
   - Photo updated successfully
   - Old photo replaced in storage
   - Database URL still uses UUID path

## Technical Details

### Database Schema

**Table:** `public.drivers`
**Column:** `driver_photo_url` (TEXT)

**Format Examples:**
```
✅ UUID path:  "17a36562-d6d4-423b-b893.../profile-photo/photo.jpg"
✅ Data URL:   "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
❌ License:    "CG041990078925/profile-photo/photo.jpg"
❌ Temp:       "temp-1699999999/profile-photo/photo.jpg"
```

### Storage Structure

**Bucket:** `driver-docs`

**Paths:**
```
{driverId}/
├── profile-photo/
│   └── photo.{ext}
├── license/
│   └── license_{timestamp}.{ext}
├── aadhar/
│   └── aadhar_{timestamp}.{ext}
├── police/
│   └── police_{timestamp}.{ext}
└── medical/
    └── medical_{timestamp}.{ext}
```

### Code References

**Upload Function:** [src/utils/storage.ts:48](../src/utils/storage.ts#L48)
```typescript
const filePath = `${driverId}/profile-photo/photo.${fileExt}`;
await supabase.storage.from('driver-docs').upload(filePath, file, { upsert: true });
```

**Retrieval Function:** [src/utils/storage.ts:982](../src/utils/storage.ts#L982)
```typescript
const { data } = supabase.storage.from('driver-docs').getPublicUrl(filePath);
```

## Timeline

1. **Code Fix:** Implemented 2025-11-03 ✅
2. **Migration Script:** Created 2025-11-03 ✅
3. **Data Migration:** To be scheduled ⏳
4. **Verification:** After migration ⏳
5. **Storage Cleanup:** 7-30 days after verification ⏳

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Review migration script logs
3. Check Supabase Storage browser for actual file locations
4. Verify database records match storage files

---

**Migration Created:** 2025-11-03
**Last Updated:** 2025-11-03
**Status:** Ready for execution
