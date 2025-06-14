/*
  # Add INSERT policy for maintenance_audit_logs if not exists
  
  1. Changes
    - Conditionally add INSERT policy for maintenance_audit_logs table
    - Prevents error when policy already exists
    - Uses DO block to check policy existence before creation
*/

-- Conditionally create policy only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_audit_logs' 
    AND policyname = 'Allow authenticated users to insert maintenance audit logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert maintenance audit logs"
    ON maintenance_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;