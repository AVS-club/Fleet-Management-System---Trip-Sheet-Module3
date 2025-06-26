/*
  # Add address field to drivers table
  
  1. Changes
    - Add `address` column to the drivers table
    - This column is nullable (optional) as the address field is not required
    
  2. Security
    - No RLS changes needed as the drivers table already has appropriate policies
*/

-- Add address column to drivers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'address'
  ) THEN
    ALTER TABLE drivers ADD COLUMN address text;
  END IF;
END $$;