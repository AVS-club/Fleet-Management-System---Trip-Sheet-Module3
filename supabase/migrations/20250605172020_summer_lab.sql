/*
  # Add missing warehouse RLS policies

  1. Changes
    - Add INSERT policy for authenticated users if not exists
    - Add UPDATE policy for authenticated users if not exists
    - Add DELETE policy for authenticated users if not exists

  2. Security
    - Policies allow all authenticated users to manage warehouses
    - Uses DO blocks to check policy existence before creation
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'warehouses' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON warehouses
    FOR INSERT TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'warehouses' 
    AND policyname = 'Enable update for authenticated users'
  ) THEN
    CREATE POLICY "Enable update for authenticated users" ON warehouses
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'warehouses' 
    AND policyname = 'Enable delete for authenticated users'
  ) THEN
    CREATE POLICY "Enable delete for authenticated users" ON warehouses
    FOR DELETE TO authenticated
    USING (true);
  END IF;
END $$;