/*
  # Add INSERT policy for material_types table

  1. Security Changes
    - Add INSERT policy for authenticated users on material_types table
    - Allow authenticated users to create new material types

  This fixes the RLS policy violation when trying to add new material types.
*/

CREATE POLICY "Enable insert for authenticated users" ON material_types
  FOR INSERT TO authenticated
  WITH CHECK (true);