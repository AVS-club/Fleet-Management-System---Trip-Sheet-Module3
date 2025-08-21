/*
  # Add primary_driver_id column to vehicles table

  1. Schema Changes
    - Add `primary_driver_id` column to `vehicles` table
    - Set up foreign key relationship to `drivers` table
    - Add index for performance

  2. Security
    - Column inherits existing RLS policies from vehicles table

  This resolves the frontend error: "Could not find the 'primary_driver_id' column of 'vehicles' in the schema cache"
*/

-- Add primary_driver_id column to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'primary_driver_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN primary_driver_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehicles_primary_driver_id_fkey'
  ) THEN
    ALTER TABLE vehicles 
    ADD CONSTRAINT vehicles_primary_driver_id_fkey 
    FOREIGN KEY (primary_driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_vehicles_primary_driver_id'
  ) THEN
    CREATE INDEX idx_vehicles_primary_driver_id ON vehicles(primary_driver_id);
  END IF;
END $$;