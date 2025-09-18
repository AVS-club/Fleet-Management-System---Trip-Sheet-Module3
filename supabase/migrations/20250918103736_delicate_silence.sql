/*
  # Add missing added_by column to destinations table

  1. Schema Changes
    - Add `added_by` column to `destinations` table
    - Copy data from existing `created_by` column to maintain data integrity
    - Update RLS policies to use `added_by` column

  2. Data Migration  
    - Migrate existing `created_by` values to new `added_by` column
    - Preserve existing data relationships

  3. Security
    - Update RLS policies to work with `added_by` column
*/

-- Add the missing added_by column to destinations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE public.destinations ADD COLUMN added_by UUID REFERENCES auth.users(id);
    
    -- Migrate existing data from created_by to added_by
    UPDATE public.destinations SET added_by = created_by WHERE created_by IS NOT NULL;
  END IF;
END $$;

-- Update RLS policies to use added_by column
DROP POLICY IF EXISTS "destinations_delete_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON public.destinations;

-- Create new RLS policies using added_by
CREATE POLICY "destinations_select_policy" ON public.destinations
  FOR SELECT USING (added_by = auth.uid());

CREATE POLICY "destinations_insert_policy" ON public.destinations
  FOR INSERT WITH CHECK (added_by = auth.uid());

CREATE POLICY "destinations_update_policy" ON public.destinations
  FOR UPDATE USING (added_by = auth.uid()) WITH CHECK (added_by = auth.uid());

CREATE POLICY "destinations_delete_policy" ON public.destinations
  FOR DELETE USING (added_by = auth.uid());

-- Create index on added_by for better performance
CREATE INDEX IF NOT EXISTS idx_destinations_added_by ON public.destinations(added_by);