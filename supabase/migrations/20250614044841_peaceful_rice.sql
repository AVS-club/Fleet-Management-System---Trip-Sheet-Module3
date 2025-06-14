/*
  # Update maintenance_type enum for task_type column

  1. Changes
    - Add new values to maintenance_type enum:
      - 'general_scheduled_service'
      - 'wear_and_tear_replacement_repairs'
      - 'accidental'
      - 'others'
    - Update existing data to use new enum values
    - This migration supports the updated maintenance task form

  Note: This is a complex operation as Postgres doesn't allow directly modifying enum types.
  We need to:
  1. Create a new enum type with the updated values
  2. Update the column to use the new type
  3. Map old values to new values during the transition
*/

-- First, create a new enum type with the updated values
CREATE TYPE maintenance_type_new AS ENUM (
  'general_scheduled_service',
  'wear_and_tear_replacement_repairs',
  'accidental',
  'others'
);

-- Create a temporary function to convert old values to new values
CREATE OR REPLACE FUNCTION temp_convert_task_type(old_type TEXT) 
RETURNS TEXT AS $$
BEGIN
  CASE old_type
    WHEN 'general_scheduled' THEN RETURN 'general_scheduled_service';
    WHEN 'emergency_breakdown' THEN RETURN 'wear_and_tear_replacement_repairs';
    WHEN 'driver_damage' THEN RETURN 'accidental';
    WHEN 'warranty_claim' THEN RETURN 'others';
    ELSE RETURN 'others';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Temporarily alter the column to text type to allow the conversion
ALTER TABLE maintenance_tasks 
  ALTER COLUMN task_type TYPE TEXT;

-- Update existing data to use new values
UPDATE maintenance_tasks
SET task_type = temp_convert_task_type(task_type);

-- Change the column type to use the new enum
ALTER TABLE maintenance_tasks 
  ALTER COLUMN task_type TYPE maintenance_type_new 
  USING task_type::maintenance_type_new;

-- Drop the temporary function
DROP FUNCTION temp_convert_task_type;

-- Drop the old enum type if it's not used elsewhere
-- Note: This might fail if the type is used by other columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'maintenance_type'
  ) THEN
    DROP TYPE IF EXISTS maintenance_type;
  END IF;
END $$;

-- Rename the new enum type to the original name
ALTER TYPE maintenance_type_new RENAME TO maintenance_type;