# Database Schema Documentation

> **📌 Purpose:** Complete reference for all database tables, columns, constraints, and relationships. Use this to prevent SQL errors and understand the database structure.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Core Tables](#core-tables)
  - [vehicles](#vehicles)
  - [drivers](#drivers)
  - [trips](#trips)
  - [destinations](#destinations)
  - [maintenance_tasks](#maintenance_tasks)
- [Document Management](#document-management)
  - [vehicle_documents](#vehicle_documents)
  - [driver_documents](#driver_documents)
- [Maintenance & Service](#maintenance--service)
  - [maintenance_tasks](#maintenance_tasks)
  - [maintenance_entries](#maintenance_entries)
  - [maintenance_service_tasks](#maintenance_service_tasks)
  - [maintenance_audit_logs](#maintenance_audit_logs)
  - [parts_replacements](#parts_replacements)
  - [warehouses](#warehouses)
- [Reminder & Alert System](#reminder--alert-system)
  - [reminder_tracking](#reminder_tracking)
  - [alert_thresholds](#alert_thresholds)
- [Tagging System](#tagging-system)
  - [tags](#tags)
  - [vehicle_tags](#vehicle_tags)
  - [vehicle_tag_history](#vehicle_tag_history)
- [Trip Management](#trip-management)
  - [trip_corrections](#trip_corrections)
  - [fuel_efficiency_baselines](#fuel_efficiency_baselines)
- [KPI & Analytics](#kpi--analytics)
  - [kpi_cards](#kpi_cards)
  - [events_feed](#events_feed)
- [Multi-tenancy](#multi-tenancy)
  - [organizations](#organizations)
  - [organization_users](#organization_users)
  - [profiles](#profiles)
- [Utilities](#utilities)
  - [short_urls](#short_urls)
- [How to Query Examples](#how-to-query-examples)

---

## Overview

### Schema Statistics
- **Total Tables:** 24+ tables
- **Total Migrations:** 46+ migration files
- **Database Type:** PostgreSQL (via Supabase)
- **RLS Enabled:** Yes (all tables)
- **Multi-tenant:** Yes (organization-based)

### Common Patterns
- All tables use `uuid` for primary keys (except junction tables)
- All tables have `created_at` and `updated_at` timestamps
- Most tables have `added_by` (uuid) referencing `auth.users`
- Most tables have `organization_id` (uuid) for multi-tenancy
- RLS policies enforce organization-based access

---

## Core Tables

### vehicles

**Purpose:** Master table for all vehicle information

**Migration:** `complete_database_setup.sql`, enhanced in multiple migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique vehicle identifier |
| `registration_number` | text | UNIQUE, NOT NULL | - | Vehicle registration/license plate |
| `make` | text | NOT NULL | - | Vehicle manufacturer (e.g., "Tata", "Ashok Leyland") |
| `model` | text | NOT NULL | - | Vehicle model |
| `type` | text | - | - | Vehicle type (e.g., "Truck", "Trailer") |
| `fuel_type` | text | - | - | Fuel type (e.g., "Diesel", "Petrol", "Electric") |
| `capacity` | numeric | - | - | Load capacity in tons or liters |
| `current_odometer` | numeric | NOT NULL | 0 | Current odometer reading in km |
| `purchase_date` | date | - | - | Date vehicle was purchased |
| `status` | text | - | 'active' | Vehicle status: 'active', 'maintenance', 'inactive' |
| `notes` | text | - | - | Additional notes about the vehicle |
| `organization_id` | uuid | FK → organizations | - | Organization owning this vehicle |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who added the vehicle |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `registration_number`
- INDEX on `status`
- INDEX on `organization_id`
- INDEX on `added_by`

**Foreign Keys:**
- `organization_id` → `organizations(id)` ON DELETE CASCADE
- `added_by` → `auth.users(id)` ON DELETE SET NULL

**Related Tables:**
- `trips` - Many trips per vehicle
- `maintenance_tasks` - Many maintenance records per vehicle
- `vehicle_documents` - Many documents per vehicle
- `vehicle_tags` - Many tags per vehicle
- `fuel_efficiency_baselines` - One baseline per vehicle

**RLS Policies:**
- Users can only see vehicles in their organization
- Users can only insert/update vehicles in their organization

**Frontend Usage Example:**
```typescript
// Fetch all active vehicles
const { data: vehicles, error } = await supabase
  .from('vehicles')
  .select('*')
  .eq('status', 'active')
  .order('registration_number');

// Insert new vehicle
const { data, error } = await supabase
  .from('vehicles')
  .insert({
    registration_number: 'MH-01-AB-1234',
    make: 'Tata',
    model: 'LPT 1918',
    type: 'Truck',
    fuel_type: 'Diesel',
    capacity: 18,
    current_odometer: 0,
    status: 'active'
  });
```

---

### drivers

**Purpose:** Master table for driver information

**Migration:** `complete_database_setup.sql`, enhanced in `20250131000001_add_driver_document_columns.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique driver identifier |
| `name` | text | NOT NULL | - | Full name of driver |
| `phone` | text | UNIQUE | - | Contact phone number |
| `email` | text | UNIQUE | - | Email address |
| `license_number` | text | UNIQUE | - | Driving license number |
| `license_expiry` | date | - | - | License expiry date |
| `date_of_birth` | date | - | - | Driver's date of birth |
| `address` | text | - | - | Residential address |
| `status` | text | - | 'active' | Driver status: 'active', 'inactive', 'on_leave' |
| `notes` | text | - | - | Additional notes |
| `license_document_url` | text | - | - | URL to license document in storage |
| `aadhar_document_url` | text | - | - | URL to Aadhar document in storage |
| `pan_document_url` | text | - | - | URL to PAN document in storage |
| `photo_url` | text | - | - | URL to driver photo in storage |
| `organization_id` | uuid | FK → organizations | - | Organization employing this driver |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who added the driver |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `phone`, `email`, `license_number`
- INDEX on `status`
- INDEX on `organization_id`

**Foreign Keys:**
- `organization_id` → `organizations(id)` ON DELETE CASCADE
- `added_by` → `auth.users(id)` ON DELETE SET NULL

**Related Tables:**
- `trips` - Many trips per driver
- `driver_documents` - Many documents per driver

**RLS Policies:**
- Users can only see drivers in their organization
- Users can only insert/update drivers in their organization

**Frontend Usage Example:**
```typescript
// Fetch all active drivers with stats
const { data: drivers, error } = await supabase
  .rpc('get_driver_stats')
  .eq('status', 'active');

// Insert new driver
const { data, error } = await supabase
  .from('drivers')
  .insert({
    name: 'John Doe',
    phone: '+919876543210',
    license_number: 'MH-0120220012345',
    license_expiry: '2027-12-31',
    status: 'active'
  });
```

---

### trips

**Purpose:** Record all trip information including P&L tracking

**Migration:** `complete_database_setup.sql`, enhanced in `20250703171029_square_fountain.sql` (P&L fields)

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique trip identifier |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Vehicle used for trip |
| `driver_id` | uuid | FK → drivers | - | Driver assigned to trip |
| `start_destination_id` | uuid | FK → destinations | - | Starting location |
| `end_destination_id` | uuid | FK → destinations | - | Ending location |
| `start_date` | timestamptz | NOT NULL | - | Trip start date & time |
| `end_date` | timestamptz | - | - | Trip end date & time |
| `start_odometer` | numeric | NOT NULL | - | Odometer reading at start (km) |
| `end_odometer` | numeric | - | - | Odometer reading at end (km) |
| `distance` | numeric | GENERATED | - | Auto-calculated: end - start odometer |
| `fuel_consumed` | numeric | - | - | Fuel consumed in liters |
| `cargo_weight` | numeric | - | - | Cargo weight in tons |
| `cargo_description` | text | - | - | Description of cargo |
| **Billing Fields** | | | | |
| `billing_type` | billing_type | - | - | ENUM: 'per_km', 'per_ton', 'manual' |
| `billing_rate` | numeric | - | - | Rate per km/ton or manual amount |
| `total_billing_amount` | numeric | - | 0 | Total billed to client |
| **Income Fields** | | | | |
| `freight_amount` | numeric | - | 0 | Freight income |
| `advance_payment` | numeric | - | 0 | Advance received |
| `balance_payment` | numeric | - | 0 | Balance payment |
| `detention_charges` | numeric | - | 0 | Detention charges income |
| `other_income` | numeric | - | 0 | Other income |
| `total_income` | numeric | - | 0 | Sum of all income |
| **Expense Fields** | | | | |
| `fuel_expense` | numeric | - | 0 | Fuel cost |
| `toll_expense` | numeric | - | 0 | Toll charges |
| `driver_expense` | numeric | - | 0 | Driver salary/allowance |
| `maintenance_expense` | numeric | - | 0 | Maintenance cost during trip |
| `other_expense` | numeric | - | 0 | Other expenses |
| `total_expenses` | numeric | - | 0 | Sum of all expenses |
| **P&L Fields** | | | | |
| `net_profit_loss` | numeric | - | 0 | total_income - total_expenses |
| `profit_status` | profit_status | - | - | ENUM: 'profit', 'loss', 'neutral' |
| `status` | text | - | 'planned' | Trip status: 'planned', 'in_progress', 'completed', 'cancelled' |
| `notes` | text | - | - | Additional trip notes |
| `organization_id` | uuid | FK → organizations | - | Organization managing this trip |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who created the trip |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `vehicle_id`, `driver_id`, `start_date`, `status`
- INDEX on `organization_id`

**Foreign Keys:**
- `vehicle_id` → `vehicles(id)` ON DELETE CASCADE
- `driver_id` → `drivers(id)` ON DELETE SET NULL
- `start_destination_id` → `destinations(id)` ON DELETE SET NULL
- `end_destination_id` → `destinations(id)` ON DELETE SET NULL
- `organization_id` → `organizations(id)` ON DELETE CASCADE

**Related Tables:**
- `trip_corrections` - Odometer corrections for this trip
- `trip_pnl_report_view` - Materialized view for P&L reports

**RLS Policies:**
- Users can only see trips in their organization

**Frontend Usage Example:**
```typescript
// Fetch trips with vehicle and driver info
const { data: trips, error } = await supabase
  .from('trips')
  .select(`
    *,
    vehicle:vehicles(registration_number, make, model),
    driver:drivers(name, phone),
    start_destination:destinations(name),
    end_destination:destinations(name)
  `)
  .eq('status', 'completed')
  .order('start_date', { ascending: false });

// Insert new trip with P&L
const { data, error } = await supabase
  .from('trips')
  .insert({
    vehicle_id: '...',
    driver_id: '...',
    start_date: '2025-11-01T08:00:00',
    start_odometer: 125000,
    billing_type: 'per_km',
    billing_rate: 25,
    status: 'in_progress'
  });
```

---

### destinations

**Purpose:** Master table for locations (loading/unloading points)

**Migration:** `complete_database_setup.sql`, enhanced in `20250918103736_delicate_silence.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique destination identifier |
| `name` | text | NOT NULL | - | Location name |
| `address` | text | - | - | Full address |
| `city` | text | - | - | City name |
| `state` | text | - | - | State name |
| `pincode` | text | - | - | Postal code |
| `contact_person` | text | - | - | Contact person at location |
| `contact_phone` | text | - | - | Contact phone number |
| `latitude` | numeric | - | - | GPS latitude |
| `longitude` | numeric | - | - | GPS longitude |
| `notes` | text | - | - | Additional notes |
| `organization_id` | uuid | FK → organizations | - | Organization owning this destination |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who added destination |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `name`, `city`, `state`
- INDEX on `organization_id`

**Foreign Keys:**
- `organization_id` → `organizations(id)` ON DELETE CASCADE
- `added_by` → `auth.users(id)` ON DELETE SET NULL

**Related Tables:**
- `trips` - Referenced as start/end destinations

**Frontend Usage Example:**
```typescript
// Fetch all destinations
const { data: destinations, error } = await supabase
  .from('destinations')
  .select('*')
  .order('name');
```

---

### maintenance_tasks

**Purpose:** Track vehicle maintenance and repair activities

**Migration:** `complete_database_setup.sql`, enhanced in `20250120000003_enhanced_downtime_schema.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique maintenance task identifier |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Vehicle being serviced |
| `maintenance_type` | text | NOT NULL | - | Type: 'service', 'repair', 'inspection', 'breakdown' |
| `description` | text | NOT NULL | - | Description of work performed |
| `scheduled_date` | date | - | - | Scheduled maintenance date |
| `completed_date` | date | - | - | Actual completion date |
| `cost` | numeric | - | 0 | Total maintenance cost |
| `odometer_reading` | numeric | - | - | Odometer at time of service |
| `service_provider` | text | - | - | Name of service provider/garage |
| `status` | text | - | 'pending' | Status: 'pending', 'in_progress', 'completed', 'cancelled' |
| `downtime_start` | timestamptz | - | - | When vehicle became unavailable |
| `downtime_end` | timestamptz | - | - | When vehicle became available again |
| `downtime_hours` | numeric | GENERATED | - | Auto-calculated downtime duration |
| `notes` | text | - | - | Additional notes |
| `organization_id` | uuid | FK → organizations | - | Organization managing this maintenance |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who created record |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `vehicle_id`, `status`, `maintenance_type`
- INDEX on `organization_id`

**Foreign Keys:**
- `vehicle_id` → `vehicles(id)` ON DELETE CASCADE
- `organization_id` → `organizations(id)` ON DELETE CASCADE

**Related Tables:**
- `maintenance_service_tasks` - Detailed service items
- `maintenance_audit_logs` - Audit trail
- `parts_replacements` - Parts replaced during maintenance

**Frontend Usage Example:**
```typescript
// Fetch maintenance tasks for a vehicle
const { data: tasks, error } = await supabase
  .from('maintenance_tasks')
  .select('*')
  .eq('vehicle_id', vehicleId)
  .order('scheduled_date', { ascending: false });
```

---

## Document Management

### vehicle_documents

**Purpose:** Store vehicle-related documents (insurance, permits, RC, etc.)

**Migration:** `complete_database_setup.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique document identifier |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Vehicle this document belongs to |
| `document_type` | text | NOT NULL | - | Type: 'insurance', 'permit', 'rc', 'pollution', 'fitness', 'other' |
| `document_number` | text | - | - | Document reference number |
| `issue_date` | date | - | - | Document issue date |
| `expiry_date` | date | - | - | Document expiry date |
| `file_url` | text | - | - | URL to document file in Supabase storage |
| `file_name` | text | - | - | Original file name |
| `file_size` | integer | - | - | File size in bytes |
| `notes` | text | - | - | Additional notes |
| `organization_id` | uuid | FK → organizations | - | Organization owning this document |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who uploaded document |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `vehicle_id`, `document_type`, `expiry_date`

**Foreign Keys:**
- `vehicle_id` → `vehicles(id)` ON DELETE CASCADE
- `organization_id` → `organizations(id)` ON DELETE CASCADE

**Storage Bucket:** `vehicle-documents`

**Frontend Usage Example:**
```typescript
// Upload vehicle document
const file = event.target.files[0];
const filePath = `${vehicleId}/${Date.now()}_${file.name}`;

// 1. Upload to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('vehicle-documents')
  .upload(filePath, file);

// 2. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('vehicle-documents')
  .getPublicUrl(filePath);

// 3. Insert document record
const { data, error } = await supabase
  .from('vehicle_documents')
  .insert({
    vehicle_id: vehicleId,
    document_type: 'insurance',
    document_number: 'INS-2025-12345',
    issue_date: '2025-01-01',
    expiry_date: '2026-01-01',
    file_url: publicUrl,
    file_name: file.name,
    file_size: file.size
  });
```

---

### driver_documents

**Purpose:** Store driver-related documents (license, Aadhar, PAN, etc.)

**Migration:** `complete_database_setup.sql`

**Columns:** (Same structure as `vehicle_documents`)

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique document identifier |
| `driver_id` | uuid | FK → drivers, NOT NULL | - | Driver this document belongs to |
| `document_type` | text | NOT NULL | - | Type: 'license', 'aadhar', 'pan', 'photo', 'medical', 'other' |
| `document_number` | text | - | - | Document reference number |
| `issue_date` | date | - | - | Document issue date |
| `expiry_date` | date | - | - | Document expiry date |
| `file_url` | text | - | - | URL to document file in Supabase storage |
| `file_name` | text | - | - | Original file name |
| `file_size` | integer | - | - | File size in bytes |
| `notes` | text | - | - | Additional notes |
| `organization_id` | uuid | FK → organizations | - | Organization owning this document |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who uploaded document |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Storage Bucket:** `driver-documents`

---

## Maintenance & Service

### maintenance_service_tasks

**Purpose:** Detailed breakdown of service items within a maintenance task

**Migration:** `20250120000000_create_maintenance_service_tasks.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique service task identifier |
| `maintenance_task_id` | uuid | FK → maintenance_tasks, NOT NULL | - | Parent maintenance task |
| `service_item` | text | NOT NULL | - | Name of service item (e.g., "Oil Change", "Brake Pad Replacement") |
| `description` | text | - | - | Detailed description |
| `quantity` | numeric | - | 1 | Quantity of items/services |
| `unit_cost` | numeric | - | 0 | Cost per unit |
| `total_cost` | numeric | GENERATED | - | quantity * unit_cost |
| `status` | text | - | 'pending' | Status: 'pending', 'completed' |
| `notes` | text | - | - | Additional notes |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Foreign Keys:**
- `maintenance_task_id` → `maintenance_tasks(id)` ON DELETE CASCADE

---

### maintenance_entries

**Purpose:** Detailed maintenance and service records with complete vendor and billing information

**Schema:** public
**RLS Enabled:** Yes
**Migration:** Maintenance system migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique maintenance entry identifier |
| `vehicle_id` | uuid | FK → vehicles | - | Vehicle being serviced |
| `maintenance_task_id` | uuid | FK → maintenance_tasks | - | Related parent maintenance task |
| `vendor_name` | varchar | - | - | Name of service provider/vendor |
| `vendor_type` | service_category (ENUM) | - | - | Category: 'tire_service', 'mechanical_service', 'electrical_service', 'body_service', 'documentation', 'routine_service', 'emergency_repair' |
| `vendor_location` | text | - | - | Vendor/garage location |
| `vendor_phone` | varchar | - | - | Vendor contact number |
| `vendor_gst` | varchar | - | - | Vendor GST number |
| `service_date` | date | - | - | Date service was performed |
| `service_type` | varchar | - | - | Type of service performed |
| `description` | text | - | - | Detailed description of work |
| `labor_charges` | numeric | - | - | Labor cost |
| `parts_charges` | numeric | - | - | Parts cost |
| `parts_serviced` | jsonb | - | - | JSON array of parts serviced/replaced |
| `bill_number` | varchar | - | - | Invoice/bill number |
| `bill_amount` | numeric | - | - | Bill amount before tax |
| `gst_amount` | numeric | - | - | GST/tax amount |
| `total_amount` | numeric | - | - | Total amount including tax |
| `payment_method` | varchar | - | - | Payment method: 'cash', 'card', 'upi', 'cheque', 'credit' |
| `payment_status` | varchar | - | 'paid' | Payment status: 'paid', 'pending', 'partial' |
| `bill_photo_urls` | text[] | - | - | Array of bill/receipt photo URLs |
| `odometer_at_service` | integer | - | - | Vehicle odometer reading at service time (km) |
| `next_service_due_km` | integer | - | - | Next service due at this odometer reading |
| `next_service_due_date` | date | - | - | Next service due date |
| `complaints_reported` | text | - | - | Customer complaints/issues reported |
| `work_done` | text | - | - | Summary of work completed |
| `pending_work` | text | - | - | Work pending or recommended for future |
| `mechanic_name` | varchar | - | - | Name of mechanic who performed work |
| `test_drive_done` | boolean | - | false | Whether test drive was performed |
| `customer_approval` | boolean | - | true | Customer approval/satisfaction |
| `organization_id` | uuid | FK → organizations | - | Organization owning this record |
| `created_by` | uuid | FK → auth.users | - | User who created record |
| `created_at` | timestamptz | - | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | timestamptz | - | `CURRENT_TIMESTAMP` | Last update timestamp |

**ENUM Types:**

`service_category` values:
- `tire_service` - Tire-related services
- `mechanical_service` - Engine, transmission, mechanical repairs
- `electrical_service` - Electrical system repairs
- `body_service` - Body work, painting, denting
- `documentation` - Documentation-related services
- `routine_service` - Regular maintenance/servicing
- `emergency_repair` - Emergency breakdown repairs

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `vehicle_id`
- INDEX on `organization_id`
- INDEX on `maintenance_task_id`
- INDEX on `service_date`

**Foreign Keys:**
- `vehicle_id` → `vehicles(id)` - Links to vehicle
- `maintenance_task_id` → `maintenance_tasks(id)` - Links to parent task
- `organization_id` → `organizations(id)` ON DELETE CASCADE
- `created_by` → `auth.users(id)` - User who created record

**Related Tables:**
- `maintenance_tasks` - Parent maintenance task
- `vehicles` - Vehicle being serviced
- `maintenance_vendors` - Can link to vendor master data

**RLS Policies:**
- Users can only see maintenance entries for vehicles in their organization
- Standard organization-based access control

**Frontend Usage Example:**
```typescript
// Fetch maintenance entries for a vehicle with vendor details
const { data: maintenanceEntries, error } = await supabase
  .from('maintenance_entries')
  .select(`
    *,
    vehicle:vehicles(registration_number, make, model),
    maintenance_task:maintenance_tasks(title, status)
  `)
  .eq('vehicle_id', vehicleId)
  .order('service_date', { ascending: false });

// Create new maintenance entry with complete details
const { data, error } = await supabase
  .from('maintenance_entries')
  .insert({
    vehicle_id: 'uuid-here',
    maintenance_task_id: 'uuid-here',
    vendor_name: 'ABC Motors',
    vendor_type: 'mechanical_service',
    vendor_location: 'Mumbai',
    vendor_phone: '+919876543210',
    vendor_gst: 'GST12345',
    service_date: '2025-11-01',
    service_type: 'Engine Service',
    description: 'Complete engine overhaul with oil change',
    labor_charges: 5000,
    parts_charges: 8000,
    parts_serviced: [
      { name: 'Engine Oil', quantity: 5, unit: 'liters' },
      { name: 'Oil Filter', quantity: 1 },
      { name: 'Air Filter', quantity: 1 }
    ],
    bill_number: 'INV-2025-001',
    bill_amount: 13000,
    gst_amount: 2340,
    total_amount: 15340,
    payment_method: 'upi',
    payment_status: 'paid',
    odometer_at_service: 125000,
    next_service_due_km: 135000,
    next_service_due_date: '2026-02-01',
    complaints_reported: 'Engine making noise',
    work_done: 'Engine serviced, oil changed, filters replaced',
    mechanic_name: 'Ramesh Kumar',
    test_drive_done: true,
    customer_approval: true
  });

// Query with filtering and aggregation
const { data: serviceHistory } = await supabase
  .from('maintenance_entries')
  .select('service_date, vendor_name, total_amount, service_type')
  .eq('vehicle_id', vehicleId)
  .gte('service_date', '2025-01-01')
  .lte('service_date', '2025-12-31')
  .order('service_date', { ascending: false });

// Get total maintenance cost for a vehicle
const { data: costSummary } = await supabase
  .from('maintenance_entries')
  .select('total_amount.sum(), labor_charges.sum(), parts_charges.sum()')
  .eq('vehicle_id', vehicleId);
```

**Use Cases:**
- Complete service history tracking
- Vendor performance analysis
- Cost tracking and budgeting
- Warranty management (with bill photos)
- Compliance documentation
- Predictive maintenance scheduling
- Service recommendation tracking

**Best Practices:**
- Always store bill photos for warranty claims
- Link to maintenance_task_id for complete audit trail
- Update odometer_at_service for accuracy
- Set next_service_due for reminders
- Use parts_serviced JSONB for structured parts data
- Record mechanic_name for quality tracking

---

### maintenance_audit_logs

**Purpose:** Audit trail for all maintenance record changes

**Migration:** `20250120000000_create_maintenance_service_tasks.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique audit log identifier |
| `maintenance_task_id` | uuid | FK → maintenance_tasks, NOT NULL | - | Maintenance task being audited |
| `action` | text | NOT NULL | - | Action: 'created', 'updated', 'deleted', 'status_changed' |
| `changed_by` | uuid | FK → auth.users | - | User who made the change |
| `changed_at` | timestamptz | NOT NULL | `now()` | When change occurred |
| `old_values` | jsonb | - | - | Previous values (JSON) |
| `new_values` | jsonb | - | - | New values (JSON) |
| `notes` | text | - | - | Change description |

---

### parts_replacements

**Purpose:** Track parts replaced during maintenance

**Migration:** Found in maintenance-related migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique part replacement identifier |
| `maintenance_task_id` | uuid | FK → maintenance_tasks | - | Associated maintenance task |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Vehicle the part belongs to |
| `part_name` | text | NOT NULL | - | Name of part (e.g., "Engine Oil Filter") |
| `part_number` | text | - | - | Manufacturer part number |
| `quantity` | integer | NOT NULL | 1 | Quantity replaced |
| `cost` | numeric | - | 0 | Cost of parts |
| `supplier` | text | - | - | Parts supplier name |
| `warehouse_id` | uuid | FK → warehouses | - | Warehouse part came from |
| `old_part_condition` | text | - | - | Condition of replaced part |
| `notes` | text | - | - | Additional notes |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

---

### warehouses

**Purpose:** Track inventory locations for parts

**Migration:** Found in inventory-related migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique warehouse identifier |
| `name` | text | NOT NULL | - | Warehouse name |
| `location` | text | - | - | Physical location |
| `contact_person` | text | - | - | Warehouse manager |
| `contact_phone` | text | - | - | Contact number |
| `organization_id` | uuid | FK → organizations | - | Organization owning warehouse |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

---

## Reminder & Alert System

### reminder_tracking

**Purpose:** Track document expiry reminders and notifications

**Migration:** `20250120000001_create_reminder_tracking.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique reminder identifier |
| `entity_type` | text | NOT NULL | - | Type: 'vehicle_document', 'driver_document' |
| `entity_id` | uuid | NOT NULL | - | ID of document being tracked |
| `document_type` | text | NOT NULL | - | Type of document |
| `expiry_date` | date | NOT NULL | - | Document expiry date |
| `reminder_date` | date | NOT NULL | - | When to send reminder |
| `status` | text | - | 'pending' | Status: 'pending', 'sent', 'dismissed' |
| `notification_sent` | boolean | - | false | Whether notification was sent |
| `notification_sent_at` | timestamptz | - | - | When notification was sent |
| `organization_id` | uuid | FK → organizations | - | Organization for this reminder |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

**Frontend Usage Example:**
```typescript
// Fetch upcoming reminders
const { data: reminders, error } = await supabase
  .from('reminder_tracking')
  .select('*')
  .eq('status', 'pending')
  .lte('reminder_date', new Date().toISOString())
  .order('reminder_date');
```

---

### alert_thresholds

**Purpose:** Custom alert threshold configuration for monitoring

**Migration:** `20250120000002_create_alert_thresholds.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique threshold identifier |
| `alert_type` | text | NOT NULL | - | Type: 'document_expiry', 'maintenance_due', 'fuel_efficiency', 'odometer' |
| `entity_type` | text | - | - | Entity type being monitored |
| `threshold_value` | numeric | NOT NULL | - | Threshold value |
| `threshold_unit` | text | - | - | Unit (e.g., 'days', 'km', 'liters') |
| `enabled` | boolean | - | true | Whether alert is active |
| `notification_method` | text | - | 'in_app' | Method: 'in_app', 'email', 'sms' |
| `organization_id` | uuid | FK → organizations | - | Organization for this threshold |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

---

## Tagging System

### tags

**Purpose:** Master table for tags that can be applied to vehicles

**Migration:** `20250131000000_create_vehicle_tags_system.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique tag identifier |
| `name` | text | UNIQUE, NOT NULL | - | Tag name (e.g., "VIP", "Long Haul") |
| `color` | text | - | '#3B82F6' | Display color (hex code) |
| `description` | text | - | - | Tag description |
| `organization_id` | uuid | FK → organizations | - | Organization owning this tag |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

---

### vehicle_tags

**Purpose:** Junction table linking vehicles to tags

**Migration:** `20250131000000_create_vehicle_tags_system.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique vehicle-tag link identifier |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Tagged vehicle |
| `tag_id` | uuid | FK → tags, NOT NULL | - | Applied tag |
| `assigned_by` | uuid | FK → auth.users | - | User who assigned tag |
| `assigned_at` | timestamptz | NOT NULL | `now()` | When tag was assigned |

**Unique Constraint:** (`vehicle_id`, `tag_id`) - Prevent duplicate tags

---

### vehicle_tag_history

**Purpose:** Audit trail for tag assignments/removals

**Migration:** `20250131000000_create_vehicle_tags_system.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique history record identifier |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Vehicle |
| `tag_id` | uuid | FK → tags, NOT NULL | - | Tag |
| `action` | text | NOT NULL | - | Action: 'assigned', 'removed' |
| `performed_by` | uuid | FK → auth.users | - | User who performed action |
| `performed_at` | timestamptz | NOT NULL | `now()` | When action occurred |

---

## Trip Management

### trip_corrections

**Purpose:** Track odometer corrections for trips

**Migration:** `20250912161700_add_correction_cascade.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique correction identifier |
| `trip_id` | uuid | FK → trips, NOT NULL | - | Trip being corrected |
| `vehicle_id` | uuid | FK → vehicles, NOT NULL | - | Vehicle |
| `correction_type` | text | NOT NULL | - | Type: 'start_odometer', 'end_odometer' |
| `old_value` | numeric | NOT NULL | - | Previous odometer value |
| `new_value` | numeric | NOT NULL | - | Corrected odometer value |
| `reason` | text | - | - | Reason for correction |
| `corrected_by` | uuid | FK → auth.users | - | User who made correction |
| `corrected_at` | timestamptz | NOT NULL | `now()` | When correction was made |
| `approved` | boolean | - | false | Whether correction is approved |

**Frontend Usage:** Use RPCs `cascade_odometer_correction_atomic()` and `preview_cascade_impact()` for corrections

---

### fuel_efficiency_baselines

**Purpose:** Store baseline fuel efficiency metrics per vehicle

**Migration:** `20250912164100_add_fuel_efficiency_baselines.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique baseline identifier |
| `vehicle_id` | uuid | FK → vehicles, UNIQUE, NOT NULL | - | Vehicle (one baseline per vehicle) |
| `baseline_kmpl` | numeric | NOT NULL | - | Baseline kilometers per liter |
| `calculated_from_trips` | integer | - | 0 | Number of trips used to calculate baseline |
| `last_calculated` | timestamptz | - | `now()` | When baseline was last updated |
| `notes` | text | - | - | Additional notes |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

---

## KPI & Analytics

### kpi_cards

**Purpose:** Store KPI dashboard cards configuration

**Migration:** Referenced in edge function `refresh-kpis`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique KPI card identifier |
| `title` | text | NOT NULL | - | Card title |
| `value` | text | NOT NULL | - | Display value |
| `change` | text | - | - | Change indicator (e.g., "+12%") |
| `trend` | text | - | 'neutral' | Trend: 'up', 'down', 'neutral' |
| `icon` | text | - | - | Icon identifier |
| `description` | text | - | - | Card description |
| `category` | text | - | - | Category: 'vehicles', 'trips', 'drivers', 'maintenance', 'financial' |
| `order_index` | integer | - | 0 | Display order |
| `organization_id` | uuid | FK → organizations | - | Organization for this KPI |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Frontend Usage:**
```typescript
// Refresh KPI cards using edge function
const { data, error } = await supabase.functions.invoke('refresh-kpis');

// Fetch KPI cards
const { data: kpis, error } = await supabase
  .from('kpi_cards')
  .select('*')
  .order('order_index');
```

---

### events_feed

**Purpose:** Activity feed for tracking system events

**Migration:** Various activity logging migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique event identifier |
| `event_type` | text | NOT NULL | - | Type: 'trip_created', 'vehicle_added', 'maintenance_completed', etc. |
| `title` | text | NOT NULL | - | Event title |
| `description` | text | - | - | Event description |
| `entity_type` | text | - | - | Related entity type |
| `entity_id` | uuid | - | - | Related entity ID |
| `severity` | text | - | 'info' | Severity: 'info', 'warning', 'error', 'success' |
| `metadata` | jsonb | - | - | Additional event data (JSON) |
| `user_id` | uuid | FK → auth.users | - | User who triggered event |
| `organization_id` | uuid | FK → organizations | - | Organization |
| `created_at` | timestamptz | NOT NULL | `now()` | Event timestamp |

---

## Multi-tenancy

### organizations

**Purpose:** Multi-tenant organization management

**Migration:** Organization-related migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique organization identifier |
| `name` | text | UNIQUE, NOT NULL | - | Organization name |
| `slug` | text | UNIQUE | - | URL-friendly identifier |
| `logo_url` | text | - | - | Organization logo |
| `settings` | jsonb | - | '{}' | Organization settings (JSON) |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

---

### organization_users

**Purpose:** Link users to organizations with roles

**Migration:** Organization-related migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique link identifier |
| `organization_id` | uuid | FK → organizations, NOT NULL | - | Organization |
| `user_id` | uuid | FK → auth.users, NOT NULL | - | User |
| `role` | text | NOT NULL | 'member' | Role: 'owner', 'admin', 'member', 'viewer' |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

**Unique Constraint:** (`organization_id`, `user_id`)

---

### profiles

**Purpose:** Extended user profile information

**Migration:** Auth-related migrations

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY, FK → auth.users | - | User ID from auth.users |
| `full_name` | text | - | - | User's full name |
| `avatar_url` | text | - | - | Profile picture URL |
| `phone` | text | - | - | Phone number |
| `preferences` | jsonb | - | '{}' | User preferences (JSON) |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

---

## Utilities

### short_urls

**Purpose:** URL shortening service for sharing trip/vehicle links

**Migration:** `20251023120000_create_short_urls_table.sql`

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique short URL identifier |
| `short_code` | text | UNIQUE, NOT NULL | - | Short code (e.g., "abc123") |
| `original_url` | text | NOT NULL | - | Full original URL |
| `entity_type` | text | - | - | Type: 'trip', 'vehicle', 'driver' |
| `entity_id` | uuid | - | - | Related entity ID |
| `created_by` | uuid | FK → auth.users | - | User who created short URL |
| `visit_count` | integer | - | 0 | Number of times accessed |
| `expires_at` | timestamptz | - | - | Expiration timestamp |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |

---

## How to Query Examples

### Complex Query Examples

#### 1. Get vehicles with upcoming document expiries
```typescript
const { data, error } = await supabase
  .from('vehicle_documents')
  .select(`
    *,
    vehicle:vehicles(registration_number, make, model)
  `)
  .gte('expiry_date', new Date().toISOString())
  .lte('expiry_date', new Date(Date.now() + 30*24*60*60*1000).toISOString())
  .order('expiry_date');
```

#### 2. Get trip P&L summary using materialized view
```typescript
const { data, error } = await supabase
  .from('trip_pnl_report_view')
  .select('*')
  .gte('start_date', '2025-01-01')
  .lte('start_date', '2025-12-31');
```

#### 3. Get driver statistics using RPC
```typescript
const { data, error } = await supabase
  .rpc('get_driver_stats', {
    driver_id: '...'
  });
```

#### 4. Get vehicles with tags
```typescript
const { data, error } = await supabase
  .from('vehicles')
  .select(`
    *,
    vehicle_tags(
      tag:tags(name, color)
    )
  `)
  .eq('status', 'active');
```

---

## 🔄 Update Instructions

**When you receive updated schema information from Supabase AI:**

1. Identify which table(s) changed
2. Find the table section in this document
3. Update the relevant columns, constraints, or relationships
4. Add a note at the bottom: "Updated: [DATE] - [DESCRIPTION]"
5. Update the "Overview" statistics if tables were added/removed

**Example update note:**
```
---
**Update History:**
- 2025-11-02: Initial documentation created
- 2025-11-15: Added new `fuel_transactions` table
```

---

**Last Updated:** 2025-11-02
**Documentation Version:** 1.0
**Total Tables Documented:** 24

---

## 🚨 Notes for AI Agents

- ✅ Always verify table and column names from this document before writing SQL
- ✅ Check constraints (NOT NULL, UNIQUE) before inserting data
- ✅ Use the provided frontend usage examples as templates
- ✅ Remember that RLS is enabled - queries are automatically filtered by organization
- ✅ Use UUIDs for all foreign key relationships
- ⚠️ Never hardcode organization_id - it's set automatically via RLS
- ⚠️ Always use `.select()` with specific columns or joins for better performance
