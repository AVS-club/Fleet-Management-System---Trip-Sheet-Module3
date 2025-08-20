/*
  # Add created_by column to vehicles table

  1. Schema Changes
    - Add `created_by` column to `vehicles` table
    - Column type: uuid (references users.id)
    - Nullable: true (to handle existing records)
    - Default: null initially, but can be set via trigger or application logic

  2. Security
    - No RLS changes needed (vehicles table already has RLS enabled)
    - Foreign key constraint to users table for data integrity

  3. Notes
    - This migration is safe for existing data
    - Existing vehicles will have created_by as null initially
    - New vehicles will have created_by populated by application logic
*/

-- Add created_by column to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehicles_created_by_fkey'
  ) THEN
    ALTER TABLE vehicles 
    ADD CONSTRAINT vehicles_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON vehicles(created_by);