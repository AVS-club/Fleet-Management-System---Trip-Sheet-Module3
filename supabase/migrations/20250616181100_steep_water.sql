/*
  # Add owner_name column to vehicles table

  1. Changes
    - Add `owner_name` column to vehicles table if it doesn't exist
    - This column will store the name of the vehicle's owner

  2. Security
    - No changes to RLS policies required as the vehicles table already has appropriate policies
*/

-- Add owner_name column to vehicles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN owner_name text;
  END IF;
END $$;