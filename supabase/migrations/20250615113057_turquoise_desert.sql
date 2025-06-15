-- Create maintenance_tasks_catalog table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_tasks_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_category text NOT NULL,
  task_name text NOT NULL UNIQUE,
  is_category boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_tasks_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER set_maintenance_tasks_catalog_updated_at
BEFORE UPDATE ON maintenance_tasks_catalog
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_tasks_catalog_updated_at();

-- Enable RLS
ALTER TABLE maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" 
ON maintenance_tasks_catalog
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON maintenance_tasks_catalog
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON maintenance_tasks_catalog
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Create RPC function to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION create_maintenance_tasks_catalog_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'maintenance_tasks_catalog') THEN
    CREATE TABLE maintenance_tasks_catalog (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_category text NOT NULL,
      task_name text NOT NULL UNIQUE,
      is_category boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Enable read access for authenticated users" 
    ON maintenance_tasks_catalog
    FOR SELECT TO authenticated USING (true);
    
    CREATE POLICY "Enable insert for authenticated users" 
    ON maintenance_tasks_catalog
    FOR INSERT TO authenticated WITH CHECK (true);
    
    CREATE POLICY "Enable update for authenticated users" 
    ON maintenance_tasks_catalog
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to execute SQL directly
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;