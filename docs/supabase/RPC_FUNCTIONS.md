# RPC Functions Documentation

> **📌 Purpose:** Complete reference for all database functions (RPCs - Remote Procedure Calls) available in Supabase. Use these instead of writing complex queries in the frontend.

---

## 📚 Table of Contents

- [Overview](#overview)
- [KPI Functions](#kpi-functions)
  - [generate_kpi_cards](#generate_kpi_cards)
  - [get_driver_stats](#get_driver_stats)
- [Trip Functions](#trip-functions)
  - [rpc_trips_count](#rpc_trips_count)
  - [rpc_fuel_summary](#rpc_fuel_summary)
  - [rpc_mileage_stats](#rpc_mileage_stats)
  - [get_trip_summary_metrics](#get_trip_summary_metrics)
- [Vehicle Functions](#vehicle-functions)
  - [rpc_vehicle_expiries](#rpc_vehicle_expiries)
  - [count_vehicle_dependencies](#count_vehicle_dependencies)
- [Correction Functions](#correction-functions)
  - [cascade_odometer_correction_atomic](#cascade_odometer_correction_atomic)
  - [preview_cascade_impact](#preview_cascade_impact)
- [Anomaly Detection](#anomaly-detection)
  - [analyze_value_anomalies](#analyze_value_anomalies)
- [Activity Logging](#activity-logging)
  - [log_user_activity](#log_user_activity)
  - [log_vehicle_activity](#log_vehicle_activity)
  - [get_activity_log_analytics](#get_activity_log_analytics)
- [Audit Trail](#audit-trail)
  - [log_audit_trail](#log_audit_trail)
  - [get_entity_audit_trail](#get_entity_audit_trail)
  - [search_audit_trail](#search_audit_trail)
- [How to Call RPC Functions](#how-to-call-rpc-functions)

---

## Overview

### What are RPC Functions?
RPC (Remote Procedure Call) functions are PostgreSQL functions that can be called directly from the frontend. They:
- Perform complex calculations on the database server
- Reduce data transfer between client and server
- Execute multiple operations atomically
- Are more secure than raw SQL queries

### Naming Convention
- All RPCs use snake_case: `get_driver_stats`
- Call using `.rpc()` method in Supabase client

### Common Patterns
- Most RPCs respect organization-based RLS (Row Level Security)
- Return JSONB for complex data structures
- Use parameters with defaults for flexibility

---

## KPI Functions

### generate_kpi_cards

**Purpose:** Generate KPI dashboard cards with calculated metrics

**Migration:** `20251025000000_create_driver_stats_function.sql` (related)

**Parameters:** None (uses current user's organization)

**Returns:**
```typescript
{
  success: boolean
}
```

**Description:**
Generates or updates KPI cards in the `kpi_cards` table. Calculates:
- Total active vehicles
- Total trips (this month)
- Total active drivers
- Maintenance tasks pending
- Total revenue
- Average fuel efficiency

**Frontend Usage:**
```typescript
// Trigger KPI generation (usually called by edge function)
const { data, error } = await supabase.rpc('generate_kpi_cards');

// Then fetch updated KPI cards
const { data: kpis, error: kpiError } = await supabase
  .from('kpi_cards')
  .select('*')
  .order('order_index');
```

**When to Call:**
- After major data changes (bulk trip imports, vehicle additions)
- On dashboard page load (if cards are stale)
- Via edge function `refresh-kpis` (recommended)

---

### get_driver_stats

**Purpose:** Get comprehensive statistics for a driver or all drivers

**Migration:** `20251025000000_create_driver_stats_function.sql`

**Parameters:**
```typescript
{
  driver_id?: string;  // Optional: specific driver UUID, or null for all drivers
}
```

**Returns:**
```typescript
Array<{
  driver_id: string;
  driver_name: string;
  total_trips: number;
  total_distance: number;
  total_fuel_consumed: number;
  average_fuel_efficiency: number;  // km/l
  total_revenue: number;
  last_trip_date: string;
  status: string;
}>
```

**Description:**
Calculates aggregated statistics for drivers including:
- Trip counts
- Total distance traveled
- Fuel consumption
- Fuel efficiency (km/l)
- Revenue generated
- Last trip date

**Frontend Usage:**
```typescript
// Get stats for all drivers
const { data: allDriverStats, error } = await supabase
  .rpc('get_driver_stats');

// Get stats for specific driver
const { data: driverStats, error } = await supabase
  .rpc('get_driver_stats', { driver_id: 'uuid-here' });
```

**Use Cases:**
- Driver performance dashboard
- Driver leaderboard
- Driver detail pages
- Performance reports

---

## Trip Functions

### rpc_trips_count

**Purpose:** Count trips by vehicle and date range

**Parameters:**
```typescript
{
  vehicle_id?: string;     // Optional: specific vehicle UUID
  start_date?: string;      // Optional: ISO date string
  end_date?: string;        // Optional: ISO date string
  status?: string;          // Optional: 'completed', 'in_progress', 'planned'
}
```

**Returns:**
```typescript
{
  count: number
}
```

**Frontend Usage:**
```typescript
// Count all completed trips this month
const { data, error } = await supabase
  .rpc('rpc_trips_count', {
    start_date: '2025-11-01',
    end_date: '2025-11-30',
    status: 'completed'
  });
// Returns: { count: 142 }
```

---

### rpc_fuel_summary

**Purpose:** Get fuel consumption summary with efficiency metrics

**Parameters:**
```typescript
{
  vehicle_id?: string;      // Optional: specific vehicle UUID
  start_date?: string;       // Optional: ISO date string
  end_date?: string;         // Optional: ISO date string
}
```

**Returns:**
```typescript
{
  total_fuel_consumed: number;      // liters
  total_distance: number;           // km
  average_efficiency: number;       // km/l
  total_fuel_cost: number;          // currency
  trips_analyzed: number;
}
```

**Description:**
Calculates fuel metrics across trips including:
- Total fuel consumed
- Total distance traveled
- Average fuel efficiency
- Fuel costs (if recorded in trips)

**Frontend Usage:**
```typescript
// Get fuel summary for specific vehicle
const { data, error } = await supabase
  .rpc('rpc_fuel_summary', {
    vehicle_id: 'uuid-here',
    start_date: '2025-01-01',
    end_date: '2025-12-31'
  });
```

**Use Cases:**
- Fuel expense reports
- Efficiency monitoring
- Vehicle comparison
- Cost analysis

---

### rpc_mileage_stats

**Purpose:** Get mileage statistics by vehicle

**Parameters:**
```typescript
{
  vehicle_id?: string;      // Optional: specific vehicle UUID
  start_date?: string;       // Optional: ISO date string
  end_date?: string;         // Optional: ISO date string
}
```

**Returns:**
```typescript
{
  total_distance: number;           // km
  total_trips: number;
  average_distance_per_trip: number; // km
  max_distance: number;             // km (longest trip)
  min_distance: number;             // km (shortest trip)
}
```

**Frontend Usage:**
```typescript
// Get mileage stats for vehicle
const { data, error } = await supabase
  .rpc('rpc_mileage_stats', {
    vehicle_id: 'uuid-here'
  });
```

---

### get_trip_summary_metrics

**Purpose:** Get comprehensive P&L summary for trips

**Parameters:**
```typescript
{
  start_date?: string;       // Optional: ISO date string
  end_date?: string;         // Optional: ISO date string
  vehicle_id?: string;       // Optional: filter by vehicle
  driver_id?: string;        // Optional: filter by driver
}
```

**Returns:**
```typescript
{
  total_trips: number;
  total_distance: number;
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
  profit_percentage: number;
  average_profit_per_trip: number;
  profitable_trips: number;
  loss_trips: number;
}
```

**Description:**
Provides comprehensive trip P&L analytics including:
- Revenue and expense totals
- Profit/loss calculations
- Trip profitability breakdown
- Average metrics

**Frontend Usage:**
```typescript
// Get overall trip metrics
const { data, error } = await supabase
  .rpc('get_trip_summary_metrics', {
    start_date: '2025-01-01',
    end_date: '2025-12-31'
  });
```

**Use Cases:**
- Financial dashboard
- P&L reports
- Business analytics
- Performance tracking

---

## Vehicle Functions

### rpc_vehicle_expiries

**Purpose:** Get all vehicles with expiring documents

**Parameters:**
```typescript
{
  days_threshold?: number;   // Optional: days ahead to check (default: 30)
}
```

**Returns:**
```typescript
Array<{
  vehicle_id: string;
  registration_number: string;
  document_type: string;
  document_number: string;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
}>
```

**Description:**
Returns vehicles with documents expiring within the threshold period. Includes:
- Vehicle details
- Document type and number
- Days until expiry
- Expired status

**Frontend Usage:**
```typescript
// Get vehicles with documents expiring in next 30 days
const { data, error } = await supabase
  .rpc('rpc_vehicle_expiries', { days_threshold: 30 });

// Get vehicles with expired documents (negative days)
const { data, error } = await supabase
  .rpc('rpc_vehicle_expiries', { days_threshold: 0 });
```

**Use Cases:**
- Document expiry alerts
- Compliance dashboard
- Reminder notifications
- Document renewal planning

---

### count_vehicle_dependencies

**Purpose:** Count all records dependent on a vehicle (before deletion)

**Parameters:**
```typescript
{
  vehicle_id: string;        // Required: vehicle UUID
}
```

**Returns:**
```typescript
{
  total_trips: number;
  total_maintenance_tasks: number;
  total_documents: number;
  total_tags: number;
  can_delete: boolean;
}
```

**Description:**
Counts all related records for a vehicle. Helps determine if vehicle can be safely deleted or should be archived instead.

**Frontend Usage:**
```typescript
// Check before deleting vehicle
const { data, error } = await supabase
  .rpc('count_vehicle_dependencies', {
    vehicle_id: 'uuid-here'
  });

if (data.can_delete) {
  // Proceed with deletion
} else {
  // Show warning or archive instead
  alert(`Cannot delete: ${data.total_trips} trips, ${data.total_maintenance_tasks} maintenance records`);
}
```

---

## Correction Functions

### cascade_odometer_correction_atomic

**Purpose:** Atomically correct odometer reading and cascade changes to subsequent trips

**Migration:** `20250912161700_add_correction_cascade.sql`

**Parameters:**
```typescript
{
  trip_id: string;              // Required: trip UUID to correct
  new_odometer: number;         // Required: new odometer value
  correction_type: string;      // Required: 'start_odometer' or 'end_odometer'
  reason: string;               // Required: reason for correction
}
```

**Returns:**
```typescript
{
  success: boolean;
  trips_affected: number;
  correction_id: string;
}
```

**Description:**
Corrects odometer reading for a trip and automatically updates all subsequent trips in the chain. Creates audit record in `trip_corrections` table.

**Important:**
- This is an **atomic operation** - all changes succeed or all fail
- Affects all trips after the corrected trip (cascade effect)
- Cannot be undone easily - always preview first

**Frontend Usage:**
```typescript
// First, preview the impact
const { data: preview, error } = await supabase
  .rpc('preview_cascade_impact', {
    trip_id: 'uuid-here',
    new_odometer: 125000,
    correction_type: 'start_odometer'
  });

// Show preview to user, then apply if confirmed
const { data, error } = await supabase
  .rpc('cascade_odometer_correction_atomic', {
    trip_id: 'uuid-here',
    new_odometer: 125000,
    correction_type: 'start_odometer',
    reason: 'Odometer reading was incorrectly recorded'
  });
```

**Use Cases:**
- Fix incorrect odometer readings
- Correct data entry errors
- Maintain odometer continuity

---

### preview_cascade_impact

**Purpose:** Preview the impact of an odometer correction before applying

**Migration:** `20250912161700_add_correction_cascade.sql`

**Parameters:**
```typescript
{
  trip_id: string;              // Required: trip UUID to correct
  new_odometer: number;         // Required: new odometer value
  correction_type: string;      // Required: 'start_odometer' or 'end_odometer'
}
```

**Returns:**
```typescript
{
  trips_affected: number;
  affected_trip_ids: string[];
  current_value: number;
  new_value: number;
  difference: number;
  warnings: string[];           // Any potential issues
}
```

**Description:**
Shows what would change if the correction is applied. Use this **before** calling `cascade_odometer_correction_atomic`.

**Frontend Usage:**
```typescript
// Preview correction impact
const { data, error } = await supabase
  .rpc('preview_cascade_impact', {
    trip_id: 'uuid-here',
    new_odometer: 125000,
    correction_type: 'start_odometer'
  });

// Show confirmation dialog
const confirmMessage = `
  This will affect ${data.trips_affected} trips.
  Current: ${data.current_value} km
  New: ${data.new_value} km
  Difference: ${data.difference} km

  Warnings: ${data.warnings.join(', ')}

  Do you want to proceed?
`;
```

---

## Anomaly Detection

### analyze_value_anomalies

**Purpose:** Detect anomalies in trip data (fuel consumption, distance, costs)

**Parameters:**
```typescript
{
  vehicle_id?: string;          // Optional: specific vehicle
  anomaly_type?: string;        // Optional: 'fuel', 'distance', 'cost'
  threshold?: number;           // Optional: standard deviations (default: 2)
}
```

**Returns:**
```typescript
Array<{
  trip_id: string;
  anomaly_type: string;
  expected_value: number;
  actual_value: number;
  deviation_percentage: number;
  severity: string;             // 'low', 'medium', 'high'
  recommendation: string;
}>
```

**Description:**
Uses statistical analysis to detect unusual values in trip data:
- Abnormal fuel consumption
- Unusual distances
- Unexpected costs
- Efficiency anomalies

**Frontend Usage:**
```typescript
// Detect fuel anomalies
const { data: anomalies, error } = await supabase
  .rpc('analyze_value_anomalies', {
    anomaly_type: 'fuel',
    threshold: 2.5  // 2.5 standard deviations
  });

// Show alerts for high severity anomalies
anomalies
  .filter(a => a.severity === 'high')
  .forEach(a => showAlert(a.recommendation));
```

**Use Cases:**
- Fraud detection
- Data quality monitoring
- Maintenance prediction
- Driver behavior analysis

---

## Activity Logging

### log_user_activity

**Purpose:** Log user actions for audit and analytics

**Parameters:**
```typescript
{
  action: string;               // Required: action name (e.g., 'vehicle_created')
  entity_type?: string;         // Optional: 'vehicle', 'trip', 'driver', etc.
  entity_id?: string;           // Optional: entity UUID
  metadata?: object;            // Optional: additional data (JSONB)
}
```

**Returns:**
```typescript
{
  activity_id: string;
  logged_at: string;
}
```

**Description:**
Creates activity log entry in `events_feed` table. Automatically captures:
- User ID (from auth context)
- Organization ID
- Timestamp
- IP address (if available)

**Frontend Usage:**
```typescript
// Log vehicle creation
await supabase.rpc('log_user_activity', {
  action: 'vehicle_created',
  entity_type: 'vehicle',
  entity_id: newVehicle.id,
  metadata: {
    registration_number: newVehicle.registration_number,
    make: newVehicle.make
  }
});

// Log trip update
await supabase.rpc('log_user_activity', {
  action: 'trip_updated',
  entity_type: 'trip',
  entity_id: tripId,
  metadata: {
    fields_changed: ['status', 'end_odometer'],
    old_status: 'in_progress',
    new_status: 'completed'
  }
});
```

---

### log_vehicle_activity

**Purpose:** Log vehicle-specific activities (trips, maintenance, status changes)

**Parameters:**
```typescript
{
  vehicle_id: string;           // Required: vehicle UUID
  activity_type: string;        // Required: 'trip_started', 'maintenance_scheduled', etc.
  description?: string;         // Optional: activity description
  metadata?: object;            // Optional: additional data (JSONB)
}
```

**Returns:**
```typescript
{
  activity_id: string;
  logged_at: string;
}
```

**Frontend Usage:**
```typescript
// Log trip start
await supabase.rpc('log_vehicle_activity', {
  vehicle_id: 'uuid-here',
  activity_type: 'trip_started',
  description: 'Trip to Mumbai started',
  metadata: {
    trip_id: 'uuid-here',
    driver_name: 'John Doe',
    destination: 'Mumbai'
  }
});
```

---

### get_activity_log_analytics

**Purpose:** Get activity analytics for a time period

**Parameters:**
```typescript
{
  start_date?: string;          // Optional: ISO date string
  end_date?: string;            // Optional: ISO date string
  entity_type?: string;         // Optional: filter by entity type
}
```

**Returns:**
```typescript
{
  total_activities: number;
  activities_by_type: Array<{ type: string; count: number }>;
  activities_by_user: Array<{ user_id: string; user_name: string; count: number }>;
  activities_by_day: Array<{ date: string; count: number }>;
  most_active_entity: { type: string; id: string; count: number };
}
```

**Frontend Usage:**
```typescript
// Get activity analytics for last 30 days
const { data, error } = await supabase
  .rpc('get_activity_log_analytics', {
    start_date: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    end_date: new Date().toISOString()
  });
```

---

## Audit Trail

### log_audit_trail

**Purpose:** Create detailed audit log entry for critical operations

**Parameters:**
```typescript
{
  table_name: string;           // Required: table being modified
  record_id: string;            // Required: record UUID
  action: string;               // Required: 'INSERT', 'UPDATE', 'DELETE'
  old_values?: object;          // Optional: previous values (JSONB)
  new_values?: object;          // Optional: new values (JSONB)
  reason?: string;              // Optional: reason for change
}
```

**Returns:**
```typescript
{
  audit_id: string;
  logged_at: string;
}
```

**Description:**
Creates immutable audit trail for compliance and security. Captures:
- What changed
- Who changed it
- When it changed
- Why it changed (if provided)

**Frontend Usage:**
```typescript
// Log before updating critical record
const oldData = { status: 'active', current_odometer: 125000 };
const newData = { status: 'maintenance', current_odometer: 125000 };

await supabase.rpc('log_audit_trail', {
  table_name: 'vehicles',
  record_id: vehicleId,
  action: 'UPDATE',
  old_values: oldData,
  new_values: newData,
  reason: 'Vehicle sent for scheduled maintenance'
});
```

---

### get_entity_audit_trail

**Purpose:** Get complete audit history for a specific record

**Parameters:**
```typescript
{
  table_name: string;           // Required: table name
  record_id: string;            // Required: record UUID
  limit?: number;               // Optional: max records (default: 50)
}
```

**Returns:**
```typescript
Array<{
  audit_id: string;
  action: string;
  changed_by: string;           // user email/name
  changed_at: string;
  old_values: object;
  new_values: object;
  reason: string;
}>
```

**Frontend Usage:**
```typescript
// Get audit history for vehicle
const { data: auditTrail, error } = await supabase
  .rpc('get_entity_audit_trail', {
    table_name: 'vehicles',
    record_id: vehicleId,
    limit: 100
  });

// Display timeline
auditTrail.forEach(entry => {
  console.log(`${entry.changed_at}: ${entry.action} by ${entry.changed_by}`);
  console.log('Changes:', entry.new_values);
});
```

---

### search_audit_trail

**Purpose:** Search audit logs with filters

**Parameters:**
```typescript
{
  table_name?: string;          // Optional: filter by table
  action?: string;              // Optional: filter by action
  user_id?: string;             // Optional: filter by user
  start_date?: string;          // Optional: date range start
  end_date?: string;            // Optional: date range end
  limit?: number;               // Optional: max records (default: 100)
}
```

**Returns:**
```typescript
Array<{
  audit_id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  changes_summary: string;      // Human-readable summary
}>
```

**Frontend Usage:**
```typescript
// Search for all deletions in last 7 days
const { data, error } = await supabase
  .rpc('search_audit_trail', {
    action: 'DELETE',
    start_date: new Date(Date.now() - 7*24*60*60*1000).toISOString()
  });

// Search for changes by specific user
const { data, error } = await supabase
  .rpc('search_audit_trail', {
    user_id: 'uuid-here',
    table_name: 'trips'
  });
```

---

## How to Call RPC Functions

### Basic Syntax
```typescript
const { data, error } = await supabase.rpc('function_name', {
  param1: value1,
  param2: value2
});
```

### With TypeScript Types
```typescript
interface DriverStats {
  driver_id: string;
  driver_name: string;
  total_trips: number;
  // ... other fields
}

const { data, error } = await supabase
  .rpc<DriverStats[]>('get_driver_stats');
```

### Error Handling
```typescript
const { data, error } = await supabase.rpc('function_name', params);

if (error) {
  console.error('RPC Error:', error.message);
  // Handle error
} else {
  console.log('Result:', data);
}
```

### With Loading States
```typescript
const [loading, setLoading] = useState(false);

const fetchStats = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.rpc('get_driver_stats');
    if (error) throw error;
    setStats(data);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

---

## 🔄 Update Instructions

**When adding new RPC functions:**

1. Add a new section under the appropriate category
2. Document all parameters with types
3. Document return type structure
4. Provide frontend usage example
5. List use cases
6. Update the Table of Contents

**Template for new RPC:**
```markdown
### function_name

**Purpose:** Brief description

**Migration:** migration_file_name.sql

**Parameters:**
\`\`\`typescript
{
  param1: type;     // Required/Optional: description
}
\`\`\`

**Returns:**
\`\`\`typescript
{
  field1: type;
}
\`\`\`

**Description:**
Detailed explanation

**Frontend Usage:**
\`\`\`typescript
// Example code
\`\`\`

**Use Cases:**
- Use case 1
- Use case 2
```

---

**Last Updated:** 2025-11-02
**Documentation Version:** 1.0
**Total Functions Documented:** 18

---

## 🚨 Notes for AI Agents

- ✅ Always use `.rpc()` method to call these functions
- ✅ Check parameter requirements (Required vs Optional)
- ✅ Handle errors properly - RPCs can fail
- ✅ Use preview functions before making destructive changes
- ✅ Log critical operations using audit functions
- ⚠️ RPCs respect RLS - they only access organization's data
- ⚠️ Some RPCs are expensive - use caching when appropriate
- ⚠️ Always await RPC calls - they are asynchronous
