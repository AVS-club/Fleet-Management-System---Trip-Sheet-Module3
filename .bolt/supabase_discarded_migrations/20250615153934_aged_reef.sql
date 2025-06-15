-- Create vehicle-profiles bucket
SELECT storage.create_bucket('vehicle-profiles', 'Vehicle profiles for sharing');

-- Create driver-profiles bucket
SELECT storage.create_bucket('driver-profiles', 'Driver profiles for sharing');

-- Create drivers bucket for photos and documents
SELECT storage.create_bucket('drivers', 'Driver photos and documents');

-- Update bucket configurations
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-profiles';
UPDATE storage.buckets SET public = true WHERE id = 'driver-profiles';
UPDATE storage.buckets SET public = false WHERE id = 'drivers';

-- Set file size limits
UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = 'vehicle-profiles'; -- 5MB
UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = 'driver-profiles'; -- 5MB
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'drivers'; -- 10MB

-- Set allowed MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/json']::text[]
WHERE id = 'vehicle-profiles';

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/json']::text[]
WHERE id = 'driver-profiles';

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
WHERE id = 'drivers';

-- Create policies for vehicle-profiles bucket
BEGIN;
  -- Policy for authenticated users to upload vehicle profiles
  SELECT storage.create_policy(
    'vehicle-profiles',
    'authenticated users can upload vehicle profiles',
    'INSERT',
    'authenticated',
    true
  );

  -- Policy for authenticated users to update vehicle profiles
  SELECT storage.create_policy(
    'vehicle-profiles',
    'authenticated users can update vehicle profiles',
    'UPDATE',
    'authenticated',
    true
  );

  -- Policy for authenticated users to delete vehicle profiles
  SELECT storage.create_policy(
    'vehicle-profiles',
    'authenticated users can delete vehicle profiles',
    'DELETE',
    'authenticated',
    true
  );

  -- Policy for public read access to vehicle profiles
  SELECT storage.create_policy(
    'vehicle-profiles',
    'public can read vehicle profiles',
    'SELECT',
    'public',
    true
  );
COMMIT;

-- Create policies for driver-profiles bucket
BEGIN;
  -- Policy for authenticated users to upload driver profiles
  SELECT storage.create_policy(
    'driver-profiles',
    'authenticated users can upload driver profiles',
    'INSERT',
    'authenticated',
    true
  );

  -- Policy for authenticated users to update driver profiles
  SELECT storage.create_policy(
    'driver-profiles',
    'authenticated users can update driver profiles',
    'UPDATE',
    'authenticated',
    true
  );

  -- Policy for authenticated users to delete driver profiles
  SELECT storage.create_policy(
    'driver-profiles',
    'authenticated users can delete driver profiles',
    'DELETE',
    'authenticated',
    true
  );

  -- Policy for public read access to driver profiles
  SELECT storage.create_policy(
    'driver-profiles',
    'public can read driver profiles',
    'SELECT',
    'public',
    true
  );
COMMIT;

-- Create policies for drivers bucket
BEGIN;
  -- Policy for authenticated users to upload driver files
  SELECT storage.create_policy(
    'drivers',
    'authenticated users can upload driver files',
    'INSERT',
    'authenticated',
    true
  );

  -- Policy for authenticated users to update driver files
  SELECT storage.create_policy(
    'drivers',
    'authenticated users can update driver files',
    'UPDATE',
    'authenticated',
    true
  );

  -- Policy for authenticated users to delete driver files
  SELECT storage.create_policy(
    'drivers',
    'authenticated users can delete driver files',
    'DELETE',
    'authenticated',
    true
  );

  -- Policy for authenticated users to read driver files
  SELECT storage.create_policy(
    'drivers',
    'authenticated users can read driver files',
    'SELECT',
    'authenticated',
    true
  );
COMMIT;