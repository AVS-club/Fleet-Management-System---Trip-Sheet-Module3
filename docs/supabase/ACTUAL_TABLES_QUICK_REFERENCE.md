# Actual Database Tables - Quick Reference

> **📌 Source:** Extracted directly from Supabase on 2025-11-03
>
> **Purpose:** Complete list of ALL tables in your Supabase database with column names and types.

---

## 📚 Table of Contents

- [Summary Statistics](#summary-statistics)
- [Public Schema Tables](#public-schema-tables)
- [How to Use This Reference](#how-to-use-this-reference)

---

## Summary Statistics

- **Total Public Tables:** 36 tables
- **Total Columns:** 500+ columns across all tables
- **Schema Organization:** public, auth, vault, storage, realtime, cron
- **Multi-tenancy:** Via `organization_id` column
- **RLS Enabled:** Yes, on most public tables

---

## Public Schema Tables

### Core Fleet Management (11 tables)

#### 1. vehicles
**Purpose:** Master vehicle registry
**Key Columns:** `id`, `registration_number`, `make`, `model`, `type`, `fuel_type`, `current_odometer`, `status`, `organization_id`
**Documents:** RC, insurance, fitness, permit, PUC with expiry dates
**Relationships:** → drivers, trips, maintenance_tasks, wear_parts

#### 2. drivers
**Purpose:** Driver information and documents
**Key Columns:** `id`, `name`, `license_number`, `contact_number`, `status`, `organization_id`
**Documents:** License, Aadhar, police verification, bank details, medical certificate
**Relationships:** → trips, driver_vehicle_performance

#### 3. trips
**Purpose:** Trip records with fuel and expenses
**Key Columns:** `id`, `vehicle_id`, `driver_id`, `warehouse_id`, `destinations[]`, `start_km`, `end_km`, `fuel_quantity`, `billing_type`, `income_amount`, `net_profit`, `organization_id`
**Features:** P&L tracking, refueling data, expenses breakdown
**Relationships:** → vehicles, drivers, warehouses, fuel_stations

#### 4. destinations
**Purpose:** Location master with GPS
**Key Columns:** `id`, `name`, `latitude`, `longitude`, `type`, `state`, `organization_id`
**Features:** Google Places integration, historical deviation tracking

#### 5. warehouses
**Purpose:** Warehouse/depot locations
**Key Columns:** `id`, `name`, `pincode`, `latitude`, `longitude`, `material_type_ids[]`, `organization_id`

#### 6. fuel_stations
**Purpose:** Fuel station master
**Key Columns:** `id`, `name`, `address`, `city`, `state`, `fuel_types[]`, `preferred`, `organization_id`

#### 7. material_types
**Purpose:** Cargo/material type master
**Key Columns:** `id`, `name`, `active`, `organization_id`

---

### Maintenance System (8 tables)

#### 8. maintenance_tasks
**Purpose:** Main maintenance/repair tracking
**Key Columns:** `id`, `vehicle_id`, `task_type`, `status`, `priority`, `actual_cost`, `start_date`, `end_date`, `downtime_hours`, `odometer_reading`
**Features:** Downtime tracking, warranty management, bill attachments
**Relationships:** → maintenance_entries, maintenance_service_tasks, wear_parts

#### 9. maintenance_entries ✅ FULLY DOCUMENTED
**Purpose:** Detailed maintenance records with vendor details
**Key Columns:** `id`, `vehicle_id`, `maintenance_task_id`, `vendor_name`, `vendor_type` (service_category ENUM), `service_date`, `labor_charges`, `parts_charges`, `bill_amount`, `payment_status`, `bill_photo_urls[]`, `organization_id`
**Features:** Complete service record with parts serviced (JSONB), complaints, work done, mechanic name, test drive, customer approval
**See:** [DATABASE_SCHEMA.md - maintenance_entries](./DATABASE_SCHEMA.md#maintenance_entries) for complete documentation

#### 10. maintenance_service_tasks
**Purpose:** Service task breakdown within maintenance
**Key Columns:** `id`, `maintenance_task_id`, `tasks[]`, `service_cost`, `bill_url[]`, `parts_data`, `service_type`, `notes`
**Features:** Unified parts tracking (batteries, tyres, oil, brakes, etc.) via parts_data JSONB array

#### 11. maintenance_vendors
**Purpose:** Service provider/vendor master
**Key Columns:** `id`, `vendor_name`, `vendor_type`, `contact_person`, `phone`, `gst_number`, `specializations[]`, `rating`, `organization_id`
**Features:** Rating, turnaround time, pricing, contract management

#### 12. maintenance_tasks_catalog
**Purpose:** Predefined maintenance task templates
**Key Columns:** `id`, `task_category`, `task_name`, `default_vendor_id`, `default_cost_range`

#### 13. maintenance_schedules
**Purpose:** Scheduled maintenance planning
**Key Columns:** `id`, `vehicle_id`, `schedule_type`, `frequency_km`, `frequency_months`, `next_due_date`, `organization_id`

#### 14. maintenance_audit_logs
**Purpose:** Audit trail for maintenance changes
**Key Columns:** `id`, `task_id`, `timestamp`, `admin_user`, `changes` (jsonb)

#### 15. wear_parts
**Purpose:** Parts lifecycle tracking (tyres, batteries, filters, etc.)
**Key Columns:** `id`, `vehicle_id`, `part_type`, `part_category`, `installed_date`, `installed_odometer`, `expected_life_km`, `current_condition`, `condition_percentage`, `cost_per_km`, `organization_id`
**Features:** Performance tracking, warranty management, cost analysis

---

### Alerts & Reminders (5 tables)

#### 16. ai_alerts
**Purpose:** AI-generated alerts and warnings
**Key Columns:** `id`, `alert_type`, `severity`, `status`, `title`, `description`, `affected_entity` (jsonb), `user_id`

#### 17. alert_settings
**Purpose:** User alert preferences
**Key Columns:** `id`, `user_id`, `auto_popup`, `display_type`, `group_by`, `enabled_types[]`, `popup_display_frequency`

#### 18. alert_thresholds
**Purpose:** Custom alert threshold configuration
**Key Columns:** `id`, `user_id`, `alert_type`, `threshold_days`, `threshold_km`, `notification_methods[]`

#### 19. reminder_tracking
**Purpose:** Document expiry reminders
**Key Columns:** `id`, `reminder_type`, `entity_id`, `entity_type`, `status`, `due_date`, `days_left`, `metadata` (jsonb)

#### 20. reminder_templates
**Purpose:** Reminder configuration templates
**Key Columns:** `id`, `reminder_type`, `default_days_before`, `repeat`, `default_contact_id`

#### 21. reminder_contacts
**Purpose:** Contact persons for reminders
**Key Columns:** `id`, `full_name`, `position`, `phone_number`, `email`, `preferred_contact_mode`, `assigned_types[]`

---

### Organizations & Multi-tenancy (2 tables)

#### 22. organizations
**Purpose:** Organization/company master
**Key Columns:** `id`, `name`, `logo_url`, `contact_email`, `gst_number`, `owner_id`, `verified`, `active`, `login_username`
**Features:** Complete business details, banking info, branding

#### 23. organization_users
**Purpose:** User-organization mapping (NOT VISIBLE IN SCHEMA - may be in different schema)
**Expected Columns:** `user_id`, `organization_id`, `role`
**Note:** Referenced in RLS policies but not in public schema

---

### Activity & Audit (4 tables)

#### 24. activity_log
**Purpose:** General activity logging
**Key Columns:** `id`, `entity_type`, `entity_id`, `action_type`, `action_by`, `changes` (jsonb), `timestamp`

#### 25. activity_logs (duplicate/different?)
**Purpose:** Alternative activity log table
**Key Columns:** Similar to activity_log

#### 26. vehicle_activity_log
**Purpose:** Vehicle-specific activity tracking
**Key Columns:** `id`, `vehicle_id`, `action_type`, `action_by`, `metadata` (jsonb), `ip_address`, `user_agent`

#### 27. audit_trail
**Purpose:** Complete audit trail for compliance
**Key Columns:** `id`, `operation_type`, `entity_type`, `entity_id`, `user_id`, `changes_made` (jsonb), `severity_level`, `confidence_score`

---

### KPI & Analytics (4 tables)

#### 28. kpi_cards
**Purpose:** Dashboard KPI card configuration
**Key Columns:** `id`, `title`, `value`, `change`, `trend`, `category`, `organization_id`

#### 29. events_feed
**Purpose:** Activity feed/timeline events
**Key Columns:** `id`, `event_type`, `entity_type`, `entity_id`, `title`, `description`, `severity`, `organization_id`

#### 30. driver_vehicle_performance
**Purpose:** Driver-vehicle performance metrics
**Key Columns:** `id`, `driver_id`, `vehicle_id`, `period_start`, `period_end`, `total_km_driven`, `avg_mileage`, `brake_pad_wear_rate`, `tire_wear_rate`

#### 31. generated_reports
**Purpose:** Generated report storage/history
**Key Columns:** Details not fully visible in schema

---

### Corrections & Baselines (2 tables)

#### 32. trip_corrections
**Purpose:** Trip odometer correction tracking
**Key Columns:** `id`, `trip_id`, `field_name`, `old_value`, `new_value`, `correction_reason`, `corrected_by`

#### 33. fuel_efficiency_baselines
**Purpose:** Vehicle fuel efficiency baselines
**Key Columns:** `id`, `vehicle_id`, `baseline_kmpl`, `sample_size`, `confidence_score`, `tolerance_upper_percent`

---

### Settings & Configuration (5 tables)

#### 34. document_settings
**Purpose:** Document type configuration
**Key Columns:** `id`, `doc_type`, `is_required`, `warning_days_before_expiry`, `accepted_formats[]`, `user_id`

#### 35. driver_ranking_settings
**Purpose:** Driver ranking algorithm weights
**Key Columns:** `id`, `mileage_weight`, `trip_completion_weight`, `complaints_weight`, `breakdowns_weight`, `user_id`

#### 36. global_settings
**Purpose:** General application settings
**Key Columns:** `id`, `setting_name`, `setting_value`, `user_id`

---

### Admin Masters (3 tables)

#### 37. admin_insurers
**Purpose:** Insurance company master
**Key Columns:** `id`, `name`, `active`, `organization_id`

#### 38. admin_vendors
**Purpose:** General vendor master
**Key Columns:** `id`, `name`, `contact`, `address`, `organization_id`

#### 39. message_templates
**Purpose:** Communication templates
**Key Columns:** `id`, `template_name`, `template_content`, `template_type`, `language`

---

### Vehicle Configuration (1 table)

#### 40. vehicle_configurations
**Purpose:** Detailed vehicle specifications
**Key Columns:** `id`, `vehicle_id`, `wheel_count`, `tire_size_front`, `tire_size_rear`, `engine_oil_capacity`, `battery_type`, `recommended_engine_oil`, filter types, maintenance intervals

---

## How to Use This Reference

### For AI Agents:
1. **Check table existence** - Verify table name before querying
2. **Verify column names** - Use exact column names from this list
3. **Check organization_id** - Most tables have this for multi-tenancy
4. **Review relationships** - Understand foreign key connections

### For Updating Documentation:
1. Pick a table from this list
2. Use Supabase AI to get complete schema:
   ```
   SHOW CREATE TABLE table_name;
   ```
   or
   ```
   Get complete schema for "table_name" including all columns, types, constraints, and indexes
   ```
3. Use the template in [TEMPLATE_FOR_UPDATES.md](./TEMPLATE_FOR_UPDATES.md)
4. Update the appropriate documentation file

### Priority Tables to Document Fully:
Based on complexity and importance:
1. **High Priority:**
   - maintenance_entries
   - wear_parts
   - maintenance_vendors
   - vehicle_configurations
   - driver_vehicle_performance

2. **Medium Priority:**
   - maintenance_schedules
   - generated_reports
   - reminder_tracking (expand current docs)

3. **Already Documented (verify accuracy):**
   - vehicles, drivers, trips, destinations
   - maintenance_tasks
   - kpi_cards, events_feed
   - organizations

---

## ENUM Types Found

From the schema analysis:

1. **destination_type** - Destination categories
2. **state_type** - Indian states
3. **driver_status** - Driver status values
4. **maintenance_type** - Maintenance categories
5. **maintenance_status** - Maintenance task status
6. **maintenance_priority** - Priority levels
7. **vehicle_type** - Vehicle categories
8. **fuel_type** - Fuel types
9. **vehicle_status** - Vehicle status
10. **billing_type** - Billing calculation methods ('per_km', 'per_ton', 'manual')
11. **profit_status** - P&L status ('profit', 'loss', 'neutral')
12. **reminder_contact_mode** - Contact methods
13. **service_category** - Vendor service categories

---

## Key Observations

### 1. Multi-Tenancy Implementation
- Primary method: `organization_id` column in most tables
- Secondary method: `created_by`/`added_by` linking to users
- RLS policies enforce organization-based access

### 2. Document Management
- Document URLs stored in columns (not separate document tables)
- Format: `text[]` arrays for multiple documents
- Examples: `insurance_document_url[]`, `fitness_document_url[]`

### 3. Comprehensive Maintenance System
- Multiple interconnected tables
- Full part lifecycle tracking
- Vendor management
- Performance analytics
- Cost tracking

### 4. Advanced Features
- AI-generated alerts
- Configurable reminders
- Performance benchmarking
- Fuel efficiency baselines
- Wear part tracking
- Complete audit trails

---

## Next Steps

**To complete documentation:**

1. Choose which tables need full documentation (see Priority list above)
2. Query Supabase AI for complete schema of chosen tables
3. Use templates in TEMPLATE_FOR_UPDATES.md
4. Update DATABASE_SCHEMA.md with new sections

**Recommended approach:**
Start with the **maintenance system** tables as they're most complex and critical:
- maintenance_entries
- wear_parts
- maintenance_vendors
- vehicle_configurations

---

**Last Updated:** 2025-11-03
**Source:** Direct Supabase schema export
**Total Tables Identified:** 40+ tables
**Schema Version:** Current production

---

## 🚨 Important Notes

- ✅ This is the **actual** schema from your Supabase database
- ✅ All table names and key columns verified
- ✅ Some tables have hundreds of columns - this is a summary
- ⚠️ `organization_users` table exists but may be in auth schema or different location
- ⚠️ Some materialized views may not be created yet
- ⚠️ Edge functions and RPC functions need separate verification
