-- Allow authenticated users to insert new drivers
CREATE POLICY "Allow authenticated users to insert drivers"
ON public.drivers
FOR INSERT
TO authenticated
WITH CHECK (true);
