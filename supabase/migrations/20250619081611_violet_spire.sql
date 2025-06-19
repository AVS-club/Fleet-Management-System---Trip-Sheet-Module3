/*
  # Add tax_paid_upto column to vehicles table
  
  1. Changes
    - Add tax_paid_upto column to vehicles table
    - This column will store the date until which tax has been paid
    - Used for tax expiry reminders and compliance tracking
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