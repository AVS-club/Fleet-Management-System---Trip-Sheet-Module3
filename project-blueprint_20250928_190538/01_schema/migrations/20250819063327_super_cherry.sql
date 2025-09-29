/*
  # Add is_active column and created_by safety trigger for warehouses

  1. New Columns
    - `is_active` (boolean, default true) - For soft delete functionality
    - Safety trigger for `created_by` to auto-fill from auth.uid() if missing

  2. Indexes
    - Index on `is_active` for filtering queries
    - Index on `created_by` for performance

  3. Functions & Triggers
    - `set_created_by()` function to default created_by from auth.uid()
    - Trigger to automatically set created_by on insert
*/

-- Add is_active if missing
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill any nulls (paranoia)
UPDATE public.warehouses SET is_active = true WHERE is_active IS NULL;

-- Default created_by from auth.uid() if client forgets it
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_created_by ON public.warehouses;
CREATE TRIGGER trg_set_created_by
BEFORE INSERT ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_by ON public.warehouses(created_by);