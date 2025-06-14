-- First create trigger_set_timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if experience column exists and rename to experience_years
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'experience'
  ) THEN
    ALTER TABLE drivers RENAME COLUMN experience TO experience_years;
  END IF;
END $$;

-- Add document URL columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'driver_photo_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN driver_photo_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'license_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN license_doc_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'aadhar_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN aadhar_doc_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'police_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN police_doc_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'bank_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN bank_doc_url text;
  END IF;
END $$;

-- Ensure foreign key relationship is properly defined
DO $$
BEGIN
  -- First check if the constraint already exists to avoid errors
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'drivers_primary_vehicle_id_fkey' 
    AND table_name = 'drivers'
  ) THEN
    -- Only add the constraint if the column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'drivers' AND column_name = 'primary_vehicle_id'
    ) THEN
      ALTER TABLE drivers 
        ADD CONSTRAINT drivers_primary_vehicle_id_fkey
        FOREIGN KEY (primary_vehicle_id) 
        REFERENCES vehicles(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create function for format conversion
CREATE OR REPLACE FUNCTION format_driver_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Convert license_number to uppercase
  IF NEW.license_number IS NOT NULL THEN
    NEW.license_number = UPPER(NEW.license_number);
  END IF;
  
  -- Convert email to lowercase
  IF NEW.email IS NOT NULL THEN
    NEW.email = LOWER(NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS format_driver_fields_trigger ON drivers;
CREATE TRIGGER format_driver_fields_trigger
BEFORE INSERT OR UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION format_driver_fields();

-- Add indexes for better performance if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'drivers' AND indexname = 'drivers_license_expiry_date_idx'
  ) THEN
    CREATE INDEX drivers_license_expiry_date_idx ON drivers(license_expiry_date);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'drivers' AND indexname = 'drivers_name_idx'
  ) THEN
    CREATE INDEX drivers_name_idx ON drivers(name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'drivers' AND indexname = 'drivers_license_number_idx'
  ) THEN
    CREATE INDEX drivers_license_number_idx ON drivers(license_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'drivers' AND indexname = 'drivers_status_idx'
  ) THEN
    CREATE INDEX drivers_status_idx ON drivers(status);
  END IF;
END $$;

-- Create column for driver status reason if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'driver_status_reason'
  ) THEN
    ALTER TABLE drivers ADD COLUMN driver_status_reason text;
  END IF;
END $$;

-- Add status check constraint if it doesn't already exist
-- Fixed: Use the correct enum type comparison instead of text comparison
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'drivers' AND constraint_name = 'drivers_status_check'
  ) THEN
    -- Check if status is already an enum type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'drivers' AND column_name = 'status' AND data_type = 'USER-DEFINED'
    ) THEN
      -- Status is already an enum, no need for constraint
      RAISE NOTICE 'Status is already an enum type, skipping constraint creation';
    ELSE
      -- Status is not an enum, add check constraint with proper casting
      ALTER TABLE drivers
      ADD CONSTRAINT drivers_status_check
      CHECK (status::text = ANY (ARRAY['active', 'inactive', 'onLeave', 'suspended', 'blacklisted']));
    END IF;
  END IF;
END $$;

-- Add updated_at trigger if not already present
DROP TRIGGER IF EXISTS set_timestamp_drivers ON drivers;
CREATE TRIGGER set_timestamp_drivers
BEFORE UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();