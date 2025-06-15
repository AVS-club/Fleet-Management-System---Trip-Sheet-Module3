/*
  # Create Storage Buckets for Vehicle and Driver Profiles

  1. New Storage Buckets
    - `vehicle-profiles` - For storing shareable vehicle profile data
    - `driver-profiles` - For storing shareable driver profile data
    - `drivers` - For storing driver photos and documents
    - `vehicle-docs` - For storing vehicle documents

  2. Security
    - Set appropriate access permissions for each bucket
    - Configure file size limits and allowed MIME types
*/

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create buckets using the storage API
DO $$
DECLARE
  bucket_owner UUID := auth.uid();
BEGIN
  -- Create vehicle-profiles bucket
  EXECUTE format(
    'CREATE BUCKET IF NOT EXISTS "vehicle-profiles" WITH (public = true)'
  );
  
  -- Create driver-profiles bucket
  EXECUTE format(
    'CREATE BUCKET IF NOT EXISTS "driver-profiles" WITH (public = true)'
  );
  
  -- Create drivers bucket
  EXECUTE format(
    'CREATE BUCKET IF NOT EXISTS "drivers" WITH (public = false)'
  );
  
  -- Create vehicle-docs bucket
  EXECUTE format(
    'CREATE BUCKET IF NOT EXISTS "vehicle-docs" WITH (public = true)'
  );
END $$;

-- Set bucket configurations
DO $$
BEGIN
  -- Set file size limits
  PERFORM set_bucket_size_limit('vehicle-profiles', 5242880); -- 5MB
  PERFORM set_bucket_size_limit('driver-profiles', 5242880); -- 5MB
  PERFORM set_bucket_size_limit('drivers', 10485760); -- 10MB
  PERFORM set_bucket_size_limit('vehicle-docs', 10485760); -- 10MB
  
  -- Set allowed MIME types
  PERFORM set_bucket_allowed_mime_types('vehicle-profiles', ARRAY['application/json']);
  PERFORM set_bucket_allowed_mime_types('driver-profiles', ARRAY['application/json']);
  PERFORM set_bucket_allowed_mime_types('drivers', ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  PERFORM set_bucket_allowed_mime_types('vehicle-docs', ARRAY['image/jpeg', 'image/png', 'application/pdf']);
END $$;

-- Create helper functions for bucket configuration
CREATE OR REPLACE FUNCTION set_bucket_size_limit(bucket_name TEXT, size_limit BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE storage.buckets
  SET file_size_limit = size_limit
  WHERE name = bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_bucket_allowed_mime_types(bucket_name TEXT, mime_types TEXT[])
RETURNS VOID AS $$
BEGIN
  UPDATE storage.buckets
  SET allowed_mime_types = mime_types
  WHERE name = bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security policies for buckets
DO $$
BEGIN
  -- Vehicle profiles policies
  EXECUTE format(
    'CREATE POLICY "Allow public access to vehicle profiles" ON storage.objects FOR SELECT USING (bucket_id = ''vehicle-profiles'')'
  );
  
  EXECUTE format(
    'CREATE POLICY "Allow authenticated users to manage vehicle profiles" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''vehicle-profiles'') WITH CHECK (bucket_id = ''vehicle-profiles'')'
  );
  
  -- Driver profiles policies
  EXECUTE format(
    'CREATE POLICY "Allow public access to driver profiles" ON storage.objects FOR SELECT USING (bucket_id = ''driver-profiles'')'
  );
  
  EXECUTE format(
    'CREATE POLICY "Allow authenticated users to manage driver profiles" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''driver-profiles'') WITH CHECK (bucket_id = ''driver-profiles'')'
  );
  
  -- Drivers bucket policies (private)
  EXECUTE format(
    'CREATE POLICY "Allow authenticated users to manage driver files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''drivers'') WITH CHECK (bucket_id = ''drivers'')'
  );
  
  -- Vehicle docs policies
  EXECUTE format(
    'CREATE POLICY "Allow public access to vehicle docs" ON storage.objects FOR SELECT USING (bucket_id = ''vehicle-docs'')'
  );
  
  EXECUTE format(
    'CREATE POLICY "Allow authenticated users to manage vehicle docs" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''vehicle-docs'') WITH CHECK (bucket_id = ''vehicle-docs'')'
  );
END $$;