/*
  # Update warehouse RLS policies

  1. Security
    - Enable RLS on warehouses table
    - Add policy for authenticated users to perform all operations
*/

-- Enable RLS on warehouses table
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "warehouses all" ON public.warehouses;

-- Create comprehensive policy for authenticated users
CREATE POLICY "warehouses all" 
  ON public.warehouses 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);