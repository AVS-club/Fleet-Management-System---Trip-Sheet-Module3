-- Fix maintenance-bills bucket public access
-- This migration ensures that the maintenance-bills bucket is publicly accessible

-- First, ensure the bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-bills',
  'maintenance-bills', 
  true, -- Make it PUBLIC so files can be accessed via public URLs
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = true, -- Ensure it's public even if it already exists
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if any (to recreate them properly)
DROP POLICY IF EXISTS "Authenticated users can upload maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Public can view maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can view maintenance bills" ON storage.objects;

-- Create storage policies for the maintenance-bills bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload maintenance bills"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-bills' AND
  auth.uid()::text IS NOT NULL
);

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update maintenance bills"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'maintenance-bills' AND
  auth.uid()::text IS NOT NULL
);

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete maintenance bills"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-bills' AND
  auth.uid()::text IS NOT NULL
);

-- IMPORTANT: Allow public read access since the bucket is public
-- This is crucial for the getPublicUrl to work
CREATE POLICY "Public can view maintenance bills"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'maintenance-bills');

-- Also ensure authenticated users can view (redundant but safe)
CREATE POLICY "Users can view maintenance bills"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-bills');
