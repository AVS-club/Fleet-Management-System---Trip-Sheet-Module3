# Table Body Reorganization - Complete Code

## Summary of Changes Made:
✅ Updated table minWidth from 2000px to 1400px
✅ Reorganized header columns
✅ Updated colspan from 14 to 11
✅ Updated sticky column offsets

## ❌ Still TODO: Update tbody cells to match new column order

---

## Current tbody Column Order (OLD - WRONG):
1. Serial # + Checkbox
2. Vehicle
3. Task Type
4. Status
5. Priority
6. Created
7. Start/End
8. Downtime
9. Odometer
10. Vendor
11. Cost
12. Complaint
13. Actions

## New tbody Column Order (CORRECT):
1. Serial # + Checkbox
2. Vehicle
3. **Type/Status/Priority** (COMBINED)
4. **Dates** (Start/End)
5. Cost
6. **Vendors** (with service groups)
7. Odometer
8. Downtime
9. Complaint
10. Created
11. Actions

---

## Complete tbody Replacement Code

Find this section in MaintenanceTaskList.tsx (around line 860-970):

```tsx
// START REPLACING FROM HERE:
{/* Vehicle Number - Fixed Left */}
<td
  className="sticky px-2 py-2 z-10 border-r border-gray-200"
  style={{ left: STICKY_COLUMN_OFFSETS.vehicle, backgroundColor: rowBg }}
>
  // ... vehicle content
</td>

{/* Task Type */}
<td className="px-1.5 py-2 whitespace-nowrap">
  // ... task type
</td>

{/* Status */}
<td className="px-1.5 py-2 whitespace-nowrap">
  // ... status
</td>

{/* Priority */}
<td className="px-1.5 py-2 whitespace-nowrap">
  // ... priority
</td>

{/* Created Date */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
  {task.created_at ? formatDate(task.created_at) : '-'}
</td>

{/* Start/End Date - Combined */}
<td className="px-1.5 py-2 text-gray-700">
  // ... dates
</td>

{/* Downtime */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
  {downtimeHours > 0 ? `${downtimeHours}h` : '-'}
</td>

{/* Odometer */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
  {task.odometer_reading ? `${task.odometer_reading.toLocaleString()}` : '-'}
</td>

{/* Vendor/Garage */}
<td className="px-1.5 py-2 text-xs text-gray-700">
  // ... vendor
</td>

{/* Total Cost */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs font-semibold text-gray-900 text-right">
  {formatCurrency(task.total_cost || 0)}
</td>

{/* Complaint/Resolution Description */}
<td className="px-1.5 py-2 text-[10px] text-gray-700">
  // ... complaint
</td>
// STOP REPLACING HERE
```

### Replace With This NEW Code:

```tsx
{/* Vehicle Number - Fixed Left */}
<td
  className="sticky px-2 py-2 z-10 border-r border-gray-200"
  style={{ left: STICKY_COLUMN_OFFSETS.vehicle, backgroundColor: rowBg }}
>
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewTask?.(task);
        }}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {vehicle?.registration_number || 'Unknown'}
      </button>
    </div>
    {/* Show max 1 tag, hide rest with "+n" */}
    {vehicle?.tags && vehicle.tags.length > 0 && (
      <div className="ml-6 flex gap-1">
        <VehicleTagBadges
          tags={vehicle.tags.slice(0, 1)}
          readOnly
          size="xs"
          maxDisplay={1}
        />
        {vehicle.tags.length > 1 && (
          <span className="text-xs text-gray-500">+{vehicle.tags.length - 1}</span>
        )}
      </div>
    )}
  </div>
</td>

{/* Type/Status/Priority - COMBINED */}
<td className="px-1.5 py-2">
  <div className="flex flex-col gap-1">
    {/* Task Type */}
    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded truncate">
      {getTaskTypeBadge(task.task_type || '')}
    </span>
    {/* Status + Priority on same line */}
    <div className="flex gap-1">
      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
        {task.status.replace('_', ' ')}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
        {task.priority}
      </span>
    </div>
  </div>
</td>

{/* Dates (Start/End) - COMPACT */}
<td className="px-1.5 py-2 text-gray-700">
  <div className="text-xs space-y-0.5">
    <div className="flex items-center gap-1">
      <span className="text-gray-500">S:</span>
      <span className="font-medium">{formatDate(task.start_date)}</span>
    </div>
    <div className="flex items-center gap-1">
      <span className="text-gray-500">E:</span>
      <span className="font-medium">{formatDate(task.end_date)}</span>
    </div>
  </div>
</td>

{/* Total Cost */}
<td className="px-1.5 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
  {formatCurrency(task.total_cost || 0)}
</td>

{/* Vendors */}
<td className="px-1.5 py-2 text-xs text-gray-700">
  <div className="space-y-1 max-w-[200px]">
    {task.service_groups && task.service_groups.length > 0 ? (
      <>
        {task.service_groups.slice(0, 2).map((group: any, i: number) => {
          const vName = vendorsMap.get(group.vendor_id) || 'Unknown';
          const taskCount = Array.isArray(group.tasks) ? group.tasks.length : 0;
          return (
            <div key={i} className="flex items-center gap-1 truncate">
              <span className="font-medium truncate">{i+1}. {vName}</span>
              <span className="text-gray-500">({taskCount})</span>
            </div>
          );
        })}
        {task.service_groups.length > 2 && (
          <div className="text-blue-600 text-xs">
            +{task.service_groups.length - 2} more
          </div>
        )}
      </>
    ) : vendorName ? (
      <span className="truncate block" title={vendorName}>
        {vendorName}
      </span>
    ) : (
      <span className="text-gray-400">—</span>
    )}
  </div>
</td>

{/* Odometer */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
  {task.odometer_reading ? `${task.odometer_reading.toLocaleString()}` : '—'}
</td>

{/* Downtime */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
  {downtimeHours > 0 ? `${downtimeHours}h` : '—'}
</td>

{/* Complaint */}
<td className="px-1.5 py-2 text-xs text-gray-700">
  {task.complaint_description ? (
    <div
      className="truncate cursor-help hover:text-gray-900 max-w-[150px]"
      title={task.complaint_description}
    >
      📝 {task.complaint_description}
    </div>
  ) : (
    <span className="text-gray-400">—</span>
  )}
</td>

{/* Created Date */}
<td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
  {task.created_at ? formatDate(task.created_at) : '—'}
</td>
```

---

## Benefits of This Reorganization:

✅ **600px width saved** (from 2000px to 1400px)
✅ **More compact** - Excel-like feel
✅ **Better information density** - Type/Status/Priority in one cell
✅ **Vendor details** - Shows service groups with task counts
✅ **Tooltip on complaint** - Hover to see full text
✅ **Cleaner dashes** - Uses "—" instead of "-" for empty cells

---

## Next Steps:

1. Open `MaintenanceTaskList.tsx`
2. Find the tbody section (around line 860)
3. Replace all the cells from "Vehicle" to "Complaint" with the NEW code above
4. Keep the Actions cell unchanged
5. Save and test!
