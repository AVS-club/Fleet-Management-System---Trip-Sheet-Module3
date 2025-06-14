/*
  # Update Drivers Schema for Enhanced Driver Management

  1. New Columns
    - `driver_photo_url` (text) - URL to driver's profile photo in storage
    - `license_doc_url` (text) - URL to driver's license document in storage
    - `aadhar_doc_url` (text) - URL to driver's Aadhar card in storage
    - `police_doc_url` (text) - URL to driver's police verification in storage
    - `bank_doc_url` (text) - URL to driver's bank passbook/cancelled cheque in storage
    - `experience_years` (integer) - Driver's experience in years

  2. Modifications
    - Rename `experience` to `experience_years` if needed (with data preservation)
    - Ensure `license_number` and `email` columns have appropriate constraints

  3. Relationships
    - Ensure `primary_vehicle_id` correctly references `vehicles(id)`
*/

-- Add document URL columns if they don't exist
DO $$
BEGIN
  -- Driver photo URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'driver_photo_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN driver_photo_url text;
  END IF;

  -- License document URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'license_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN license_doc_url text;
  END IF;

  -- Aadhar document URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'aadhar_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN aadhar_doc_url text;
  END IF;

  -- Police verification document URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'police_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN police_doc_url text;
  END IF;

  -- Bank document URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'bank_doc_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN bank_doc_url text;
  END IF;
END $$;

-- Handle renaming experience to experience_years if needed
DO $$
DECLARE 
  has_experience BOOLEAN;
  has_experience_years BOOLEAN;
BEGIN
  -- Check if experience column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'experience'
  ) INTO has_experience;
  
  -- Check if experience_years column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'experience_years'
  ) INTO has_experience_years;
  
  -- If experience exists but experience_years doesn't, rename the column
  IF has_experience AND NOT has_experience_years THEN
    ALTER TABLE drivers RENAME COLUMN experience TO experience_years;
  -- If experience_years doesn't exist but experience does not exist either, create it
  ELSIF NOT has_experience_years AND NOT has_experience THEN
    ALTER TABLE drivers ADD COLUMN experience_years integer;
  END IF;
END $$;

-- Create triggers to enforce uppercase license numbers and lowercase emails
CREATE OR REPLACE FUNCTION format_driver_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Convert license number to uppercase
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

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'format_driver_fields_trigger'
  ) THEN
    CREATE TRIGGER format_driver_fields_trigger
    BEFORE INSERT OR UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION format_driver_fields();
  END IF;
END $$;

-- Update primary_vehicle_id foreign key constraint if needed
DO $$
BEGIN
  -- If the primary_vehicle_id column exists but no constraint, add foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'primary_vehicle_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.table_name = 'drivers'
    AND kcu.column_name = 'primary_vehicle_id'
  ) THEN
    ALTER TABLE drivers 
    ADD CONSTRAINT drivers_primary_vehicle_id_fkey 
    FOREIGN KEY (primary_vehicle_id) REFERENCES vehicles(id);
  END IF;
END $$;

-- Create or update index for license number to improve query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'drivers' AND indexname = 'drivers_license_number_idx'
  ) THEN
    CREATE INDEX drivers_license_number_idx ON drivers(license_number);
  END IF;
END $$;

-- Create or update index for license_expiry_date to help with expiry alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'drivers' AND indexname = 'drivers_license_expiry_date_idx'
  ) THEN
    CREATE INDEX drivers_license_expiry_date_idx ON drivers(license_expiry_date);
  END IF;
END $$;