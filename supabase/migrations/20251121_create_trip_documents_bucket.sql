-- Create storage bucket for trip documents (GPS screenshots, fuel bills, etc.)
-- This migration ensures the bucket exists with proper permissions

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-documents', 'trip-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trip documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update trip documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete trip documents" ON storage.objects;

-- Create storage policies for trip-documents bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'trip-documents' );

CREATE POLICY "Authenticated users can upload trip documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trip-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update trip documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'trip-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete trip documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trip-documents'
  AND auth.role() = 'authenticated'
);
