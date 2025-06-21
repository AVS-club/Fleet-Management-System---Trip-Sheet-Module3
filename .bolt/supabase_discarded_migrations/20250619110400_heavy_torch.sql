/*
  # Seed Maintenance Tasks Catalog
  
  1. Purpose
    - Populate the maintenance_tasks_catalog table with predefined categories and tasks
    - Create a master list of Indian fleet vehicle maintenance tasks
    - Group tasks by category for better organization and selection
  
  2. Categories
    - Engine & Oil
    - Brakes
    - Transmission & Clutch
    - Suspension & Steering
    - Electrical
    - Tyres & Wheels
    - Body & Exterior
    - Interior & Cabin
*/

-- Ensure the maintenance_tasks_catalog table exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'maintenance_tasks_catalog'
  ) THEN
    CREATE TABLE maintenance_tasks_catalog (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_category text NOT NULL,
      task_name text NOT NULL UNIQUE,
      is_category boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Create trigger for updated_at
    CREATE OR REPLACE FUNCTION update_maintenance_tasks_catalog_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_maintenance_tasks_catalog_updated_at
    BEFORE UPDATE ON maintenance_tasks_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_tasks_catalog_updated_at();

    -- Enable RLS
    ALTER TABLE maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Enable read access for authenticated users" ON maintenance_tasks_catalog
      FOR SELECT TO authenticated USING (true);

    CREATE POLICY "Enable insert for authenticated users" ON maintenance_tasks_catalog
      FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY "Enable update for authenticated users" ON maintenance_tasks_catalog
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add the category headers
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Engine & Oil', 'Engine & Oil', true),
  ('Brakes', 'Brakes', true),
  ('Transmission & Clutch', 'Transmission & Clutch', true),
  ('Suspension & Steering', 'Suspension & Steering', true),
  ('Electrical', 'Electrical', true),
  ('Tyres & Wheels', 'Tyres & Wheels', true),
  ('Body & Exterior', 'Body & Exterior', true),
  ('Interior & Cabin', 'Interior & Cabin', true)
ON CONFLICT (task_name) DO NOTHING;

-- Add the tasks for each category
-- Engine & Oil tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Engine & Oil', 'Engine Oil Change', false),
  ('Engine & Oil', 'Oil Filter Replacement', false),
  ('Engine & Oil', 'Coolant Flush', false),
  ('Engine & Oil', 'Fuel Injector Cleaning', false)
ON CONFLICT (task_name) DO NOTHING;

-- Brakes tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Brakes', 'Brake Pad Replacement', false),
  ('Brakes', 'Brake Disc Skimming', false),
  ('Brakes', 'Brake Fluid Top-Up', false)
ON CONFLICT (task_name) DO NOTHING;

-- Transmission & Clutch tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Transmission & Clutch', 'Clutch Plate Replacement', false),
  ('Transmission & Clutch', 'Transmission Fluid Change', false),
  ('Transmission & Clutch', 'Gearbox Overhaul', false)
ON CONFLICT (task_name) DO NOTHING;

-- Suspension & Steering tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Suspension & Steering', 'Shock Absorber Replacement', false),
  ('Suspension & Steering', 'Steering Alignment', false),
  ('Suspension & Steering', 'Lower Arm Bushing', false)
ON CONFLICT (task_name) DO NOTHING;

-- Electrical tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Electrical', 'Battery Replacement', false),
  ('Electrical', 'Alternator Repair', false),
  ('Electrical', 'Starter Motor Issue', false)
ON CONFLICT (task_name) DO NOTHING;

-- Tyres & Wheels tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Tyres & Wheels', 'Front Tyre Change', false),
  ('Tyres & Wheels', 'Rear Tyre Rotation', false),
  ('Tyres & Wheels', 'Stepney Check', false)
ON CONFLICT (task_name) DO NOTHING;

-- Body & Exterior tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Body & Exterior', 'Denting & Painting', false),
  ('Body & Exterior', 'Door Latch Fix', false),
  ('Body & Exterior', 'Windshield Crack', false)
ON CONFLICT (task_name) DO NOTHING;

-- Interior & Cabin tasks
INSERT INTO maintenance_tasks_catalog (task_category, task_name, is_category)
VALUES 
  ('Interior & Cabin', 'AC Gas Refill', false),
  ('Interior & Cabin', 'Dashboard Light Fault', false),
  ('Interior & Cabin', 'Seat Belt Repair', false)
ON CONFLICT (task_name) DO NOTHING;