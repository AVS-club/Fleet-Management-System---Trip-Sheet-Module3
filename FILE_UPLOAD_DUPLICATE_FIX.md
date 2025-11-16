# File Upload Duplicate Processing Fix

## Problem

Files uploaded during maintenance task edit were not being saved to the database. The `bill_url` and `part_warranty_url` arrays remained empty even after successful file selection and upload progress indicators.

## Root Cause

**Duplicate File Processing**: The file upload function `processAllServiceGroupFiles()` was being called TWICE in the save flow:

1. **First Call** - [MaintenanceTaskPage.tsx:576](src/pages/MaintenanceTaskPage.tsx#L576)
   - `handleFileUploads()` function calls `processAllServiceGroupFiles()`
   - Uploads File objects to Supabase Storage
   - Returns service groups with URLs instead of File objects

2. **Second Call** - maintenanceStorage.ts:532 (REMOVED)
   - `updateTask()` called `processAllServiceGroupFiles()` AGAIN
   - But service groups already had URLs, not File objects
   - Function found no files to upload, returned empty arrays

### The Flow (Before Fix)

```
User clicks "Update Task"
  ↓
MaintenanceTaskPage.tsx handleFileUploads()
  ↓
processAllServiceGroupFiles(service_groups with File objects)
  ↓
Upload files to storage, get URLs
  ↓
Return service groups with URLs: { bills: [], bill_url: ["https://..."] }
  ↓
Pass to updateTask(payload with URLs)
  ↓
maintenanceStorage.ts updateTask()
  ↓
Call processAllServiceGroupFiles() AGAIN ❌
  ↓
No File objects found, returns { bill_url: [], part_warranty_url: [] }
  ↓
Insert empty arrays into database
```

## Solution

**Removed duplicate file upload call** from [maintenanceStorage.ts:530-538](src/utils/maintenanceStorage.ts#L530-L538)

### Changes Made

#### 1. maintenanceStorage.ts - Removed Duplicate Upload

**BEFORE**:
```typescript
// ⚡ CRITICAL: Upload files FIRST before inserting service groups
logger.debug(`📤 Uploading files for ${service_groups.length} service group(s)`);
const serviceGroupsWithUrls = await processAllServiceGroupFiles(
  service_groups,
  id,
  undefined, // No progress callback needed
  undefined  // No file progress callback needed
);
logger.debug(`✅ File uploads complete, URLs captured`);

// Service groups now have file URLs instead of File objects
// Add the task ID and organization ID
const serviceGroupsWithTaskId = serviceGroupsWithUrls.map(group => ({
  ...group,
  maintenance_task_id: id,
  organization_id: oldTask.organization_id
}));
```

**AFTER**:
```typescript
// ✅ Service groups already have file URLs (uploaded in MaintenanceTaskPage.tsx)
// Just add the task ID and organization ID
const serviceGroupsWithTaskId = service_groups.map(group => ({
  ...group,
  maintenance_task_id: id,
  organization_id: oldTask.organization_id
}));
```

#### 2. maintenanceStorage.ts - Removed Unused Import

**BEFORE**:
```typescript
import { processAllServiceGroupFiles } from './maintenanceFileUpload';
```

**AFTER**:
```typescript
// Removed - no longer needed
```

### The Flow (After Fix)

```
User clicks "Update Task"
  ↓
MaintenanceTaskPage.tsx handleFileUploads()
  ↓
processAllServiceGroupFiles(service_groups with File objects)
  ↓
Upload files to storage, get URLs
  ↓
Return service groups with URLs: { bills: [], bill_url: ["https://..."] }
  ↓
Pass to updateTask(payload with URLs)
  ↓
maintenanceStorage.ts updateTask()
  ↓
Use service groups as-is (already have URLs) ✅
  ↓
Insert service groups with file URLs into database
  ↓
Database: { bill_url: ["https://..."], part_warranty_url: ["https://..."] }
```

## Files Modified

### 1. [maintenanceStorage.ts](src/utils/maintenanceStorage.ts)

**Lines Changed**: 530-536, 18

**Changes**:
- Removed duplicate `processAllServiceGroupFiles()` call
- Removed import of `processAllServiceGroupFiles`
- Service groups passed to `updateTask()` already have file URLs

### 2. No Changes to MaintenanceTaskPage.tsx

The page component already handles file uploads correctly:
- Line 576: Calls `handleFileUploads(service_groups, id)`
- Line 383-388: `handleFileUploads` calls `processAllServiceGroupFiles()`
- Line 578: Converts result to database format with `convertServiceGroupsToDatabase()`
- Line 596: Passes processed service groups to `updateTask()`

## How It Works Now

### Edit Flow (Complete)

1. **User uploads files in edit mode**
   - Selects bills/receipts via FileUploadWithProgress
   - Selects warranty documents via FileUploadWithProgress
   - Files stored in component state as File objects

2. **User clicks "Update Task"**
   - MaintenanceTaskPage.tsx handleSubmit triggered
   - Calls `handleFileUploads(service_groups, id)`

3. **File Upload (MaintenanceTaskPage.tsx)**
   - `processAllServiceGroupFiles()` uploads files to Supabase Storage
   - Path: `{org-id}/tasks/{task-id}/bills/` or `warranties/`
   - Returns service groups with URLs: `{ bill_url: [...], part_warranty_url: [...] }`

4. **Database Format Conversion**
   - `convertServiceGroupsToDatabase()` converts task names to UUIDs
   - Service groups now ready for database insertion

5. **Save to Database (maintenanceStorage.ts)**
   - `updateTask()` receives service groups with URLs
   - Deletes old service groups
   - Inserts new service groups with file URLs
   - Database stores URLs in bill_url and part_warranty_url arrays

6. **Result**
   - Database: `{ bill_url: ["https://..."], part_warranty_url: ["https://..."] }`
   - Files accessible via public URLs
   - View mode displays uploaded documents

## Testing

### Test Checklist

- [ ] Edit existing maintenance task
- [ ] Upload bill/receipt file
- [ ] Upload warranty document file
- [ ] Click "Update Task"
- [ ] Verify upload progress indicators appear
- [ ] Verify no errors in console
- [ ] Check database: `bill_url` array has URLs
- [ ] Check database: `part_warranty_url` array has URLs
- [ ] View task in view mode
- [ ] Verify bill/receipt displays
- [ ] Verify warranty document displays

### Database Verification Query

```sql
SELECT
  id,
  bill_url,
  part_warranty_url,
  parts_data
FROM maintenance_service_tasks
WHERE maintenance_task_id = 'your-task-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
```json
{
  "bill_url": ["https://..."],
  "part_warranty_url": ["https://..."],
  "parts_data": [
    {
      "partName": "Battery",
      "warrantyPeriod": "36 months",
      "warrantyDocument": null
    }
  ]
}
```

## Impact

### ✅ Fixed Issues

1. **Files now upload successfully** - No more empty URL arrays
2. **Upload progress displays correctly** - User sees upload status
3. **Database saves URLs** - Files accessible in view mode
4. **No duplicate processing** - Efficient single upload flow

### ⚠️ Important Notes

- **File upload happens in MaintenanceTaskPage.tsx ONLY**
- **maintenanceStorage.ts receives already-processed data**
- **Don't add file upload calls to updateTask()** - it's handled upstream
- **Service groups must have URLs, not File objects** when passed to updateTask()

## Status

✅ **FIXED** - Duplicate file upload processing eliminated

**Date**: November 16, 2025
**Issue**: Files not saving to database (empty URL arrays)
**Root Cause**: Duplicate processAllServiceGroupFiles() calls
**Solution**: Removed duplicate call from maintenanceStorage.ts
**Testing**: Ready for user testing
