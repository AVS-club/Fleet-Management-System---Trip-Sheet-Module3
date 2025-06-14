/*
  # Update maintenance_type enum with new values

  1. Changes
    - Create new maintenance_type enum with updated values
    - Convert existing task_type values to new format
    - Update maintenance_tasks table to use new enum type
*/

-- First, check if the maintenance_tasks table exists
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Create a temporary column to hold the converted values
    ALTER TABLE maintenance_tasks ADD COLUMN temp_task_type TEXT;
    
    -- Convert old values to new format
    UPDATE maintenance_tasks SET temp_task_type = 
      CASE task_type::TEXT
        WHEN 'general_scheduled' THEN 'general_scheduled_service'
        WHEN 'emergency_breakdown' THEN 'wear_and_tear_replacement_repairs'
        WHEN 'driver_damage' THEN 'accidental'
        WHEN 'warranty_claim' THEN 'others'
        ELSE 'others'
      END;
    
    -- Drop the old enum type constraint from the column
    ALTER TABLE maintenance_tasks ALTER COLUMN task_type TYPE TEXT;
    
    -- Drop the old enum type if it exists
    DROP TYPE IF EXISTS maintenance_type;
    
    -- Create the new enum type
    CREATE TYPE maintenance_type AS ENUM (
      'general_scheduled_service',
      'wear_and_tear_replacement_repairs',
      'accidental',
      'others'
    );
    
    -- Update the task_type column with values from temp_task_type
    UPDATE maintenance_tasks SET task_type = temp_task_type;
    
    -- Convert the column to use the new enum type
    ALTER TABLE maintenance_tasks ALTER COLUMN task_type TYPE maintenance_type USING task_type::maintenance_type;
    
    -- Drop the temporary column
    ALTER TABLE maintenance_tasks DROP COLUMN temp_task_type;
  ELSE
    -- If the table doesn't exist, just create the enum type
    DROP TYPE IF EXISTS maintenance_type;
    
    CREATE TYPE maintenance_type AS ENUM (
      'general_scheduled_service',
      'wear_and_tear_replacement_repairs',
      'accidental',
      'others'
    );
  END IF;
END $$;