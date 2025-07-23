/*
  # Add Trip Expense Fields

  1. New Columns
    - `breakdown_expense` (numeric) - Breakdown expense for the trip
    - `miscellaneous_expense` (numeric) - Miscellaneous expense for the trip
  
  2. Changes
    - Add breakdown_expense column to trips table with default 0
    - Add miscellaneous_expense column to trips table with default 0
*/

-- Add breakdown_expense column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'breakdown_expense'
  ) THEN
    ALTER TABLE trips ADD COLUMN breakdown_expense numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add miscellaneous_expense column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'miscellaneous_expense'
  ) THEN
    ALTER TABLE trips ADD COLUMN miscellaneous_expense numeric(10,2) DEFAULT 0;
  END IF;
END $$;