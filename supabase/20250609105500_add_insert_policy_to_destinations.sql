CREATE POLICY "Enable insert for authenticated users"
ON public.destinations
FOR INSERT
TO authenticated
WITH CHECK (true);
