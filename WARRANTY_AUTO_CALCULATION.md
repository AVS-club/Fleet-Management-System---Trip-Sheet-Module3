# Warranty Auto-Calculation Feature - COMPLETED ✅

## Overview
Automatic warranty expiry date calculation and display based on parts warranty periods.

## How It Works

### 1. Calculation (Backend)
When a maintenance task is created or updated with parts that have warranty periods:

**Process**:
1. Collect all warranty periods from parts (e.g., "12 months", "36 months", "48 months")
2. Calculate expiry date from task completion date (end_date)
3. Use the **longest warranty** period from all parts
4. Auto-populate `warranty_expiry` and `warranty_status` fields

**Example**:
```
Task completed: Jan 15, 2025
Parts:
  - Battery: 36 months warranty → Expires Jan 15, 2028
  - Tyre: 12 months warranty → Expires Jan 15, 2026

Result: warranty_expiry = Jan 15, 2028 (longest period)
```

### 2. Status Calculation
**Warranty Status** (`warranty_status`):
- `valid` - Warranty is still active
- `expired` - Warranty has passed expiry date
- `not_applicable` - No warranty information

**Visual Indicators**:
- 🟢 **Active** (> 30 days remaining) - Green badge
- 🟠 **Expiring Soon** (≤ 30 days remaining) - Orange badge
- 🔴 **Expired** (past expiry date) - Red badge
- ⚫ **No Warranty** - Gray badge

### 3. Display (Frontend)
Warranty section appears in maintenance task view showing:
- **Warranty Expiry Date** - With countdown of days remaining
- **Warranty Status** - Color-coded badge (Active/Expiring Soon/Expired)
- **Warranty Claimed** - Yes/No indicator

## Database Fields

### maintenance_tasks Table
| Field | Type | Description |
|-------|------|-------------|
| `warranty_expiry` | DATE | Auto-calculated from parts warranty periods |
| `warranty_status` | VARCHAR(50) | "valid" \| "expired" \| "not_applicable" |
| `warranty_claimed` | BOOLEAN | Has warranty been claimed? (default: false) |

## Code Implementation

### Files Created/Modified

#### 1. `src/utils/warrantyCalculations.ts` (NEW)
Utility functions for warranty calculations:
- `calculateWarrantyExpiryDate()` - Calculate expiry from start date + duration
- `getWarrantyStatus()` - Determine status and styling based on expiry
- `formatWarrantyExpiryDate()` - Format date for display
- `calculateTaskWarranty()` - Calculate task-level warranty from all parts

#### 2. `src/utils/maintenanceStorage.ts` (MODIFIED)
**createTask()** - Lines 202-214
```typescript
// Calculate warranty expiry and status based on parts in service groups
const warrantyInfo = calculateTaskWarranty(
  service_groups || [],
  taskData.end_date || taskData.start_date
);

const payload = withOwner({
  ...taskData,
  warranty_expiry: warrantyInfo.warranty_expiry,
  warranty_status: warrantyInfo.warranty_status,
  warranty_claimed: false, // Default to false on creation
}, userId, organizationId);
```

**updateTask()** - Lines 432-444
```typescript
// Calculate warranty expiry and status if service groups are being updated
let warrantyUpdates = {};
if (service_groups && service_groups.length > 0) {
  const warrantyInfo = calculateTaskWarranty(
    service_groups,
    updateData.end_date || oldTask.end_date || updateData.start_date || oldTask.start_date
  );
  warrantyUpdates = {
    warranty_expiry: warrantyInfo.warranty_expiry,
    warranty_status: warrantyInfo.warranty_status,
  };
}
```

#### 3. `src/pages/MaintenanceTaskPage.tsx` (MODIFIED)
**Warranty Display Section** - Lines 1006-1069
Shows warranty information card with:
- Warranty expiry date (color-coded background)
- Status badge
- Claimed status
- Days remaining countdown

## Features

### ✅ Automatic Calculation
- Calculates on task creation/update
- Uses task completion date (end_date) as warranty start
- Selects longest warranty from all parts

### ✅ Smart Status Detection
- Active: More than 30 days remaining
- Expiring Soon: 30 days or less remaining
- Expired: Past expiry date
- Color-coded for quick visual recognition

### ✅ Clean UI Display
- Only shows when warranty exists
- Color-coded cards matching status
- Days remaining countdown
- Professional gradient design

### ✅ Multi-Part Support
- Handles multiple parts with different warranty periods
- Uses longest warranty as task warranty
- Considers all service groups

## Example Scenarios

### Scenario 1: Battery Replacement
```
Task: Battery Replacement
End Date: Nov 16, 2025
Parts:
  - Battery (Brand: Exide, 36 months warranty)

Result:
  warranty_expiry: Nov 16, 2028
  warranty_status: "valid"
  Display: Green "Active" badge, "1095 days remaining"
```

### Scenario 2: Multiple Parts
```
Task: Major Service
End Date: Nov 16, 2025
Parts:
  - Engine Oil (12 months warranty)
  - Air Filter (12 months warranty)
  - Brake Pads (36 months warranty)
  - Spark Plugs (24 months warranty)

Result:
  warranty_expiry: Nov 16, 2028  (longest: brake pads 36m)
  warranty_status: "valid"
  Display: Green "Active" badge
```

### Scenario 3: Expiring Soon
```
Task: Tyre Replacement
End Date: Dec 01, 2024
Parts:
  - Tyres (12 months warranty)

Result:
  warranty_expiry: Dec 01, 2025
  warranty_status: "valid"
  Display: Orange "Expiring Soon" badge, "15 days remaining"
```

### Scenario 4: Expired Warranty
```
Task: Old Repair
End Date: Jan 01, 2023
Parts:
  - Parts with 12 months warranty

Result:
  warranty_expiry: Jan 01, 2024
  warranty_status: "expired"
  Display: Red "Expired" badge
```

## Warranty Period Options

Available in part replacement form:
- **12m** - 12 months warranty
- **36m** - 36 months warranty
- **48m** - 48 months warranty

Users select these when adding parts to service groups.

## Testing Checklist

- [ ] Create task with 12-month warranty part - verify expiry calculated
- [ ] Create task with 36-month warranty part - verify expiry calculated
- [ ] Create task with multiple parts - verify longest warranty used
- [ ] View task - verify warranty section displays correctly
- [ ] Check active warranty shows green badge
- [ ] Check expiring soon (< 30 days) shows orange badge
- [ ] Check expired warranty shows red badge
- [ ] Verify days remaining countdown accurate
- [ ] Update task with new parts - verify warranty recalculates
- [ ] Task without warranty parts - verify no warranty section shows

## Benefits

1. **Automated** - No manual calculation required
2. **Accurate** - Based on actual part warranty periods
3. **Visual** - Color-coded status for quick recognition
4. **Proactive** - "Expiring Soon" alerts (30 days)
5. **Comprehensive** - Tracks warranty status, expiry, and claims
6. **User-Friendly** - Clean, intuitive display in view mode

## Status

✅ **COMPLETE** - Warranty auto-calculation fully implemented!

**Date**: November 16, 2025
**Feature**: Auto-calculate and display warranty information
**Database**: Uses existing warranty_expiry, warranty_status, warranty_claimed fields
**Calculation**: Based on parts warranty periods (12m, 36m, 48m)
