/*
  # Add created_by to trips table

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
    WHERE table_name = 'trips' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'trips_created_by_fkey'
  ) THEN
    ALTER TABLE public.trips
    ADD CONSTRAINT trips_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_trips_created_by'
  ) THEN
    CREATE INDEX idx_trips_created_by ON public.trips USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_trips'
  ) THEN
    CREATE TRIGGER trg_set_created_by_trips
    BEFORE INSERT ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_update_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON public.trips;

-- RLS Policies
CREATE POLICY "trips_select_policy"
ON public.trips
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "trips_insert_policy"
ON public.trips
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_update_policy"
ON public.trips
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_delete_policy"
ON public.trips
FOR DELETE USING (auth.uid() = created_by);