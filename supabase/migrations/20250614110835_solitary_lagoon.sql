/*
  # Update Maintenance Schema for Service Groups

  1. New Tables
    - `maintenance_service_tasks`: To store service group details for each maintenance task
      - `id` (uuid, primary key)
      - `maintenance_task_id` (uuid, references maintenance_tasks on cascade delete)
      - `vendor_id` (text, not null)
      - `tasks` (text array, not null)
      - `cost` (numeric, not null)
      - `bill_url` (text)
      - `parts_replaced` (boolean, default false)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)
      
  2. Changes to `maintenance_tasks` table
    - Add `downtime_period` (text) column
    - Remove redundant columns:
      - `vendor_id`
      - `garage_id`
      - `bill_group1`
      - `bill_group2`
      - `downtime_days`
    
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Step 1: Add downtime_period column to maintenance_tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks' AND column_name = 'downtime_period'
  ) THEN
    ALTER TABLE maintenance_tasks ADD COLUMN downtime_period text;
  END IF;
END $$;

-- Step 2: Create maintenance_service_tasks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'maintenance_service_tasks'
  ) THEN
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

    -- Add trigger for updated_at
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
  END IF;
END $$;

-- Step 3: Add category field to maintenance_tasks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks' AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance_tasks ADD COLUMN category text;
    
    -- Add constraint to category field
    ALTER TABLE maintenance_tasks 
    ADD CONSTRAINT maintenance_tasks_category_check 
    CHECK (category = ANY (ARRAY['General', 'Accidental', 'Repair/Replacement', 'Others']));
  END IF;
END $$;