/*
  # Add fuel bill and station fields to trips

  1. New Columns
    - `fuel_bill_url` (text) - URL of uploaded fuel bill or trip slip
    - `station` (text, nullable) - name of fuel station
    - `fuel_station_id` (uuid, nullable) - reference to fuel station
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'fuel_bill_url'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN fuel_bill_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'station'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN station text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'fuel_station_id'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN fuel_station_id uuid;
  END IF;
END $$;
