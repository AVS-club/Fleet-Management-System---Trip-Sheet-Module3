/*
  # Add created_by to destinations table

  1. Schema Changes
    - Add `created_by` uuid column
    - Add foreign key constraint to auth.users
    - Add index for performance

  2. Triggers
    - Apply set_created_by trigger

  3. Security
    - Enable RLS
    - Add policies for CRUD operations based on created_by
*/

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.destinations ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'destinations_created_by_fkey'
  ) THEN
    ALTER TABLE public.destinations
    ADD CONSTRAINT destinations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_destinations_created_by'
  ) THEN
    CREATE INDEX idx_destinations_created_by ON public.destinations USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_destinations'
  ) THEN
    CREATE TRIGGER trg_set_created_by_destinations
    BEFORE INSERT ON public.destinations
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_delete_policy" ON public.destinations;

-- RLS Policies
CREATE POLICY "destinations_select_policy"
ON public.destinations
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "destinations_insert_policy"
ON public.destinations
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "destinations_update_policy"
ON public.destinations
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "destinations_delete_policy"
ON public.destinations
FOR DELETE USING (auth.uid() = created_by);