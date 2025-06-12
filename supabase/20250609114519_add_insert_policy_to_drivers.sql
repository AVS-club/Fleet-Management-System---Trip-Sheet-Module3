CREATE POLICY "Enable insert for authenticated users" ON drivers
  FOR INSERT TO authenticated
  WITH CHECK (true);
