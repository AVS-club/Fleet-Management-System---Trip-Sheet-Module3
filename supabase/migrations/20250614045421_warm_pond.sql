/*
  # Update Maintenance Task Type Options

  1. Changes
    - Create 'maintenance_type' enum with new values if it doesn't exist
    - Update existing maintenance task records with new type values
    - Change task_type column to use the new enum type
  
  2. New Values
    - 'general_scheduled_service' (replacing 'general_scheduled')
    - 'wear_and_tear_replacement_repairs' (replacing 'emergency_breakdown')
    - 'accidental' (replacing 'driver_damage')
    - 'others' (replacing 'warranty_claim')
*/

-- First, check if the maintenance_type enum exists, create it if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    CREATE TYPE maintenance_type AS ENUM (
      'general_scheduled_service',
      'wear_and_tear_replacement_repairs',
      'accidental',
      'others'
    );
  END IF;
END $$;

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

-- Check if the maintenance_tasks table and task_type column exist
DO $$
DECLARE
  table_exists BOOLEAN;
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks'
  ) INTO table_exists;
  
  IF table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'maintenance_tasks'
      AND column_name = 'task_type'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- Temporarily alter the column to text type to allow the conversion
      EXECUTE 'ALTER TABLE maintenance_tasks ALTER COLUMN task_type TYPE TEXT';
      
      -- Update existing data to use new values
      EXECUTE 'UPDATE maintenance_tasks SET task_type = temp_convert_task_type(task_type)';
      
      -- Change the column type to use the maintenance_type enum
      EXECUTE 'ALTER TABLE maintenance_tasks ALTER COLUMN task_type TYPE maintenance_type USING task_type::maintenance_type';
    END IF;
  END IF;
END $$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS temp_convert_task_type;