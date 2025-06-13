/*
  # Add Missing Vehicle Form Columns

  1. Changes
    - Drop permit_type_enum type if it exists
    - Modify issuing_state column to text type
    - Modify permit_type column to text type
    - Add all missing columns for the vehicle form:
      - registration_date
      - rc_expiry_date
      - rc_document_url
      - policy_number
      - insurer_name
      - insurance_start_date
      - insurance_expiry_date
      - insurance_premium_amount
      - insurance_document_url
      - fitness_certificate_number
      - fitness_issue_date
      - fitness_cost
      - fitness_document_url
      - tax_receipt_number
      - tax_amount
      - tax_period
      - tax_document_url
      - puc_certificate_number
      - puc_issue_date
      - puc_cost
      - puc_document_url
*/

-- Drop permit_type_enum if it exists
DROP TYPE IF EXISTS permit_type_enum;

-- Modify issuing_state to text type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'issuing_state' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN issuing_state TYPE text USING issuing_state::text;
  END IF;
END $$;

-- Modify permit_type to text type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'permit_type' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN permit_type TYPE text USING permit_type::text;
  END IF;
END $$;

-- Add missing columns for vehicle form
DO $$
BEGIN
  -- Registration details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'registration_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN registration_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'rc_expiry_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN rc_expiry_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'rc_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN rc_document_url text;
  END IF;

  -- Insurance details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'policy_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN policy_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurer_name'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurer_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_start_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_expiry_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_expiry_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_premium_amount'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_premium_amount numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_document_url text;
  END IF;

  -- Fitness certificate details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'fitness_certificate_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_certificate_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'fitness_issue_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_issue_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'fitness_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'fitness_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_document_url text;
  END IF;

  -- Tax details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_receipt_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_receipt_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_amount numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_period'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_period text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_document_url text;
  END IF;

  -- PUC details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'puc_certificate_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_certificate_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'puc_issue_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_issue_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'puc_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'puc_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_document_url text;
  END IF;

  -- Permit document URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'permit_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_document_url text;
  END IF;
END $$;