/*
  # Add Maintenance Service Groups

  1. New Tables
    - `maintenance_service_tasks`
      - `id` (uuid, primary key)
      - `maintenance_task_id` (uuid, references maintenance_tasks)
      - `vendor_id` (text, not null)
      - `tasks` (text[], array of task identifiers)
      - `cost` (numeric(10,2), not null)
      - `bill_url` (text, for uploaded bill documents)
      - `parts_replaced` (boolean, default false)
      - `created_at`, `updated_at` (timestamps)

  2. Security
    - Enable RLS on `maintenance_service_tasks` table
    - Add policies for authenticated users to manage service tasks
    - Create index for better query performance
*/

-- Create maintenance_service_tasks table
CREATE TABLE maintenance_service_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_task_id uuid NOT NULL REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  vendor_id text NOT NULL,
  tasks text[] NOT NULL,
  cost numeric(10,2) NOT NULL,
  bill_url text,
  parts_replaced boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER set_timestamp_maintenance_service_tasks
BEFORE UPDATE ON maintenance_service_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE maintenance_service_tasks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable read access for authenticated users"
ON maintenance_service_tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON maintenance_service_tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON maintenance_service_tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON maintenance_service_tasks
FOR DELETE
TO authenticated
USING (true);

-- Add index for better query performance
CREATE INDEX idx_maintenance_service_tasks_task_id
ON maintenance_service_tasks(maintenance_task_id);