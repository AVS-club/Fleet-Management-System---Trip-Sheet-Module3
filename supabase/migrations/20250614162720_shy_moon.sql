/*
  # Fix Maintenance Audit Logs INSERT Policy

  This migration adds an INSERT policy for the maintenance_audit_logs table,
  but only if the policy doesn't already exist to avoid duplicate policy errors.
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