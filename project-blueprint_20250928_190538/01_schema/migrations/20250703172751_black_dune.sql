/*
  # Add advance_amount field to trips table

  1. Changes
    - Adds advance_amount column to trips table with default value of 0
*/

-- Add advance_amount column to trips table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'advance_amount') THEN
    ALTER TABLE public.trips ADD COLUMN advance_amount numeric DEFAULT 0;
  END IF;
END $$;