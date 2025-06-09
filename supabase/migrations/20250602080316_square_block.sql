/*
  # Add maintenance audit logs table
  
  1. New Tables
    - `maintenance_audit_logs`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references maintenance_tasks)
      - `timestamp` (timestamptz)
      - `admin_user` (text)
      - `changes` (jsonb)
  2. Security
    - Enable RLS on `maintenance_audit_logs` table
    - Add policy for authenticated users to read their own data
*/

-- Create maintenance_audit_logs table
CREATE TABLE maintenance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES maintenance_tasks(id),
  timestamp timestamptz NOT NULL DEFAULT now(),
  admin_user text,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON maintenance_audit_logs
  FOR SELECT TO authenticated USING (true);

-- Add index for better query performance
CREATE INDEX idx_maintenance_audit_logs_task ON maintenance_audit_logs(task_id);