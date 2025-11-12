# Maintenance Module - Upload System Mapping

## Complete Frontend → Backend Mapping

### Overview
All maintenance uploads use **ONE bucket**: `maintenance-bills`
All files are organization-isolated via RLS policies.

---

## 4 Upload Types

### 1. Upload Bill/Receipts
**Frontend Location:** Service Group → "Add more details" → "Upload bills/receipts"
**User Can Upload:** 4 files max, 8MB each
**File Types:** PNG, JPEG, PDF, Camera capture
**Backend Storage:**
```typescript
maintenance_service_tasks.bill_url: string[]  // Array of public URLs
```
**Bucket:** `maintenance-bills`
**Link:** Per service group (vendor + tasks + cost)

**Example:**
```json
{
  "vendor_id": "vendor-uuid",
  "tasks": ["task-uuid"],
  "service_cost": 8999,
  "bill_url": [
    "https://...maintenance-bills/task-abc-group1.pdf",
    "https://...maintenance-bills/task-abc-group2.jpg"
  ]
}
```

---

### 2. Warranty Paper/Photo
**Frontend Location:** Service Group → "Add more details" → Part Details → "Warranty paper/photo"
**User Can Upload:** 4 files max, 8MB each
**File Types:** PNG, JPEG, PDF, Camera capture
**Backend Storage:**
```typescript
maintenance_service_tasks.battery_warranty_url: string[]  // For batteries
maintenance_service_tasks.tyre_warranty_url: string[]     // For tyres
```
**Bucket:** `maintenance-bills`
**Link:** Per service group, specific to part type

**Example (Tyre):**
```json
{
  "vendor_id": "vendor-uuid",
  "tyre_warranty_url": [
    "https://...maintenance-bills/task-abc-tyre-group1.jpg"
  ],
  "tyre_warranty_expiry_date": "2026-11-12",
  "parts_data": [
    {
      "partType": "tyre",
      "tyrePositions": ["front-left", "front-right"],
      "brand": "MRF",
      "serialNumber": "SN12345"
    }
  ]
}
```

---

### 3. Odometer Photo
**Frontend Location:** Main Task Form → "Odometer photo"
**User Can Upload:** 1 file, 8MB max
**File Types:** PNG, JPEG, Camera capture
**Backend Storage:**
```typescript
maintenance_tasks.odometer_image: string  // Single URL
maintenance_tasks.odometer_reading: number // The actual reading
```
**Bucket:** `maintenance-bills`
**Link:** Per maintenance task (top level)

**Example:**
```json
{
  "id": "task-abc-123",
  "odometer_reading": 42020,
  "odometer_image": "https://...maintenance-bills/task-abc-odometer.jpg"
}
```

---

### 4. Supporting Documents
**Frontend Location:** Main Task Form → "Supporting documents"
**User Can Upload:** 4 files max, 8MB each
**File Types:** PNG, JPEG, PDF, Camera capture
**Backend Storage:**
```typescript
maintenance_tasks.attachments: string[]  // Array of public URLs
```
**Bucket:** `maintenance-bills`
**Link:** Per maintenance task (top level)

**Example:**
```json
{
  "id": "task-abc-123",
  "attachments": [
    "https://...maintenance-bills/task-abc-doc1.pdf",
    "https://...maintenance-bills/task-abc-doc2.jpg"
  ]
}
```

---

## Storage Policies (Active)

### maintenance-bills Bucket Policies

| Policy Name | Operation | Who Can Access |
|------------|-----------|----------------|
| `org_users_can_view_maintenance_bills` | SELECT | Users in same organization |
| `org_users_can_upload_maintenance_bills` | INSERT | Users in same organization |
| `org_users_can_update_maintenance_bills` | UPDATE | Users in same organization |
| `org_admins_can_delete_maintenance_bills` | DELETE | Admins/Owners only |

**Organization Isolation:** File paths include org ID: `{org-id}/{file-name}`
**Security:** RLS checks `organization_users` table to verify user belongs to org

---

## Database Structure

```
maintenance_tasks (1 task)
├── id: "task-abc-123"
├── vehicle_id: "vehicle-xyz"
├── odometer_reading: 42020
├── odometer_image: "https://...odometer.jpg"      ← Upload Type 3
├── attachments: ["https://...doc1.pdf"]            ← Upload Type 4
├── total_cost: 8999 (auto-calculated)
└── service_groups → [...]

maintenance_service_tasks (multiple per task)
├── Group 1:
│   ├── vendor_id: "vendor-uuid"
│   ├── service_cost: 8999
│   ├── bill_url: ["https://...bill.pdf"]          ← Upload Type 1
│   ├── tyre_warranty_url: ["https://...tyre.jpg"] ← Upload Type 2
│   └── parts_data: [{ partType: "tyre", ... }]
```

---

## File Naming Convention

```
{task-id}-group{group-id}.{ext}          // Bills
{task-id}-battery-{group-id}.{ext}       // Battery warranty
{task-id}-tyre-{group-id}.{ext}          // Tyre warranty
{task-id}-odometer.{ext}                 // Odometer photo
{task-id}-doc{index}.{ext}               // Supporting docs
```

---

## View Display (Frontend)

When clicking "View" on a maintenance task, ALL 4 upload types are displayed:

1. **Bills** - Shown per service group (grid of thumbnails)
2. **Warranty Photos** - Shown per service group (grid of thumbnails)
3. **Odometer Photo** - Shown in dedicated section with odometer reading
4. **Supporting Documents** - Shown in dedicated section (grid of thumbnails)

**File:** `src/pages/MaintenanceTaskPage.tsx`
**Lines:** 878-1030

---

## Upload Limits

| Upload Type | Max Files | Max Size Per File | Total Per Task |
|------------|-----------|-------------------|----------------|
| Upload Bills | 4 | 8 MB | 4 × service groups |
| Warranty Photos | 4 | 8 MB | 4 × service groups |
| Odometer Photo | 1 | 8 MB | 1 |
| Supporting Docs | 4 | 8 MB | 4 |

**Note:** As service groups increase, total uploads can scale (each group has its own bills/warranties).

---

## Organization Separation

✅ **Files are isolated by organization**
- File paths include org ID
- RLS policies check `organization_users` table
- Users can only access files from their organization
- Cross-organization access is blocked

**SQL Check:**
```sql
-- Users can only see maintenance bills from their organization
SELECT * FROM storage.objects
WHERE bucket_id = 'maintenance-bills'
  AND ((string_to_array(name, '/'))[1])::uuid IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
  );
```

---

## Cleanup Needed

Run `cleanup_storage_policies.sql` to:
- ✅ Remove policies for unused buckets (battery-warranties, tyre-warranties, part-warranties)
- ✅ Remove old "maintenance" bucket policies (deprecated)
- ✅ Keep only 4 essential policies for `maintenance-bills`

This will reduce policies from **56 → ~35** and eliminate confusion.
