/*
  # Rename added_by to created_by in drivers table

  1. Schema Changes
    - Rename `added_by` column to `created_by`
    - Ensure foreign key constraint exists
    - Add index for performance

  2. Triggers
    - Apply set_created_by trigger

  3. Security
    - Enable RLS
    - Add policies for CRUD operations based on created_by
*/

-- Rename added_by to created_by if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE public.drivers RENAME COLUMN added_by TO created_by;
  END IF;
END $$;

-- Add created_by column if it doesn't exist (fallback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'drivers_created_by_fkey'
  ) THEN
    ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_drivers_created_by'
  ) THEN
    CREATE INDEX idx_drivers_created_by ON public.drivers USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_drivers'
  ) THEN
    CREATE TRIGGER trg_set_created_by_drivers
    BEFORE INSERT ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "drivers_select_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_delete_policy" ON public.drivers;

-- RLS Policies
CREATE POLICY "drivers_select_policy"
ON public.drivers
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "drivers_insert_policy"
ON public.drivers
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "drivers_update_policy"
ON public.drivers
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "drivers_delete_policy"
ON public.drivers
FOR DELETE USING (auth.uid() = created_by);