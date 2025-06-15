/*
  # Add update policy for drivers table

  1. Security
    - Add RLS policy to allow authenticated users to update driver records
    - This fixes the "JSON object requested, multiple (or no) rows returned" error
*/

-- Create policy to allow authenticated users to update drivers
CREATE POLICY "Allow authenticated users to update drivers"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);