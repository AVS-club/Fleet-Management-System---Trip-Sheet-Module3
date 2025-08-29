/*
  # Add place_name column to destinations table

  1. Changes
     - Add `place_name` column to `destinations` table
     - Column type: text (nullable)
     - This column will store the full place name from Google Places API

  2. Notes
     - The `place_name` column is used to store the complete place name from Google Places
     - This is separate from the `name` field which may be shortened for display
     - Column is nullable to maintain compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'place_name'
  ) THEN
    ALTER TABLE destinations ADD COLUMN place_name text;
  END IF;
END $$;