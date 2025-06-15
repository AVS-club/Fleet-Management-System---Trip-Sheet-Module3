/*
  # Create drivers storage bucket and policies

  1. Storage
    - Create 'drivers' bucket for driver photos
    - Set up RLS policies for authenticated users

  2. Security
    - Allow authenticated users to upload/read driver photos
    - Restrict access to driver_photos folder
*/

-- Create the drivers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('drivers', 'drivers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload driver photos
CREATE POLICY "Allow authenticated users to upload driver photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drivers' AND (storage.foldername(name))[1] = 'driver_photos');

-- Create policy to allow authenticated users to read driver photos
CREATE POLICY "Allow authenticated users to read driver photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'drivers' AND (storage.foldername(name))[1] = 'driver_photos');

-- Create policy to allow authenticated users to update driver photos
CREATE POLICY "Allow authenticated users to update driver photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'drivers' AND (storage.foldername(name))[1] = 'driver_photos');

-- Create policy to allow authenticated users to delete driver photos
CREATE POLICY "Allow authenticated users to delete driver photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'drivers' AND (storage.foldername(name))[1] = 'driver_photos');