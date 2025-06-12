/*
  # Add INSERT/UPDATE/DELETE policies for warehouses table

  1. Changes
    - Add policies to allow authenticated users to manage warehouses
    - Policies cover INSERT, UPDATE, and DELETE operations
    - Maintain existing SELECT policy
*/

-- Add INSERT policy for warehouses
CREATE POLICY "Enable insert for authenticated users" ON warehouses
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for warehouses  
CREATE POLICY "Enable update for authenticated users" ON warehouses
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy for warehouses
CREATE POLICY "Enable delete for authenticated users" ON warehouses
  FOR DELETE TO authenticated
  USING (true);