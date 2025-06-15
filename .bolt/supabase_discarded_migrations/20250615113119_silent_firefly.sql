-- Create the maintenance storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance', 'maintenance', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload maintenance bills
CREATE POLICY "Allow authenticated users to upload maintenance bills"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');

-- Create policy to allow authenticated users to read maintenance bills
CREATE POLICY "Allow authenticated users to read maintenance bills"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');

-- Create policy to allow authenticated users to update maintenance bills
CREATE POLICY "Allow authenticated users to update maintenance bills"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');

-- Create policy to allow authenticated users to delete maintenance bills
CREATE POLICY "Allow authenticated users to delete maintenance bills"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');