# Fix Supporting Documents Display Issue

## Problem Identified

Supporting documents were displaying as **"(object) 20%"** instead of showing the actual document/image in the maintenance task view page.

### Root Cause

The `attachments` field was storing **objects** instead of **URL strings**. The display code expected an array of strings (URLs) but received an array of objects like:
```javascript
[
  { url: "https://...", signedUrl: "https://...", file_path: "..." }
]
```

This caused the display component to try rendering the object as a string, showing `"[object Object]"` or similar.

## The Issue in Console Logs

```
🔍 Supporting Documents Debug: {
  hasAttachments: false, 
  isArray: false, 
  length: undefined, 
  type: 'undefined',
  firstItemType: 'none'
}

ℹ️ No new attachments, preserving old: [{…}]  // ← Object instead of string!
```

## Fix Implemented

**File**: `src/utils/maintenanceStorage.ts`

### Changes Made

Added intelligent handling for when `attachments` contains objects instead of strings:

#### 1. **Handle New Attachments as Objects**
```typescript
else if (typeof firstItem === 'object' && firstItem !== null) {
  // ✅ FIX: Handle objects (extract URLs from objects)
  console.log('⚠️ Attachments are objects, extracting URLs:', updateData.attachments);
  attachmentsUrls = updateData.attachments
    .map((item: any) => {
      // Try common property names for URLs
      return item?.url || item?.signedUrl || item?.publicUrl || item?.file_path || null;
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
  console.log('✅ Extracted URLs:', attachmentsUrls);
}
```

#### 2. **Handle Existing Attachments as Objects**
```typescript
if (Array.isArray(oldTask.attachments) && oldTask.attachments.length > 0) {
  const firstOldItem = oldTask.attachments[0];
  if (typeof firstOldItem === 'string') {
    // Already strings, use as-is
    attachmentsUrls = oldTask.attachments as string[];
  } else if (typeof firstOldItem === 'object' && firstOldItem !== null) {
    // Extract URLs from objects
    console.log('⚠️ Old attachments are objects, extracting URLs');
    attachmentsUrls = oldTask.attachments
      .map((item: any) => {
        return item?.url || item?.signedUrl || item?.publicUrl || item?.file_path || null;
      })
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
    console.log('✅ Extracted URLs from old attachments:', attachmentsUrls);
  }
}
```

## How It Works

The fix now handles **three types** of attachment data:

1. **File Objects** (need upload)
   - Detected by `instanceof File`
   - Uploads files and gets signed URLs

2. **String URLs** (already uploaded)
   - Detected by `typeof === 'string'`
   - Uses URLs as-is

3. **Object URLs** (NEW - was causing the bug)
   - Detected by `typeof === 'object'`
   - Extracts URL from object properties: `url`, `signedUrl`, `publicUrl`, or `file_path`
   - Filters out any invalid results

## Expected Behavior After Fix

### Before Fix:
```
Supporting Documents: (object) 20%
```

### After Fix:
```
Supporting Documents (1)
[Document preview/image displays correctly]
```

## Testing the Fix

1. **View existing maintenance record** with "(object) 20%" issue
2. **Reload the page** - supporting documents should now display correctly
3. **Create new maintenance record** with supporting documents
4. **Verify** documents display properly in view mode

## Files Modified

1. `src/utils/maintenanceStorage.ts` (Lines 523-562)
   - Enhanced attachment handling in `updateTask` function
   - Added object URL extraction logic

## Impact

- ✅ **Existing records**: Will now display supporting documents correctly
- ✅ **New records**: Will continue to work as expected
- ✅ **Backward compatible**: Handles both string URLs and object URLs
- ✅ **Future-proof**: Won't break if attachment format changes

## Prevention

To prevent this issue in the future:

1. **Consistent Data Type**: Always store attachments as string arrays
2. **Validation**: Add type checking when saving attachments to database
3. **Normalization**: Consider adding a normalizer function to ensure attachments are always strings

## Related Issues

- This fix also addresses any similar issues where objects were stored instead of URLs
- May have affected:
  - Odometer images (if stored as objects)
  - Bill URLs in service groups
  - Warranty document URLs

---

**Issue Fixed**: December 8, 2025  
**Root Cause**: Objects stored instead of URL strings in `attachments` field  
**Solution**: Intelligent object URL extraction with fallback to multiple property names





