# Triggers, Views, and ENUMs Documentation

> **📌 Purpose:** Complete reference for database triggers, materialized views, and ENUM types. These automate behaviors and provide optimized data access.

---

## 📚 Table of Contents

- [Overview](#overview)
- [ENUM Types](#enum-types)
  - [billing_type](#billing_type)
  - [profit_status](#profit_status)
- [Materialized Views](#materialized-views)
  - [trip_pnl_report_view](#trip_pnl_report_view)
  - [document_summary_view](#document_summary_view)
- [Database Triggers](#database-triggers)
  - [Updated At Triggers](#updated-at-triggers)
  - [Audit Trail Triggers](#audit-trail-triggers)
  - [Cascade Triggers](#cascade-triggers)
  - [Validation Triggers](#validation-triggers)
- [Helper Functions](#helper-functions)
- [How to Use](#how-to-use)

---

## Overview

### What are these components?

#### ENUM Types
Custom data types with predefined allowed values. Provides:
- Type safety at database level
- Consistent values across tables
- Better performance than string checks
- Auto-validation on insert/update

#### Materialized Views
Pre-computed query results stored as tables. Provides:
- Fast access to complex aggregations
- Reduced query complexity
- Better performance for reports
- Periodic refresh to stay current

#### Triggers
Automatic actions that execute on database events. Provides:
- Automatic timestamp updates
- Audit trail logging
- Data validation
- Cascade operations

---

## ENUM Types

### billing_type

**Purpose:** Define trip billing calculation methods

**Definition:**
```sql
CREATE TYPE billing_type AS ENUM (
  'per_km',      -- Billing based on kilometers traveled
  'per_ton',     -- Billing based on cargo weight in tons
  'manual'       -- Manual/fixed amount billing
);
```

**Used In:**
- `trips.billing_type` column

**Values:**

| Value | Description | Calculation |
|-------|-------------|-------------|
| `per_km` | Per kilometer billing | `distance * billing_rate` |
| `per_ton` | Per ton billing | `cargo_weight * billing_rate` |
| `manual` | Manual fixed amount | `billing_rate` (direct amount) |

**Frontend Usage:**
```typescript
// Insert trip with billing type
const { data, error } = await supabase
  .from('trips')
  .insert({
    vehicle_id: '...',
    billing_type: 'per_km',      // ENUM value
    billing_rate: 25,             // ₹25 per km
    // ... other fields
  });

// Query trips by billing type
const { data: perKmTrips } = await supabase
  .from('trips')
  .select('*')
  .eq('billing_type', 'per_km');
```

**TypeScript Type:**
```typescript
type BillingType = 'per_km' | 'per_ton' | 'manual';

interface Trip {
  billing_type: BillingType;
  billing_rate: number;
  // ... other fields
}
```

**Migration:** `20250703171029_square_fountain.sql`

---

### profit_status

**Purpose:** Indicate trip profitability status

**Definition:**
```sql
CREATE TYPE profit_status AS ENUM (
  'profit',      -- Net profit (income > expenses)
  'loss',        -- Net loss (expenses > income)
  'neutral'      -- Break-even (income = expenses)
);
```

**Used In:**
- `trips.profit_status` column

**Values:**

| Value | Description | Condition |
|-------|-------------|-----------|
| `profit` | Trip made profit | `total_income > total_expenses` |
| `loss` | Trip made loss | `total_expenses > total_income` |
| `neutral` | Break-even | `total_income = total_expenses` |

**Auto-Calculated:**
This value is typically auto-calculated based on P&L:
```sql
profit_status = CASE
  WHEN total_income > total_expenses THEN 'profit'::profit_status
  WHEN total_income < total_expenses THEN 'loss'::profit_status
  ELSE 'neutral'::profit_status
END
```

**Frontend Usage:**
```typescript
// Query profitable trips
const { data: profitableTrips } = await supabase
  .from('trips')
  .select('*')
  .eq('profit_status', 'profit')
  .order('net_profit_loss', { ascending: false });

// Display status with colors
const statusColors = {
  profit: 'text-green-600',
  loss: 'text-red-600',
  neutral: 'text-gray-600'
};

<span className={statusColors[trip.profit_status]}>
  {trip.profit_status.toUpperCase()}
</span>
```

**TypeScript Type:**
```typescript
type ProfitStatus = 'profit' | 'loss' | 'neutral';

interface Trip {
  profit_status: ProfitStatus;
  net_profit_loss: number;
  // ... other fields
}
```

**Migration:** `20250703171029_square_fountain.sql`

---

### service_category

**Purpose:** Define maintenance service categories for vendor types

**Definition:**
```sql
CREATE TYPE service_category AS ENUM (
  'tire_service',        -- Tire-related services
  'mechanical_service',  -- Engine, transmission, mechanical repairs
  'electrical_service',  -- Electrical system repairs
  'body_service',        -- Body work, painting, denting
  'documentation',       -- Documentation-related services
  'routine_service',     -- Regular maintenance/servicing
  'emergency_repair'     -- Emergency breakdown repairs
);
```

**Used In:**
- `maintenance_entries.vendor_type` column
- `maintenance_vendors.vendor_type` column

**Values:**

| Value | Description | Examples |
|-------|-------------|----------|
| `tire_service` | Tire-related services | Tire rotation, replacement, balancing, puncture repair |
| `mechanical_service` | Mechanical repairs | Engine repair, transmission, brakes, suspension |
| `electrical_service` | Electrical repairs | Battery, alternator, wiring, lights, sensors |
| `body_service` | Body work | Denting, painting, rust removal, body panel replacement |
| `documentation` | Documentation services | Insurance, permits, RC renewal, PUC |
| `routine_service` | Regular servicing | Oil change, filter replacement, scheduled maintenance |
| `emergency_repair` | Emergency repairs | Breakdown repairs, roadside assistance |

**Frontend Usage:**
```typescript
// Type definition
type ServiceCategory =
  | 'tire_service'
  | 'mechanical_service'
  | 'electrical_service'
  | 'body_service'
  | 'documentation'
  | 'routine_service'
  | 'emergency_repair';

// Query maintenance entries by service category
const { data: mechanicalServices } = await supabase
  .from('maintenance_entries')
  .select('*')
  .eq('vendor_type', 'mechanical_service')
  .order('service_date', { ascending: false });

// Filter vendors by specialization
const { data: tireVendors } = await supabase
  .from('maintenance_vendors')
  .select('*')
  .eq('vendor_type', 'tire_service')
  .eq('is_active', true);

// Service category dropdown
const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'routine_service', label: 'Routine Service' },
  { value: 'mechanical_service', label: 'Mechanical Repair' },
  { value: 'electrical_service', label: 'Electrical Repair' },
  { value: 'tire_service', label: 'Tire Service' },
  { value: 'body_service', label: 'Body Work' },
  { value: 'emergency_repair', label: 'Emergency Repair' },
  { value: 'documentation', label: 'Documentation' }
];
```

**Migration:** Maintenance system migrations

---

## Materialized Views

### trip_pnl_report_view

**Purpose:** Pre-aggregated trip P&L (Profit & Loss) summary for fast reporting

**Migration:** Related to trip P&L features

**Definition:**
```sql
CREATE MATERIALIZED VIEW trip_pnl_report_view AS
SELECT
  t.id AS trip_id,
  t.start_date,
  t.end_date,
  v.registration_number,
  v.make,
  v.model,
  d.name AS driver_name,
  t.distance,
  t.billing_type,
  t.total_billing_amount,
  t.total_income,
  t.total_expenses,
  t.net_profit_loss,
  t.profit_status,
  -- Calculated fields
  CASE
    WHEN t.distance > 0 THEN t.net_profit_loss / t.distance
    ELSE 0
  END AS profit_per_km,
  CASE
    WHEN t.total_income > 0 THEN (t.net_profit_loss / t.total_income) * 100
    ELSE 0
  END AS profit_margin_percentage,
  t.organization_id
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
LEFT JOIN drivers d ON t.driver_id = d.id
WHERE t.status = 'completed'
  AND t.end_date IS NOT NULL;
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `trip_id` | uuid | Trip identifier |
| `start_date` | timestamptz | Trip start date |
| `end_date` | timestamptz | Trip end date |
| `registration_number` | text | Vehicle registration |
| `make` | text | Vehicle make |
| `model` | text | Vehicle model |
| `driver_name` | text | Driver name |
| `distance` | numeric | Distance traveled (km) |
| `billing_type` | billing_type | Billing method |
| `total_billing_amount` | numeric | Amount billed to client |
| `total_income` | numeric | Total income |
| `total_expenses` | numeric | Total expenses |
| `net_profit_loss` | numeric | Net P&L |
| `profit_status` | profit_status | Profit/loss/neutral |
| `profit_per_km` | numeric | Profit per kilometer |
| `profit_margin_percentage` | numeric | Profit margin % |
| `organization_id` | uuid | Organization |

**Refresh Strategy:**
```sql
-- Manual refresh
REFRESH MATERIALIZED VIEW trip_pnl_report_view;

-- Refresh concurrently (non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY trip_pnl_report_view;
```

**Indexes:**
```sql
CREATE INDEX idx_trip_pnl_org ON trip_pnl_report_view(organization_id);
CREATE INDEX idx_trip_pnl_date ON trip_pnl_report_view(start_date);
CREATE INDEX idx_trip_pnl_vehicle ON trip_pnl_report_view(registration_number);
```

**Frontend Usage:**
```typescript
// Query P&L report (fast!)
const { data: pnlReport, error } = await supabase
  .from('trip_pnl_report_view')
  .select('*')
  .gte('start_date', '2025-01-01')
  .lte('start_date', '2025-12-31')
  .order('net_profit_loss', { ascending: false });

// Get summary statistics
const { data: summary } = await supabase
  .from('trip_pnl_report_view')
  .select('total_income.sum(), total_expenses.sum(), net_profit_loss.sum()');

// Filter by vehicle
const { data: vehiclePnl } = await supabase
  .from('trip_pnl_report_view')
  .select('*')
  .eq('registration_number', 'MH-01-AB-1234');
```

**When to Refresh:**
- After bulk trip imports
- Nightly scheduled job
- After trip status changes to 'completed'
- On-demand via admin panel

**Use Cases:**
- Financial reports dashboard
- Vehicle profitability analysis
- Driver performance evaluation
- Monthly/yearly P&L statements

---

### document_summary_view

**Purpose:** Aggregated summary of document statuses for vehicles and drivers

**Migration:** `20250120000004_document_summary_materialized_view.sql`

**Definition:**
```sql
CREATE MATERIALIZED VIEW document_summary_view AS
SELECT
  'vehicle' AS entity_type,
  v.id AS entity_id,
  v.registration_number AS entity_name,
  v.organization_id,
  COUNT(vd.id) AS total_documents,
  COUNT(CASE WHEN vd.expiry_date < CURRENT_DATE THEN 1 END) AS expired_documents,
  COUNT(CASE WHEN vd.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS expiring_soon,
  MIN(vd.expiry_date) AS earliest_expiry,
  MAX(vd.updated_at) AS last_updated
FROM vehicles v
LEFT JOIN vehicle_documents vd ON v.id = vd.vehicle_id
GROUP BY v.id, v.registration_number, v.organization_id

UNION ALL

SELECT
  'driver' AS entity_type,
  d.id AS entity_id,
  d.name AS entity_name,
  d.organization_id,
  COUNT(dd.id) AS total_documents,
  COUNT(CASE WHEN dd.expiry_date < CURRENT_DATE THEN 1 END) AS expired_documents,
  COUNT(CASE WHEN dd.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS expiring_soon,
  MIN(dd.expiry_date) AS earliest_expiry,
  MAX(dd.updated_at) AS last_updated
FROM drivers d
LEFT JOIN driver_documents dd ON d.id = dd.driver_id
GROUP BY d.id, d.name, d.organization_id;
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `entity_type` | text | 'vehicle' or 'driver' |
| `entity_id` | uuid | Vehicle or driver ID |
| `entity_name` | text | Registration number or driver name |
| `organization_id` | uuid | Organization |
| `total_documents` | bigint | Total documents count |
| `expired_documents` | bigint | Count of expired documents |
| `expiring_soon` | bigint | Count expiring within 30 days |
| `earliest_expiry` | date | Soonest expiry date |
| `last_updated` | timestamptz | Last document update |

**Frontend Usage:**
```typescript
// Get document summary for all entities
const { data: summary, error } = await supabase
  .from('document_summary_view')
  .select('*')
  .order('expired_documents', { ascending: false });

// Get vehicles with expired documents
const { data: expiredDocs } = await supabase
  .from('document_summary_view')
  .select('*')
  .eq('entity_type', 'vehicle')
  .gt('expired_documents', 0);

// Get entities with documents expiring soon
const { data: expiringSoon } = await supabase
  .from('document_summary_view')
  .select('*')
  .gt('expiring_soon', 0)
  .order('earliest_expiry');
```

**Refresh Strategy:**
```sql
-- Refresh daily (scheduled job)
REFRESH MATERIALIZED VIEW CONCURRENTLY document_summary_view;
```

**Use Cases:**
- Compliance dashboard
- Document expiry alerts
- Fleet readiness reports
- Quick overview of document status

---

## Database Triggers

### Updated At Triggers

**Purpose:** Automatically update `updated_at` timestamp on row modifications

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied To:**
- `vehicles`
- `drivers`
- `trips`
- `destinations`
- `maintenance_tasks`
- `vehicle_documents`
- `driver_documents`
- `tags`
- `organizations`
- `profiles`
- All other tables with `updated_at` column

**Trigger Definition:**
```sql
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Behavior:**
- Fires **BEFORE UPDATE** on any row
- Automatically sets `NEW.updated_at = NOW()`
- No manual intervention needed

**Example:**
```typescript
// Update vehicle - updated_at is automatically set
await supabase
  .from('vehicles')
  .update({ status: 'maintenance' })
  .eq('id', vehicleId);
// updated_at is now set to current timestamp automatically
```

---

### Audit Trail Triggers

**Purpose:** Automatically log changes to critical tables for audit compliance

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO maintenance_audit_logs (
      maintenance_task_id,
      action,
      changed_by,
      old_values,
      notes
    ) VALUES (
      OLD.id,
      'deleted',
      auth.uid(),
      row_to_json(OLD),
      'Record deleted'
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO maintenance_audit_logs (
      maintenance_task_id,
      action,
      changed_by,
      old_values,
      new_values,
      notes
    ) VALUES (
      NEW.id,
      'updated',
      auth.uid(),
      row_to_json(OLD),
      row_to_json(NEW),
      'Record updated'
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO maintenance_audit_logs (
      maintenance_task_id,
      action,
      changed_by,
      new_values,
      notes
    ) VALUES (
      NEW.id,
      'created',
      auth.uid(),
      row_to_json(NEW),
      'Record created'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Applied To:**
- `maintenance_tasks` (example shown)
- Can be extended to other critical tables

**Trigger Definition:**
```sql
CREATE TRIGGER maintenance_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_changes();
```

**Behavior:**
- Fires **AFTER** INSERT, UPDATE, or DELETE
- Logs old and new values as JSONB
- Captures user ID from auth context
- Creates immutable audit trail

---

### Cascade Triggers

**Purpose:** Automatically update related records when parent record changes

**Example: Update Vehicle Current Odometer on Trip Completion**

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION update_vehicle_odometer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.end_odometer IS NOT NULL THEN
    UPDATE vehicles
    SET current_odometer = NEW.end_odometer
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger Definition:**
```sql
CREATE TRIGGER trip_completion_update_odometer
  AFTER UPDATE ON trips
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_vehicle_odometer();
```

**Behavior:**
- Fires when trip status changes to 'completed'
- Updates vehicle's `current_odometer` with trip's `end_odometer`
- Maintains odometer continuity

**Example:**
```typescript
// Complete trip - vehicle odometer automatically updates
await supabase
  .from('trips')
  .update({
    status: 'completed',
    end_odometer: 126500
  })
  .eq('id', tripId);

// Vehicle's current_odometer is now 126500 (automatic via trigger)
```

---

### Validation Triggers

**Purpose:** Validate data before insertion/update to prevent invalid states

**Example: Validate Trip Odometer Readings**

**Function Definition:**
```sql
CREATE OR REPLACE FUNCTION validate_trip_odometer()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_current_odometer numeric;
BEGIN
  -- Get vehicle's current odometer
  SELECT current_odometer INTO vehicle_current_odometer
  FROM vehicles
  WHERE id = NEW.vehicle_id;

  -- Validate start odometer
  IF NEW.start_odometer < vehicle_current_odometer THEN
    RAISE EXCEPTION 'Start odometer (%) cannot be less than vehicle current odometer (%)',
      NEW.start_odometer, vehicle_current_odometer;
  END IF;

  -- Validate end odometer if provided
  IF NEW.end_odometer IS NOT NULL AND NEW.end_odometer < NEW.start_odometer THEN
    RAISE EXCEPTION 'End odometer (%) cannot be less than start odometer (%)',
      NEW.end_odometer, NEW.start_odometer;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger Definition:**
```sql
CREATE TRIGGER validate_trip_odometer_trigger
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION validate_trip_odometer();
```

**Behavior:**
- Fires **BEFORE** INSERT or UPDATE
- Validates odometer logic
- **Raises exception** if validation fails (transaction rolled back)
- Prevents invalid data from being saved

**Example:**
```typescript
// This will fail with validation error
await supabase
  .from('trips')
  .insert({
    vehicle_id: '...',
    start_odometer: 100000,
    end_odometer: 95000  // Error: end < start
  });
// Error: End odometer (95000) cannot be less than start odometer (100000)
```

---

## Helper Functions

### get_user_organization_id()

**Purpose:** Get current user's organization ID (used in RLS policies)

**Definition:**
```sql
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Usage:** Primarily used in RLS policies (see [RLS_POLICIES.md](./RLS_POLICIES.md))

---

### set_default_organization()

**Purpose:** Automatically set organization_id on INSERT

**Definition:**
```sql
CREATE OR REPLACE FUNCTION set_default_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = get_user_organization_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied To:** All tables with `organization_id` column

**Trigger Definition:**
```sql
CREATE TRIGGER set_vehicles_organization
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_organization();
```

**Behavior:**
- Fires **BEFORE INSERT**
- Sets `organization_id` to user's organization if not provided
- Allows explicit organization_id if needed (for admin operations)

---

## How to Use

### Querying Materialized Views

Materialized views are queried like regular tables:
```typescript
const { data, error } = await supabase
  .from('trip_pnl_report_view')
  .select('*')
  .gte('start_date', '2025-01-01');
```

### Refreshing Materialized Views

**From Frontend (via RPC):**
```typescript
// Create RPC function first
// Then call it
const { data, error } = await supabase
  .rpc('refresh_trip_pnl_report');
```

**From Database:**
```sql
REFRESH MATERIALIZED VIEW trip_pnl_report_view;
```

**Scheduled Refresh (Supabase Cron):**
```sql
-- Example: Refresh every night at 2 AM
-- Configure in Supabase dashboard or pg_cron
```

### Working with ENUMs

**TypeScript Type Definitions:**
```typescript
// Define ENUM types
type BillingType = 'per_km' | 'per_ton' | 'manual';
type ProfitStatus = 'profit' | 'loss' | 'neutral';

// Use in interfaces
interface Trip {
  billing_type: BillingType;
  profit_status: ProfitStatus;
  // ... other fields
}
```

**Validation in Frontend:**
```typescript
const BILLING_TYPES: BillingType[] = ['per_km', 'per_ton', 'manual'];

<select name="billing_type">
  {BILLING_TYPES.map(type => (
    <option key={type} value={type}>{type}</option>
  ))}
</select>
```

---

## 🔄 Update Instructions

### Adding New ENUM Type

1. Create ENUM in migration:
```sql
CREATE TYPE new_enum_type AS ENUM ('value1', 'value2', 'value3');
```

2. Document in this file:
```markdown
### new_enum_type

**Purpose:** Description

**Values:**
| Value | Description |
|-------|-------------|
| value1 | Description |
```

3. Update TypeScript types in frontend

### Adding New Materialized View

1. Create view in migration:
```sql
CREATE MATERIALIZED VIEW view_name AS
SELECT ...
FROM ...;

CREATE INDEX idx_view_name ON view_name(column);
```

2. Document structure in this file

3. Set up refresh strategy

### Adding New Trigger

1. Create function:
```sql
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic here
  RETURN NEW; -- or OLD for DELETE
END;
$$ LANGUAGE plpgsql;
```

2. Create trigger:
```sql
CREATE TRIGGER trigger_name
  BEFORE/AFTER INSERT/UPDATE/DELETE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION function_name();
```

3. Document in this file with:
   - Purpose
   - When it fires
   - What it does
   - Example usage

---

**Last Updated:** 2025-11-02
**Documentation Version:** 1.0

---

## 🚨 Notes for AI Agents

- ✅ ENUM values are case-sensitive - always use lowercase
- ✅ Materialized views need periodic refresh - don't expect real-time data
- ✅ Triggers execute automatically - don't manually call trigger functions
- ✅ `updated_at` is automatic - never manually set it
- ✅ Validation triggers will raise exceptions - handle errors in frontend
- ⚠️ Don't query trigger functions directly - they're called by triggers
- ⚠️ Refreshing materialized views can be slow - do it off-peak
- ⚠️ Adding ENUM values requires migration - can't be done at runtime
