/*
  # Add Battery and Tyre Data Columns to Maintenance Service Tasks
  
  1. New Columns
    - `battery_data` (JSONB) - Stores battery information including serial number and brand
    - `tyre_data` (JSONB) - Stores tyre information including positions, brand, and serial numbers
  
  2. Purpose
    - Enable tracking of battery replacements during maintenance
    - Enable tracking of tyre changes and rotations during maintenance
    - Store structured data in JSON format for flexible schema evolution
*/

-- Add battery_data and tyre_data columns to maintenance_service_tasks
ALTER TABLE maintenance_service_tasks 
ADD COLUMN IF NOT EXISTS battery_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tyre_data JSONB DEFAULT NULL;

-- Update the table comment to explain the new columns
COMMENT ON COLUMN maintenance_service_tasks.battery_data IS 'Battery replacement details including serial number and brand';
COMMENT ON COLUMN maintenance_service_tasks.tyre_data IS 'Tyre replacement details including positions, brand and serial numbers';