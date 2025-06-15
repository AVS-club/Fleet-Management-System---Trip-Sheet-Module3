/*
  # Create Storage Buckets for Vehicle and Driver Profiles
  
  1. New Storage Buckets
    - vehicle-profiles: For sharing vehicle information (public, JSON only)
    - driver-profiles: For sharing driver information (public, JSON only)
    - drivers: For driver photos and documents (private, images and PDFs)
    - vehicle-docs: For vehicle documents (public, images and PDFs)
    
  2. Security
    - Set appropriate file size limits and MIME type restrictions
    - Create RLS policies for access control
*/

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
DO $$
BEGIN
  EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;';
EXCEPTION
  WHEN insufficient_privilege THEN
    -- If we don't have permission to enable RLS directly, we'll skip this
    -- as it's likely already enabled by Supabase
    RAISE NOTICE 'Skipping RLS enablement - insufficient privileges or already enabled';
END $$;

-- Create policies for vehicle-profiles bucket
DO $$
BEGIN
  BEGIN
    CREATE POLICY "vehicle_profiles_insert_policy" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'vehicle-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_profiles_insert_policy already exists';
  END;

  BEGIN
    CREATE POLICY "vehicle_profiles_update_policy" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'vehicle-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_profiles_update_policy already exists';
  END;

  BEGIN
    CREATE POLICY "vehicle_profiles_delete_policy" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'vehicle-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_profiles_delete_policy already exists';
  END;

  BEGIN
    CREATE POLICY "vehicle_profiles_select_policy" 
    ON storage.objects FOR SELECT 
    TO public
    USING (bucket_id = 'vehicle-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_profiles_select_policy already exists';
  END;
END $$;

-- Create policies for driver-profiles bucket
DO $$
BEGIN
  BEGIN
    CREATE POLICY "driver_profiles_insert_policy" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'driver-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy driver_profiles_insert_policy already exists';
  END;

  BEGIN
    CREATE POLICY "driver_profiles_update_policy" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'driver-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy driver_profiles_update_policy already exists';
  END;

  BEGIN
    CREATE POLICY "driver_profiles_delete_policy" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'driver-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy driver_profiles_delete_policy already exists';
  END;

  BEGIN
    CREATE POLICY "driver_profiles_select_policy" 
    ON storage.objects FOR SELECT 
    TO public
    USING (bucket_id = 'driver-profiles');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy driver_profiles_select_policy already exists';
  END;
END $$;

-- Create policies for drivers bucket
DO $$
BEGIN
  BEGIN
    CREATE POLICY "drivers_insert_policy" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'drivers');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy drivers_insert_policy already exists';
  END;

  BEGIN
    CREATE POLICY "drivers_update_policy" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'drivers');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy drivers_update_policy already exists';
  END;

  BEGIN
    CREATE POLICY "drivers_delete_policy" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'drivers');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy drivers_delete_policy already exists';
  END;

  BEGIN
    CREATE POLICY "drivers_select_policy" 
    ON storage.objects FOR SELECT 
    TO authenticated
    USING (bucket_id = 'drivers');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy drivers_select_policy already exists';
  END;
END $$;

-- Create policies for vehicle-docs bucket
DO $$
BEGIN
  BEGIN
    CREATE POLICY "vehicle_docs_insert_policy" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'vehicle-docs');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_docs_insert_policy already exists';
  END;

  BEGIN
    CREATE POLICY "vehicle_docs_update_policy" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'vehicle-docs');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_docs_update_policy already exists';
  END;

  BEGIN
    CREATE POLICY "vehicle_docs_delete_policy" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'vehicle-docs');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_docs_delete_policy already exists';
  END;

  BEGIN
    CREATE POLICY "vehicle_docs_select_policy" 
    ON storage.objects FOR SELECT 
    TO public
    USING (bucket_id = 'vehicle-docs');
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Policy vehicle_docs_select_policy already exists';
  END;
END $$;