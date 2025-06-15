-- Create the maintenance storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance', 'maintenance', true)
ON CONFLICT (id) DO NOTHING;

-- Check if policies exist before creating them
DO $$
BEGIN
  -- Check if upload policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to upload maintenance bills'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload maintenance bills"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');
  END IF;

  -- Check if read policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to read maintenance bills'
  ) THEN
    CREATE POLICY "Allow authenticated users to read maintenance bills"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');
  END IF;

  -- Check if update policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to update maintenance bills'
  ) THEN
    CREATE POLICY "Allow authenticated users to update maintenance bills"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');
  END IF;

  -- Check if delete policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to delete maintenance bills'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete maintenance bills"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'maintenance' AND (storage.foldername(name))[1] = 'maintenance-bills');
  END IF;
END
$$;