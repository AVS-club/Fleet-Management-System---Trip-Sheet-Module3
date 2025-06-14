/*
  # Update maintenance_type enum values

  1. Changes
    - Create new maintenance_type enum with updated values
    - Update maintenance_tasks.task_type column to use new enum values
    - Ensure proper conversion of existing data
*/

-- First, check if the maintenance_tasks table exists
DO $$
DECLARE
  table_exists BOOLEAN;
  column_exists BOOLEAN;
  enum_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks'
  ) INTO table_exists;
  
  -- Check if enum exists
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'maintenance_type'
  ) INTO enum_exists;
  
  IF table_exists THEN
    -- Check if column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'maintenance_tasks'
      AND column_name = 'task_type'
    ) INTO column_exists;
    
    IF column_exists THEN
      -- If the enum already exists, we need to drop it and recreate it
      IF enum_exists THEN
        -- First, change the column to text type
        ALTER TABLE maintenance_tasks ALTER COLUMN task_type TYPE TEXT;
      END IF;
    END IF;
  END IF;
END $$;

-- Drop the existing enum type if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    -- Drop the type (this will work because we've already changed the column to TEXT)
    DROP TYPE maintenance_type;
  END IF;
END $$;

-- Create the new enum type with updated values
CREATE TYPE maintenance_type AS ENUM (
  'general_scheduled_service',
  'wear_and_tear_replacement_repairs',
  'accidental',
  'others'
);

-- Update the data in the maintenance_tasks table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks'
  ) THEN
    -- Update existing values to match the new enum values
    UPDATE maintenance_tasks 
    SET task_type = 
      CASE task_type
        WHEN 'general_scheduled' THEN 'general_scheduled_service'
        WHEN 'emergency_breakdown' THEN 'wear_and_tear_replacement_repairs'
        WHEN 'driver_damage' THEN 'accidental'
        WHEN 'warranty_claim' THEN 'others'
        ELSE 'others'
      END;
    
    -- Now alter the column to use the new enum type
    ALTER TABLE maintenance_tasks 
    ALTER COLUMN task_type TYPE maintenance_type 
    USING task_type::maintenance_type;
  END IF;
END $$;