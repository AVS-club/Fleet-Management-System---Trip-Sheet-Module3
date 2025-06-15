/*
  # Update maintenance_tasks table schema
  
  1. Changes
    - Add category field to maintenance_tasks table
    - Make garage_id optional (will be derived from vendor_id)
    - Add downtime_period field for tracking service duration
    - Add migration safety with DO blocks
*/

-- Add category field to maintenance_tasks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance_tasks ADD COLUMN category text;
  END IF;
END $$;

-- Add downtime_period field to maintenance_tasks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks' 
    AND column_name = 'downtime_period'
  ) THEN
    ALTER TABLE maintenance_tasks ADD COLUMN downtime_period text;
  END IF;
END $$;

-- Make garage_id optional if it's currently required
DO $$ 
BEGIN
  -- Check if garage_id is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks' 
    AND column_name = 'garage_id'
    AND is_nullable = 'NO'
  ) THEN
    -- Make it nullable
    ALTER TABLE maintenance_tasks ALTER COLUMN garage_id DROP NOT NULL;
  END IF;
END $$;

-- Create maintenance_service_tasks table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_service_tasks'
  ) THEN
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
    
    -- Create index for better query performance
    CREATE INDEX idx_maintenance_service_tasks_task_id ON maintenance_service_tasks(maintenance_task_id);
    
    -- Create trigger for updated_at
    CREATE TRIGGER set_timestamp_maintenance_service_tasks
    BEFORE UPDATE ON maintenance_service_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
    
    -- Enable RLS
    ALTER TABLE maintenance_service_tasks ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Enable read access for authenticated users" ON maintenance_service_tasks
      FOR SELECT TO authenticated USING (true);
      
    CREATE POLICY "Enable insert for authenticated users" ON maintenance_service_tasks
      FOR INSERT TO authenticated WITH CHECK (true);
      
    CREATE POLICY "Enable update for authenticated users" ON maintenance_service_tasks
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      
    CREATE POLICY "Enable delete for authenticated users" ON maintenance_service_tasks
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Create maintenance storage bucket if it doesn't exist
DO $$ 
BEGIN
  -- This is a bit tricky as we can't directly check for bucket existence in a DO block
  -- We'll use a more indirect approach
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND EXISTS (
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = 'maintenance' 
      LIMIT 1
    )
  ) THEN
    -- We'll handle this in a separate migration or manually
    -- as it requires storage admin privileges
    RAISE NOTICE 'Maintenance storage bucket may need to be created manually';
  END IF;
END $$;