# Fix Bills Display in Edit Mode

## Problem Identified

When editing an existing maintenance task, **bills/receipts uploaded in service groups were not visible** in the edit form. The file input always showed "No file chosen" even though bills were saved in the database.

### Root Cause

The `ServiceGroupsSection` component used a plain HTML `<input type="file">` element which:
- ❌ Cannot display existing URLs from the `bill_url` array
- ❌ Always shows "No file chosen" when editing
- ❌ Replaced existing bills when uploading new ones (instead of merging)

## The Issue from User's Perspective

1. **View Mode**: Bills displayed correctly ✅
2. **Edit Mode**: 
   - Bills not visible ❌
   - File input shows "No file chosen" ❌
   - Had to re-upload bills every time ❌
3. **After Edit**: Previous bills were **replaced** instead of kept ❌

## Fixes Implemented

### 1. Display Existing Bills in Edit Mode ✅

**File**: `src/components/maintenance/ServiceGroupsSection.tsx` (Lines 976-1024)

Added a preview section that displays existing bills with:
- **Thumbnail previews** for images
- **PDF indicators** for PDF files
- **Count badge** showing "X Bills Already Uploaded"
- **Hover actions**:
  - Delete button (red X) to remove individual bills
  - View button (eye icon) to open in new tab

```typescript
{groupData.bill_url && Array.isArray(groupData.bill_url) && groupData.bill_url.length > 0 && (
  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
      <FileText className="h-4 w-4" />
      {groupData.bill_url.length} Bill{groupData.bill_url.length > 1 ? 's' : ''} Already Uploaded
    </p>
    <div className="grid grid-cols-2 gap-2">
      {groupData.bill_url.map((url: string, idx: number) => (
        // Preview with delete/view buttons
      ))}
    </div>
  </div>
)}
```

### 2. Delete Individual Bills ✅

Users can now remove specific bills without re-uploading everything:

```typescript
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    const newBillUrls = groupData.bill_url.filter((_: string, i: number) => i !== idx);
    onChange({ ...groupData, bill_url: newBillUrls });
  }}
  className="...red delete button..."
>
  <X className="h-3 w-3" />
</button>
```

### 3. Merge New Uploads with Existing Bills ✅

**File**: `src/utils/maintenanceFileUpload.ts` (Lines 214-218)

Changed from **replacing** to **merging** when uploading new bills:

**Before**:
```typescript
const billUrls = await uploadMaintenanceBills(group.bills, taskId, groupIndex);
processedGroup.bill_url = billUrls; // ❌ Replaces existing!
```

**After**:
```typescript
const billUrls = await uploadMaintenanceBills(group.bills, taskId, groupIndex);

// ✅ FIX: Merge new bill URLs with existing ones
const existingBillUrls = Array.isArray(group.bill_url) ? group.bill_url : [];
processedGroup.bill_url = [...existingBillUrls, ...billUrls];
```

### 4. Helpful User Feedback ✅

Added contextual help text:
- **With existing bills**: "Upload additional bills (will be added to existing ones)"
- **Without existing bills**: "Upload new bills/receipts"

## UI/UX Improvements

### Before Fix:
```
Upload Bills/Receipts
[Choose Files] [No file chosen] 📤
```
- No indication of existing bills
- Re-uploading required

### After Fix:
```
Upload Bills/Receipts

┌─────────────────────────────────────┐
│ 📄 2 Bills Already Uploaded         │
├─────────────┬───────────────────────┤
│  [Image 1]  │  [PDF Icon]          │
│   [👁] [❌]  │   [👁] [❌]           │
└─────────────┴───────────────────────┘

[Choose Files] [No file chosen] 📤
Upload additional bills (will be added to existing ones)
```

## Features

### ✅ What Works Now:

1. **Visual Preview**: See thumbnails of existing bills
2. **Individual Delete**: Remove specific bills without affecting others
3. **View Full Size**: Click eye icon to open bill in new tab
4. **Additive Uploads**: New bills are added, not replaced
5. **PDF Support**: PDFs show with icon indicator
6. **Responsive Grid**: 2-column layout for bills
7. **Hover Actions**: Delete/View buttons appear on hover

## Testing the Fix

### Test Case 1: View Existing Bills
1. Open an existing maintenance task with bills
2. Click "Edit"
3. Expand service group details
4. **Expected**: See preview of existing bills ✅

### Test Case 2: Delete a Bill
1. In edit mode, hover over a bill
2. Click the red X button
3. **Expected**: Bill is removed from preview ✅
4. Save task
5. **Expected**: Bill no longer in database ✅

### Test Case 3: Add New Bills
1. In edit mode with existing bills
2. Upload 1 new bill
3. **Expected**: New bill adds to existing (doesn't replace) ✅
4. Save task
5. **Expected**: All bills (old + new) are saved ✅

### Test Case 4: PDF Bills
1. Upload a PDF bill
2. Edit the task
3. **Expected**: PDF shows with file icon ✅

## Files Modified

1. **`src/components/maintenance/ServiceGroupsSection.tsx`**
   - Lines 976-1024: Added bill preview UI
   - Delete functionality
   - View functionality
   - Grid layout

2. **`src/utils/maintenanceFileUpload.ts`**
   - Lines 214-218: Merge logic for bills
   - Preserve existing bill_url array

3. **`FIX_BILLS_DISPLAY_IN_EDIT_MODE.md`** (NEW - this file)

## Impact

- ✅ **Better UX**: Users can see what's already uploaded
- ✅ **No Data Loss**: Existing bills are preserved
- ✅ **Granular Control**: Delete individual bills
- ✅ **Additive Workflow**: Add more bills without re-uploading
- ✅ **Visual Feedback**: Clear indication of uploaded content

## Related Files

This fix is similar to how supporting documents and odometer images work in:
- `MaintenanceTaskPage.tsx` (supporting documents preview)
- `FileUploadWithProgress.tsx` (existing files handling)

## Prevention

To prevent similar issues:
1. Always use `existingFiles` prop pattern for file inputs
2. Implement preview UI for all file upload fields
3. Merge arrays instead of replacing when updating
4. Test both create and edit modes thoroughly

---

**Issue Fixed**: December 8, 2025  
**Root Cause**: Plain file input without existing file preview  
**Solution**: Added preview UI with delete/view actions + merge logic for new uploads





