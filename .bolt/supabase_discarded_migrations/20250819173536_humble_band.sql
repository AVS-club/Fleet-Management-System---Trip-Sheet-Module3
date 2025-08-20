/*
  # Rename added_by to created_by in maintenance_tasks table

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
    WHERE table_name = 'maintenance_tasks' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE public.maintenance_tasks RENAME COLUMN added_by TO created_by;
  END IF;
END $$;

-- Add created_by column if it doesn't exist (fallback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.maintenance_tasks ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'maintenance_tasks_created_by_fkey'
  ) THEN
    ALTER TABLE public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_maintenance_tasks_created_by'
  ) THEN
    CREATE INDEX idx_maintenance_tasks_created_by ON public.maintenance_tasks USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_maintenance_tasks'
  ) THEN
    CREATE TRIGGER trg_set_created_by_maintenance_tasks
    BEFORE INSERT ON public.maintenance_tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "maintenance_tasks_select_policy" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "maintenance_tasks_insert_policy" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "maintenance_tasks_update_policy" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "maintenance_tasks_delete_policy" ON public.maintenance_tasks;

-- RLS Policies
CREATE POLICY "maintenance_tasks_select_policy"
ON public.maintenance_tasks
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "maintenance_tasks_insert_policy"
ON public.maintenance_tasks
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "maintenance_tasks_update_policy"
ON public.maintenance_tasks
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "maintenance_tasks_delete_policy"
ON public.maintenance_tasks
FOR DELETE USING (auth.uid() = created_by);