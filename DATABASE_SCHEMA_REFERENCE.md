# Fleet Management System - Database Schema Reference

## ⚠️ IMPORTANT: Always Check Schema First!
Before writing ANY SQL migrations or queries, ALWAYS:
1. Ask for current table structure
2. Verify column names and data types
3. Check existing constraints and indexes
4. Test with SELECT queries before INSERT/UPDATE/DELETE

## Known Table Structures (as of Nov 20, 2024)

### `trips` Table
Key columns verified:
- `id` - UUID (primary key)
- `trip_start_date` - timestamp with time zone (NOT `start_date`)
- `trip_end_date` - timestamp with time zone (NOT `end_date`)
- `start_km` - integer (NOT `starting_km`)
- `end_km` - integer (NOT `ending_km`)
- **NO `total_km` column** - distance must be calculated as `(end_km - start_km)`
- `income_amount` - numeric (revenue from trip)
- `net_profit` - numeric (profit after expenses)
- `calculated_kmpl` - numeric (fuel efficiency)
- `cost_per_km` - numeric
- `created_at` - timestamp with time zone
- `updated_at` - timestamp with time zone
- `created_by` - UUID
- `organization_id` - UUID

### `kpi_cards` Table
- `kpi_key` - varchar (part of composite unique key)
- `organization_id` - UUID (part of composite unique key)
- `kpi_title` - varchar
- `kpi_value_human` - varchar (human-readable value like "100 km")
- `kpi_value_raw` - decimal (numeric value)
- `kpi_payload` - jsonb (additional data)
- `theme` - varchar (UI theme/color)
- `computed_at` - timestamp
- `updated_at` - timestamp

### `vehicles` Table
- Has `organization_id` column
- Other columns TBD - ASK BEFORE USING

### `drivers` Table  
- Has `organization_id` column
- Other columns TBD - ASK BEFORE USING

### `organizations` Table
- `id` - UUID
- `owner_id` - UUID (added via migration)
- Other columns TBD - ASK BEFORE USING

## SQL Query Helpers to Check Schema

```sql
-- Check all columns in a table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'TABLE_NAME_HERE'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if a column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'TABLE_NAME_HERE' 
    AND column_name = 'COLUMN_NAME_HERE'
    AND table_schema = 'public'
);

-- Check constraints on a table
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'TABLE_NAME_HERE';
```

## Common Mistakes to Avoid
1. ❌ Using `total_km` instead of calculating `(end_km - start_km)`
2. ❌ Using `start_date` instead of `trip_start_date`
3. ❌ Assuming column names without checking
4. ❌ Writing UPDATE/DELETE without WHERE clause verification
5. ❌ Not using COALESCE for nullable date columns

## Organization ID for Testing
- Current org: `ab6c2178-32f9-4a03-b5ab-d535db827a58`

## Before Every SQL Migration
Ask the user to run this check:
```sql
-- Verify table structure before migration
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'TARGET_TABLE_HERE'
ORDER BY ordinal_position;
```

---
**Last Updated:** November 20, 2024
**Note:** This document should be updated whenever new schema information is discovered.
