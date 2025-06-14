/*
  # Add miscellaneous_expense column to trips table

  1. Changes
    - Add `miscellaneous_expense` column to `trips` table
    - Set default value to 0 to match other expense columns
    - Use decimal(10,2) type for consistency with other expense fields

  2. Security
    - No RLS changes needed as this is just adding a column
*/

-- Add miscellaneous_expense column to trips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'miscellaneous_expense'
  ) THEN
    ALTER TABLE trips ADD COLUMN miscellaneous_expense decimal(10,2) DEFAULT 0;
  END IF;
END $$;