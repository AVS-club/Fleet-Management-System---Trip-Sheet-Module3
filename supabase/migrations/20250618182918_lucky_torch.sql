/*
  # Add tax_paid_upto column to vehicles table
  
  1. Changes
    - Add `tax_paid_upto` date column to vehicles table
    - Remove `tax_period` column from vehicles table (commented out for safety)
    
  2. Notes
    - This migration adds a new date field for tracking when tax is paid up to
    - The existing tax_period field is kept for backward compatibility
*/

-- Add tax_paid_upto column to vehicles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_paid_upto'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tax_paid_upto date;
  END IF;
END $$;

-- Note: We're not removing the tax_period column for backward compatibility
-- If you want to remove it in the future, uncomment the following:
/*
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tax_period'
  ) THEN
    ALTER TABLE vehicles DROP COLUMN tax_period;
  END IF;
END $$;
*/