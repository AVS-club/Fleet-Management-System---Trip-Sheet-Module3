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

-- Create policies for vehicle-profiles bucket
DO $$
BEGIN
  -- Policy for authenticated users to upload vehicle profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can upload vehicle profiles',
    'vehicle-profiles',
    'INSERT',
    'authenticated',
    '(bucket_id = ''vehicle-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to update vehicle profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can update vehicle profiles',
    'vehicle-profiles',
    'UPDATE',
    'authenticated',
    '(bucket_id = ''vehicle-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to delete vehicle profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can delete vehicle profiles',
    'vehicle-profiles',
    'DELETE',
    'authenticated',
    '(bucket_id = ''vehicle-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for public read access to vehicle profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'public can read vehicle profiles',
    'vehicle-profiles',
    'SELECT',
    'public',
    '(bucket_id = ''vehicle-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;
END $$;

-- Create policies for driver-profiles bucket
DO $$
BEGIN
  -- Policy for authenticated users to upload driver profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can upload driver profiles',
    'driver-profiles',
    'INSERT',
    'authenticated',
    '(bucket_id = ''driver-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to update driver profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can update driver profiles',
    'driver-profiles',
    'UPDATE',
    'authenticated',
    '(bucket_id = ''driver-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to delete driver profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can delete driver profiles',
    'driver-profiles',
    'DELETE',
    'authenticated',
    '(bucket_id = ''driver-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for public read access to driver profiles
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'public can read driver profiles',
    'driver-profiles',
    'SELECT',
    'public',
    '(bucket_id = ''driver-profiles''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;
END $$;

-- Create policies for drivers bucket
DO $$
BEGIN
  -- Policy for authenticated users to upload driver files
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can upload driver files',
    'drivers',
    'INSERT',
    'authenticated',
    '(bucket_id = ''drivers''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to update driver files
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can update driver files',
    'drivers',
    'UPDATE',
    'authenticated',
    '(bucket_id = ''drivers''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to delete driver files
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can delete driver files',
    'drivers',
    'DELETE',
    'authenticated',
    '(bucket_id = ''drivers''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to read driver files
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can read driver files',
    'drivers',
    'SELECT',
    'authenticated',
    '(bucket_id = ''drivers''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;
END $$;

-- Create policies for vehicle-docs bucket
DO $$
BEGIN
  -- Policy for authenticated users to upload vehicle documents
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can upload vehicle documents',
    'vehicle-docs',
    'INSERT',
    'authenticated',
    '(bucket_id = ''vehicle-docs''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to update vehicle documents
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can update vehicle documents',
    'vehicle-docs',
    'UPDATE',
    'authenticated',
    '(bucket_id = ''vehicle-docs''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for authenticated users to delete vehicle documents
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'authenticated users can delete vehicle documents',
    'vehicle-docs',
    'DELETE',
    'authenticated',
    '(bucket_id = ''vehicle-docs''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;

  -- Policy for public read access to vehicle documents
  INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
  VALUES (
    'public can read vehicle documents',
    'vehicle-docs',
    'SELECT',
    'public',
    '(bucket_id = ''vehicle-docs''::text)'
  ) ON CONFLICT (name, bucket_id, operation, role) DO NOTHING;
END $$;