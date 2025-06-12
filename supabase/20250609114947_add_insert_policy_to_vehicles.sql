-- Allow authenticated users to insert new vehicles
CREATE POLICY "Allow authenticated users to insert vehicles"
ON public.vehicles
FOR INSERT
TO authenticated
WITH CHECK (true);
