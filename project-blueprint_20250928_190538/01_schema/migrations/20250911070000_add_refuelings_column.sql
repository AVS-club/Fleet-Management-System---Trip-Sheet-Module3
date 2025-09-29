/*
  # Add refuelings column to trips table

  1. Changes
     - Add `refuelings` JSONB column to `trips` table
     - Column stores array of refueling records with location, quantity, rate, and cost
     - Default to empty array for backward compatibility

  2. Notes
     - This supports the Multiple Refuelings Feature implemented in the frontend
     - JSONB allows efficient storage and querying of refueling data
     - Nullable column maintains compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'refuelings'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN refuelings jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';