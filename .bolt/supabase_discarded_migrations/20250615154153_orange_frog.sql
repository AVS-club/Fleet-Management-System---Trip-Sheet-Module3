/*
  # Create Storage Buckets and Policies

  1. New Buckets
    - `vehicle-profiles` - For storing shareable vehicle profile JSON files
    - `driver-profiles` - For storing shareable driver profile JSON files
    - `drivers` - For storing driver photos and documents
    - `vehicle-docs` - For storing vehicle documents

  2. Security
    - Set appropriate public/private access
    - Configure file size limits and allowed MIME types
    - Create RLS policies for each bucket
*/

-- Create vehicle-profiles bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-profiles',
  'vehicle-profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['application/json']::text[]
) ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create driver-profiles bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-profiles',
  'driver-profiles',
  true,
  5242880, -- 5MB limit
  ARRAY['application/json']::text[]
) ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create drivers bucket for photos and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drivers',
  'drivers',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
) ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create vehicle-docs bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-docs',
  'vehicle-docs',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
) ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle-profiles bucket
CREATE POLICY "vehicle_profiles_insert_policy" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'vehicle-profiles');

CREATE POLICY "vehicle_profiles_update_policy" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'vehicle-profiles');

CREATE POLICY "vehicle_profiles_delete_policy" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'vehicle-profiles');

CREATE POLICY "vehicle_profiles_select_policy" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'vehicle-profiles');

-- Create policies for driver-profiles bucket
CREATE POLICY "driver_profiles_insert_policy" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'driver-profiles');

CREATE POLICY "driver_profiles_update_policy" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'driver-profiles');

CREATE POLICY "driver_profiles_delete_policy" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'driver-profiles');

CREATE POLICY "driver_profiles_select_policy" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'driver-profiles');

-- Create policies for drivers bucket
CREATE POLICY "drivers_insert_policy" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'drivers');

CREATE POLICY "drivers_update_policy" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'drivers');

CREATE POLICY "drivers_delete_policy" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'drivers');

CREATE POLICY "drivers_select_policy" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'drivers');

-- Create policies for vehicle-docs bucket
CREATE POLICY "vehicle_docs_insert_policy" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'vehicle-docs');

CREATE POLICY "vehicle_docs_update_policy" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'vehicle-docs');

CREATE POLICY "vehicle_docs_delete_policy" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'drivers');

CREATE POLICY "vehicle_docs_select_policy" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'vehicle-docs');