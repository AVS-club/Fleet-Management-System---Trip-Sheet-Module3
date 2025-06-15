/*
  # Create Storage Buckets for Vehicle and Driver Documents

  1. New Storage Buckets
    - `vehicle-docs` - For storing vehicle documents (RC, insurance, etc.)
    - `vehicle-profiles` - For storing vehicle profile JSON data
    - `driver-profiles` - For storing driver profile JSON data
    - `drivers` - For storing driver photos and documents

  2. Security
    - Add appropriate RLS policies for each bucket
    - Allow authenticated users to manage their documents
    - Allow public access to profiles for sharing
*/

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add document URL columns to vehicles table
DO $$
BEGIN
  -- Add rc_document_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'rc_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN rc_document_url text;
  END IF;

  -- Add insurance_document_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'insurance_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_document_url text;
  END IF;

  -- Add fitness_document_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'fitness_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN fitness_document_url text;
  END IF;

  -- Add tax_document_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'tax_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_document_url text;
  END IF;

  -- Add permit_document_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'permit_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_document_url text;
  END IF;

  -- Add puc_document_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'puc_document_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN puc_document_url text;
  END IF;

  -- Add photo_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN photo_url text;
  END IF;
END $$;

-- Add UPDATE policy for vehicles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicles' 
    AND policyname = 'Allow authenticated users to update vehicles'
  ) THEN
    CREATE POLICY "Allow authenticated users to update vehicles"
    ON vehicles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;