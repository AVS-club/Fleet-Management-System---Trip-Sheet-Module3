-- Check if maintenance_service_tasks table exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_service_tasks'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE maintenance_service_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      maintenance_task_id uuid NOT NULL REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
      tasks text[] NOT NULL,
      cost numeric(10,2) NOT NULL,
      bill_url text,
      parts_replaced boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      vendor_id text NOT NULL
    );
  ELSE
    -- If the table exists, make sure it has the correct columns
    -- Check if tasks column exists and is text[]
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_service_tasks' 
      AND column_name = 'tasks'
    ) THEN
      ALTER TABLE maintenance_service_tasks ADD COLUMN tasks text[] NOT NULL DEFAULT '{}';
    END IF;

    -- Check if cost column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_service_tasks' 
      AND column_name = 'cost'
    ) THEN
      ALTER TABLE maintenance_service_tasks ADD COLUMN cost numeric(10,2) NOT NULL DEFAULT 0;
    END IF;

    -- Check if bill_url column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_service_tasks' 
      AND column_name = 'bill_url'
    ) THEN
      ALTER TABLE maintenance_service_tasks ADD COLUMN bill_url text;
    END IF;

    -- Check if vendor_id column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_service_tasks' 
      AND column_name = 'vendor_id'
    ) THEN
      ALTER TABLE maintenance_service_tasks ADD COLUMN vendor_id text NOT NULL DEFAULT '';
    END IF;
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to maintenance_service_tasks table
DROP TRIGGER IF EXISTS set_timestamp_maintenance_service_tasks ON maintenance_service_tasks;
CREATE TRIGGER set_timestamp_maintenance_service_tasks
BEFORE UPDATE ON maintenance_service_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_task_id ON maintenance_service_tasks(maintenance_task_id);

-- Enable RLS
ALTER TABLE maintenance_service_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_service_tasks' 
    AND policyname = 'Enable read access for authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users" ON maintenance_service_tasks
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_service_tasks' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON maintenance_service_tasks
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_service_tasks' 
    AND policyname = 'Enable update for authenticated users'
  ) THEN
    CREATE POLICY "Enable update for authenticated users" ON maintenance_service_tasks
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_service_tasks' 
    AND policyname = 'Enable delete for authenticated users'
  ) THEN
    CREATE POLICY "Enable delete for authenticated users" ON maintenance_service_tasks
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;