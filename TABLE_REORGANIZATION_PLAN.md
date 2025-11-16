# Maintenance Tasks Table Reorganization Plan

## Current Column Order (2000px width):
1. # (Serial + Checkbox) - 50px
2. Vehicle - 120px
3. Task Type - 85px
4. Status - 80px
5. Priority - 75px
6. Created - 100px
7. Start/End - 95px
8. Downtime - 70px
9. Odometer - 90px
10. Vendor - 120px
11. Cost - 100px
12. Complaint/Resolution - 150px
13. Actions - 60px

**Total: ~2000px - Too wide!**

---

## NEW Optimized Column Order (1400px width):

### Sticky Left Columns:
1. **# (Row Number)** - 50px - Serial number + checkbox
2. **VEHICLE** - 140px - Registration + Tags (stacked)

### Scrollable Columns (Priority Order):
3. **TYPE/STATUS/PRIORITY** - 160px - Combined vertical (SPACE SAVER!)
4. **DATES** - 120px - Start/End stacked compactly
5. **COST (₹)** - 100px - Right-aligned, bold
6. **VENDORS** - 200px - List with task counts
7. **ODOMETER** - 90px - km reading
8. **DOWNTIME** - 80px - hours/days
9. **COMPLAINT** - 150px - Truncated with tooltip
10. **CREATED** - 100px - Date only

### Sticky Right Column:
11. **ACTIONS** - 120px - View/Edit buttons

**Total: ~1400px - Much better!**

---

## Space-Saving Techniques:

### 1. Combined TYPE/STATUS/PRIORITY Column (160px):
```tsx
<div className="flex flex-col gap-1">
  {/* Task Type */}
  <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded truncate">
    {formatTaskType(task.task_type)}
  </span>

  {/* Status + Priority on same line */}
  <div className="flex gap-1">
    <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
      {task.status}
    </span>
    <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
      {task.priority}
    </span>
  </div>
</div>
```

### 2. Compact DATES Column (120px):
```tsx
<div className="text-xs space-y-0.5">
  <div className="flex items-center gap-1">
    <span className="text-gray-500">S:</span>
    <span className="font-medium">{format(startDate, 'dd MMM')}</span>
  </div>
  <div className="flex items-center gap-1">
    <span className="text-gray-500">E:</span>
    <span className="font-medium">{format(endDate, 'dd MMM')}</span>
  </div>
</div>
```

### 3. Compact VEHICLE Column (140px):
```tsx
<div className="space-y-1">
  <div className="flex items-center gap-2">
    <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
    <span className="font-medium text-gray-900">{vehicle.registration_number}</span>
  </div>
  {/* Show max 1 tag, hide rest with "+n" */}
  {vehicle.tags && vehicle.tags.length > 0 && (
    <div className="flex gap-1">
      <VehicleTagBadges
        tags={vehicle.tags.slice(0, 1)}
        maxVisible={1}
        size="xs"
      />
      {vehicle.tags.length > 1 && (
        <span className="text-xs text-gray-500">+{vehicle.tags.length - 1}</span>
      )}
    </div>
  )}
</div>
```

### 4. VENDORS Column with Collapse (200px):
```tsx
<div className="text-xs space-y-1">
  {serviceGroups.slice(0, 2).map((group, i) => (
    <div key={i} className="flex items-center gap-1 truncate">
      <span className="font-medium truncate">{i+1}. {vendorName}</span>
      <span className="text-gray-500">({group.tasks.length})</span>
    </div>
  ))}
  {serviceGroups.length > 2 && (
    <button className="text-blue-600 hover:underline text-xs">
      +{serviceGroups.length - 2} more
    </button>
  )}
</div>
```

### 5. COMPLAINT Column with Tooltip (150px):
```tsx
<div className="text-xs max-w-[150px]">
  {task.complaint_description ? (
    <div
      className="truncate cursor-help hover:text-gray-900"
      title={task.complaint_description}
    >
      📝 {task.complaint_description}
    </div>
  ) : (
    <span className="text-gray-400">—</span>
  )}
</div>
```

---

## Implementation Checklist:

- [ ] Update table minWidth from 2000px to 1400px
- [ ] Combine Type/Status/Priority into single column
- [ ] Compact Dates column (start/end stacked)
- [ ] Update Vehicle column with max 1 tag visible
- [ ] Add Vendors column with collapse for > 2 vendors
- [ ] Add tooltip to Complaint column
- [ ] Update sticky column offsets
- [ ] Update colspan in empty state from 14 to 11
- [ ] Test horizontal scroll with sticky columns
- [ ] Add total row at bottom

---

## Total Row at Bottom:
```tsx
<tfoot className="bg-gray-50 border-t-2 border-gray-300 sticky bottom-0">
  <tr>
    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">
      Total ({tasks.length} tasks)
    </td>
    <td colSpan={2}></td>
    <td className="px-2 py-3 text-right text-sm font-bold text-gray-900">
      ₹{totalCost.toLocaleString('en-IN')}
    </td>
    <td colSpan={6}></td>
  </tr>
</tfoot>
```

---

**Benefits:**
- ✅ 600px width reduction (30% smaller!)
- ✅ More information density
- ✅ Excel-like compact feel
- ✅ Faster horizontal scanning
- ✅ Sticky left (vehicle) + sticky right (actions)
