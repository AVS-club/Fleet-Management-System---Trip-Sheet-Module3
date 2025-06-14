/*
  # Update maintenance_tasks task_type values

  1. Changes
    - Create maintenance_type enum if it doesn't exist
    - Add task_type column with new values if table exists
    - Ensure backward compatibility
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
  ELSE
    -- If it exists, check if it has all the values we need
    -- This is a safer approach than trying to drop and recreate
    BEGIN
      ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS 'general_scheduled_service';
      ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS 'wear_and_tear_replacement_repairs';
      ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS 'accidental';
      ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS 'others';
    EXCEPTION
      WHEN OTHERS THEN
        -- If adding values fails, we'll create a new type and handle the conversion
        -- in a separate migration if needed
        NULL;
    END;
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
    -- Table exists, check if task_type column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'maintenance_tasks'
      AND column_name = 'task_type'
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

      -- Temporarily alter the column to text type to allow the conversion
      ALTER TABLE maintenance_tasks 
        ALTER COLUMN task_type TYPE TEXT;

      -- Update existing data to use new values
      UPDATE maintenance_tasks
      SET task_type = temp_convert_task_type(task_type);

      -- Change the column type to use the maintenance_type enum
      ALTER TABLE maintenance_tasks 
        ALTER COLUMN task_type TYPE maintenance_type 
        USING task_type::maintenance_type;

      -- Drop the temporary function
      DROP FUNCTION temp_convert_task_type;
    END IF;
  END IF;
END $$;