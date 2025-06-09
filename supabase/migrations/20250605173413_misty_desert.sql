/*
  # Fix Warehouse RLS Policies

  1. Changes
    - Add RLS policies for warehouses table to allow CRUD operations
    - Ensure authenticated users can manage warehouses
*/

-- Enable RLS on warehouses table (if not already enabled)
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON warehouses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON warehouses;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON warehouses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON warehouses;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Enable full access for authenticated users"
ON warehouses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);