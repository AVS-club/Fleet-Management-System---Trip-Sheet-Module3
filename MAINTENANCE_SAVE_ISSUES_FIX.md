# Maintenance Save Issues - Analysis & Fixes

## Issues Identified

### 1. Loading Spinners Stuck Forever
**Symptoms**:
- "Saving task details...", "Uploading files...", "Updating maintenance task..." spinners never disappear
- Console shows many `ERR_CONNECTION_REFUSED` errors
- Invalid data format errors

**Root Cause**:
The toast notifications are never being dismissed because:
1. Errors are occurring but not being caught properly
2. The `progressToast` is never updated to success or error state
3. `setIsSubmitting(false)` might not be reached if errors occur early

### 2. Odometer Photo Display Issue
**Symptoms**:
- Odometer photo shows blank
- "Invalid data format" error when clicking
- Photo worked before but now broken

**Root Cause**: Need to investigate database format

## Current Save Flow (Edit Mode)

```
User clicks "Update Task"
  ↓
setIsSubmitting(true)
  ↓
Create progressToast with "Updating maintenance task..."
  ↓
Upload service group files → processAllServiceGroupFiles()
  ↓
Update toast: "Uploading files..."
  ↓
Convert service groups to database format
  ↓
Update toast: "Saving task details..."
  ↓
Call updateTask()
  ↓
IF SUCCESS:
  - Update toast to success
  - Navigate to /maintenance
IF ERROR:
  - Update toast to error
  - Show error message
FINALLY:
  - setIsSubmitting(false) ← THIS MIGHT NOT BE REACHED
```

## Fixes Needed

### Fix 1: Ensure Toast Always Dismisses

The issue is that if ANY error occurs during the save flow, the toast stays as "loading" forever. We need to wrap everything in a try-catch-finally:

**Location**: [MaintenanceTaskPage.tsx:559-629](src/pages/MaintenanceTaskPage.tsx#L559-L629)

**Current Code Structure**:
```typescript
requestAnimationFrame(async () => {
  let progressToast: any = null;

  try {
    progressToast = toast.loading('Updating maintenance task...');
    // ... file uploads
    // ... updateTask call
  } catch (error) {
    // Error handling
  } finally {
    resolve(undefined);  // ← setIsSubmitting NOT being cleared here!
  }
});
```

**Problem**: The `finally` block doesn't set `isSubmitting(false)`, so if the promise resolves but there was an error, the loading state persists.

###Fix 2: Add Proper Error Handling

All errors need to:
1. Dismiss the progress toast
2. Set isSubmitting to false
3. Show user-friendly error message

### Fix 3: Investigate Odometer Photo Format

Need to check:
1. Database column type for `odometer_image`
2. What format it's being saved as (string URL vs array vs object)
3. What format the view component expects

## SQL to Check Odometer Photo Format

```sql
SELECT
  id,
  odometer_image,
  pg_typeof(odometer_image) as image_type,
  length(odometer_image) as url_length
FROM maintenance_tasks
WHERE id = 'e937f740-696c-439d-828e-520132c52cb9';
```

Expected result:
- `image_type`: `text` (should be a URL string)
- `url_length`: Should be > 0
- `odometer_image`: Should start with `https://`

## Connection Refused Errors

The `ERR_CONNECTION_REFUSED` errors to `https://localhost/` suggest:
1. The app is trying to connect to localhost instead of the Supabase URL
2. There might be a configuration issue with environment variables
3. OR there's a redirect/proxy issue

**Check**:
1. `.env` file has correct VITE_SUPABASE_URL
2. No hardcoded `localhost` URLs in code
3. Supabase client is initialized correctly

## Recommended Fixes

### Immediate Fix for Loading Spinners

Add a master try-catch-finally to the submit handler:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (isSubmitting) return;

  setIsSubmitting(true);
  let progressToast: any = null;

  try {
    // ALL save logic here
    progressToast = toast.loading('Processing...');

    // ... rest of save logic

    toast.success('Task saved!', { id: progressToast });
  } catch (error) {
    logger.error('Save failed:', error);
    toast.error('Failed to save task', { id: progressToast });
  } finally {
    // ALWAYS clear loading state
    setIsSubmitting(false);
    if (progressToast) {
      toast.dismiss(progressToast);
    }
  }
};
```

### Immediate Fix for Odometer Photo

If the odometer_image is being saved as an object or array instead of a string:

```typescript
// When loading task for edit:
odometer_image: typeof dbTask.odometer_image === 'string'
  ? dbTask.odometer_image
  : Array.isArray(dbTask.odometer_image)
    ? dbTask.odometer_image[0]
    : null
```

## Status

🔴 **CRITICAL** - Loading spinners stuck, preventing users from knowing if save succeeded
🟠 **HIGH** - Odometer photo broken, data might be corrupted
🟡 **MEDIUM** - Connection errors suggest configuration issue

## Next Steps

1. Run SQL query to check odometer_image format
2. Check browser console for full error stack traces
3. Verify Supabase environment variables
4. Apply loading spinner fix to ensure UI always updates
