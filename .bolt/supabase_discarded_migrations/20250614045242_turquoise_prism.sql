/*
  # Update Maintenance Task Type Options
  
  1. Changes
    - Create maintenance_type enum if it doesn't exist
    - Add new values for maintenance task types
    - Update existing maintenance_tasks table if it exists
    - Convert old task_type values to new format
  
  This migration handles the conversion of maintenance task types to the new format:
  - 'general_scheduled' → 'general_scheduled_service'
  - 'emergency_breakdown' → 'wear_and_tear_replacement_repairs'
  - 'driver_damage' → 'accidental'
  - 'warranty_claim' → 'others'
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

-- Check if the maintenance_tasks table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks'
  ) THEN
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
  END IF;
END $$;

-- Update the task_type column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks'
    AND column_name = 'task_type'
  ) THEN
    -- Temporarily alter the column to text type to allow the conversion
    ALTER TABLE maintenance_tasks 
      ALTER COLUMN task_type TYPE TEXT;

    -- Update existing data to use new values
    UPDATE maintenance_tasks
    SET task_type = temp_convert_task_type(task_type);
  END IF;
END $$;

-- Change the column type to use the maintenance_type enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks'
    AND column_name = 'task_type'
  ) THEN
    -- Change the column type to use the maintenance_type enum
    ALTER TABLE maintenance_tasks 
      ALTER COLUMN task_type TYPE maintenance_type 
      USING task_type::maintenance_type;
  END IF;
END $$;

-- Drop the temporary function if it exists
DO $$
BEGIN
  DROP FUNCTION IF EXISTS temp_convert_task_type;
END $$;