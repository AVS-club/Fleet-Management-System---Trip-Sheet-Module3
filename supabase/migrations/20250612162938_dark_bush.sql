/*
  # Add other_documents column to vehicles table

  1. Changes
    - Add `other_documents` column to `vehicles` table
    - Column type: jsonb with default empty array
    - This will store additional vehicle documents as JSON

  2. Security
    - No RLS changes needed as vehicles table already has proper policies
*/

-- Add other_documents column to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'other_documents'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN other_documents jsonb DEFAULT '[]';
  END IF;
END $$;