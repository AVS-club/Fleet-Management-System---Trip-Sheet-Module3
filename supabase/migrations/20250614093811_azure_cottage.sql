/*
  # Add category column to maintenance_tasks table

  1. Changes
    - Add category column to maintenance_tasks table
    - Add constraint to ensure category uses valid values
*/

-- Check if the maintenance_tasks table exists before attempting to modify it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'maintenance_tasks'
  ) THEN
    -- Check if the category column already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'maintenance_tasks' AND column_name = 'category'
    ) THEN
      -- Add the category column
      ALTER TABLE maintenance_tasks ADD COLUMN category text;
      
      -- Add constraint to ensure category uses valid values
      ALTER TABLE maintenance_tasks ADD CONSTRAINT maintenance_tasks_category_check
        CHECK (category = ANY (ARRAY['General', 'Accidental', 'Repair/Replacement', 'Others']));
    END IF;
  END IF;
END $$;