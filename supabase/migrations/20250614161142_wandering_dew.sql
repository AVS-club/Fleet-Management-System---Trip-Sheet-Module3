/*
  # Add INSERT policy for maintenance_audit_logs

  1. Changes
    - Add policy to allow authenticated users to insert rows into the maintenance_audit_logs table
    - This fixes the RLS policy violation error when creating audit logs
*/

-- Create INSERT policy for maintenance_audit_logs
CREATE POLICY "Allow authenticated users to insert maintenance audit logs"
ON maintenance_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);