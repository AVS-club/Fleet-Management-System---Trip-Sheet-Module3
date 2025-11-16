-- Create table for public photo uploads via shareable links
-- This allows drivers/managers to upload photos without logging in

CREATE TABLE IF NOT EXISTS maintenance_task_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_task_id uuid REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text, -- Optional: can ask for uploader name
  notes text, -- Optional: add description
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups by task
CREATE INDEX IF NOT EXISTS idx_maintenance_task_uploads_task_id
ON maintenance_task_uploads(maintenance_task_id);

-- Create index for sorting by upload time
CREATE INDEX IF NOT EXISTS idx_maintenance_task_uploads_uploaded_at
ON maintenance_task_uploads(uploaded_at DESC);

-- Enable RLS for security
ALTER TABLE maintenance_task_uploads ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public insert (anyone with link can upload)
-- This enables the shareable link functionality
CREATE POLICY "Anyone can upload photos via link"
ON maintenance_task_uploads
FOR INSERT
WITH CHECK (true);

-- Policy 2: Only organization members can view uploads
-- This keeps uploaded photos private to the organization
CREATE POLICY "Org members can view uploads"
ON maintenance_task_uploads
FOR SELECT
USING (
  maintenance_task_id IN (
    SELECT id FROM maintenance_tasks
    WHERE organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy 3: Only organization members can delete uploads
CREATE POLICY "Org members can delete uploads"
ON maintenance_task_uploads
FOR DELETE
USING (
  maintenance_task_id IN (
    SELECT id FROM maintenance_tasks
    WHERE organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  )
);

-- Add comment for documentation
COMMENT ON TABLE maintenance_task_uploads IS 'Stores photos uploaded via public shareable links for maintenance tasks. Used for field workers to upload photos without logging in.';
