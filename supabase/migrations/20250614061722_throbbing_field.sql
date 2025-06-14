/*
  # Add maintenance_type enum

  1. New Types
    - `maintenance_type` - Enum for different maintenance categories
      - 'general_scheduled_service'
      - 'wear_and_tear_replacement_repairs'
      - 'accidental'
      - 'others'

  2. Changes
    - Create maintenance_type enum if it doesn't exist
    - Add category column to maintenance table if it doesn't exist
    - Add constraint to ensure category uses valid maintenance_type values
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

-- Add category column to maintenance table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance' AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance ADD COLUMN category text;
    
    -- Add constraint to ensure category uses valid maintenance_type values
    ALTER TABLE maintenance ADD CONSTRAINT maintenance_category_check
      CHECK (category = ANY (ARRAY['General', 'Accidental', 'Repair/Replacement', 'Others']));
  END IF;
END $$;