/*
  # Add added_by column to warehouses table

  1. Changes
    - Add `added_by` column to `warehouses` table
    - Migrate existing data from `created_by` to `added_by`
    - Update RLS policies to use `added_by`
    - Add performance index on `added_by` column

  2. Security
    - Update RLS policies to use `added_by` for user isolation
*/

-- Add the added_by column to warehouses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouses' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE warehouses ADD COLUMN added_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Migrate existing data from created_by to added_by
UPDATE warehouses 
SET added_by = created_by 
WHERE added_by IS NULL AND created_by IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_warehouses_added_by ON warehouses(added_by);

-- Update RLS policies to use added_by
DROP POLICY IF EXISTS "Users can manage their own warehouses" ON warehouses;
DROP POLICY IF EXISTS "warehouses all" ON warehouses;
DROP POLICY IF EXISTS "wh select own" ON warehouses;
DROP POLICY IF EXISTS "wh insert own" ON warehouses;
DROP POLICY IF EXISTS "wh update own" ON warehouses;
DROP POLICY IF EXISTS "wh delete own" ON warehouses;

-- Create new RLS policies using added_by
CREATE POLICY "warehouses_select_policy" ON warehouses
  FOR SELECT USING (added_by = auth.uid());

CREATE POLICY "warehouses_insert_policy" ON warehouses
  FOR INSERT WITH CHECK (added_by = auth.uid());

CREATE POLICY "warehouses_update_policy" ON warehouses
  FOR UPDATE USING (added_by = auth.uid()) WITH CHECK (added_by = auth.uid());

CREATE POLICY "warehouses_delete_policy" ON warehouses
  FOR DELETE USING (added_by = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;