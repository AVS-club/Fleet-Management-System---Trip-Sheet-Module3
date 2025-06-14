/*
  # Drop vendor_id column from maintenance_service_tasks

  1. Changes
    - Drop `vendor_id` column from `maintenance_service_tasks` table
    - This column appears to be no longer needed in the current schema
  
  2. Notes
    - This is a destructive operation that will remove the vendor_id data
    - Ensure this change is intentional before applying
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN vendor_id;
  END IF;
END $$;