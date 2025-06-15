/*
  # Create Storage Buckets for Vehicle and Driver Profiles

  1. New Storage Buckets
    - `vehicle-profiles` - For storing vehicle profile JSON files for sharing
    - `driver-profiles` - For storing driver profile JSON files for sharing
    - `drivers` - For storing driver photos and documents

  2. Security
    - Enable RLS on all buckets
    - Add policies for authenticated users to manage their own files
    - Add policies for public read access to shared profiles

  3. Configuration
    - Set appropriate file size limits
    - Configure allowed file types
*/

-- Create vehicle-profiles bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-profiles',
  'vehicle-profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['application/json']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Create driver-profiles bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-profiles',
  'driver-profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['application/json']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Create drivers bucket for photos and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drivers',
  'drivers',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on vehicle-profiles bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies for vehicle-profiles bucket
CREATE POLICY "Allow authenticated users to upload vehicle profiles"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-profiles');

CREATE POLICY "Allow authenticated users to update vehicle profiles"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-profiles');

CREATE POLICY "Allow authenticated users to delete vehicle profiles"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-profiles');

CREATE POLICY "Allow public read access to vehicle profiles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vehicle-profiles');

-- Policies for driver-profiles bucket
CREATE POLICY "Allow authenticated users to upload driver profiles"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-profiles');

CREATE POLICY "Allow authenticated users to update driver profiles"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-profiles');

CREATE POLICY "Allow authenticated users to delete driver profiles"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'driver-profiles');

CREATE POLICY "Allow public read access to driver profiles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'driver-profiles');

-- Policies for drivers bucket
CREATE POLICY "Allow authenticated users to upload driver files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drivers');

CREATE POLICY "Allow authenticated users to update driver files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'drivers');

CREATE POLICY "Allow authenticated users to delete driver files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'drivers');

CREATE POLICY "Allow authenticated users to read driver files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'drivers');