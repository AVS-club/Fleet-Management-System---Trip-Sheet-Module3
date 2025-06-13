/*
  # Add permit columns to vehicles table

  1. New Columns
    - `permit_number` (text) - The permit number
    - `issuing_state` (state_type) - State that issued the permit
    - `permit_type` (permit_type_enum) - Type of permit
    - `permit_issue_date` (timestamptz) - When permit was issued
    - `permit_cost` (numeric) - Cost of the permit

  2. New Types
    - `permit_type_enum` - Enum for different permit types

  3. Changes
    - Add missing permit-related columns to vehicles table
    - Create permit_type enum for standardized permit types
*/

-- Create permit type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permit_type_enum') THEN
    CREATE TYPE permit_type_enum AS ENUM ('national', 'state', 'temporary', 'special');
  END IF;
END $$;

-- Add missing permit columns to vehicles table
DO $$
BEGIN
  -- Add permit_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'permit_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_number text;
  END IF;

  -- Add issuing_state column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'issuing_state'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN issuing_state state_type;
  END IF;

  -- Add permit_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'permit_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_type permit_type_enum;
  END IF;

  -- Add permit_issue_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'permit_issue_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_issue_date timestamptz;
  END IF;

  -- Add permit_cost column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'permit_cost'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN permit_cost numeric(10,2);
  END IF;
END $$;