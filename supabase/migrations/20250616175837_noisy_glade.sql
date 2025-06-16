/*
  # Add VAHAN metadata columns to vehicles table
  
  1. New Columns
    - `financer` (text) - Financing entity name
    - `vehicle_class` (text) - Vehicle class from VAHAN
    - `color` (text) - Vehicle color
    - `cubic_capacity` (numeric) - Engine cubic capacity in cc
    - `cylinders` (integer) - Number of cylinders
    - `unladen_weight` (numeric) - Unladen weight in kg
    - `seating_capacity` (integer) - Number of seats
    - `emission_norms` (text) - Emission norms compliance (e.g., BS6)
    - `noc_details` (text) - No Objection Certificate details
    - `national_permit_number` (text) - National permit number
    - `national_permit_upto` (date) - National permit validity
    - `rc_status` (text) - RC status from VAHAN
    - `vahan_last_fetched_at` (timestamptz) - When VAHAN data was last fetched
    - `other_info_documents` (text[]) - Array of document URLs for additional uploads

  2. Notes
    - All columns are nullable for backward compatibility
    - `vehicle_class` is named this way to avoid conflict with SQL reserved word `class`
    - Uses DO blocks to add columns only if they don't exist
*/

-- Add VAHAN metadata columns to vehicles table if they don't exist
DO $$ 
BEGIN
  -- Financer details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'financer'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN financer text;
  END IF;

  -- Vehicle class (using 'vehicle_class' to avoid conflict with SQL reserved word 'class')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_class'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_class text;
  END IF;

  -- Color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'color'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN color text;
  END IF;

  -- Cubic capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'cubic_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN cubic_capacity numeric;
  END IF;

  -- Number of cylinders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'cylinders'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN cylinders integer;
  END IF;

  -- Unladen weight
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'unladen_weight'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN unladen_weight numeric;
  END IF;

  -- Seating capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'seating_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN seating_capacity integer;
  END IF;

  -- Emission norms
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'emission_norms'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN emission_norms text;
  END IF;

  -- NOC details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'noc_details'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN noc_details text;
  END IF;

  -- National permit number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'national_permit_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN national_permit_number text;
  END IF;

  -- National permit validity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'national_permit_upto'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN national_permit_upto date;
  END IF;

  -- RC status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'rc_status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN rc_status text;
  END IF;

  -- Last fetched timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vahan_last_fetched_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vahan_last_fetched_at timestamptz;
  END IF;

  -- Other info documents array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'other_info_documents'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN other_info_documents text[];
  END IF;
END $$;