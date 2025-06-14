/*
  # Add category column to maintenance_tasks table
  
  1. Changes
    - Create maintenance_type enum if it doesn't exist
    - Add category column to maintenance_tasks table
    - Add constraint to ensure category uses valid values
*/

-- Create maintenance_type enum if it doesn't exist
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

-- Add category column to maintenance_tasks table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'maintenance_tasks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks' AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance_tasks ADD COLUMN category text;
    
    -- Add constraint to ensure category uses valid values
    ALTER TABLE maintenance_tasks ADD CONSTRAINT maintenance_tasks_category_check
      CHECK (category = ANY (ARRAY['General', 'Accidental', 'Repair/Replacement', 'Others']));
  END IF;
END $$;