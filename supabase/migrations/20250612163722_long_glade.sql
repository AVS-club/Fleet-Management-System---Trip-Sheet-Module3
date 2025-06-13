/*
  # Add missing vehicle columns

  1. Changes
    - Add missing columns to the vehicles table to support all form fields
    - Ensure tax_receipt_document and other document URL fields are properly added
    - Add other_documents JSONB field for additional document storage

  This migration addresses the error: "Could not find the 'tax_receipt_document' column of 'vehicles' in the schema cache"
*/

-- Check if columns exist before adding them to avoid errors
DO $$ 
BEGIN
  -- Tax receipt document column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'tax_receipt_document'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_receipt_document BOOLEAN DEFAULT false;
  END IF;

  -- Document URLs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'rc_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN rc_document_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'insurance_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_document_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'fitness_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_document_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'tax_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_document_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'permit_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_document_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'puc_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_document_url TEXT;
  END IF;

  -- Basic Information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'tyre_size'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tyre_size TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'number_of_tyres'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN number_of_tyres INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'rc_expiry_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN rc_expiry_date DATE;
  END IF;

  -- Insurance Details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'insurance_policy_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_policy_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'insurer_name'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurer_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'insurance_start_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_start_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'insurance_expiry_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_expiry_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'insurance_premium_amount'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_premium_amount NUMERIC;
  END IF;

  -- Fitness Certificate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'fitness_certificate_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_certificate_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'fitness_issue_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_issue_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'fitness_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_cost NUMERIC;
  END IF;

  -- Tax Details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'tax_receipt_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_receipt_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_amount NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'tax_period'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_period TEXT;
  END IF;

  -- Permit Details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'permit_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'permit_issuing_state'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_issuing_state TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'permit_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'permit_issue_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_issue_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'permit_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_cost NUMERIC;
  END IF;

  -- PUC Certificate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'puc_certificate_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_certificate_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'puc_issue_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_issue_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'puc_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_cost NUMERIC;
  END IF;

  -- Other fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'issuing_state'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN issuing_state TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'other_documents'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN other_documents JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'registration_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN registration_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'policy_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN policy_number TEXT;
  END IF;
END $$;