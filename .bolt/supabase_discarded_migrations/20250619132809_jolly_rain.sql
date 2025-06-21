/*
  # Maintenance Tasks Catalog Schema

  1. New Tables
    - `maintenance_tasks_catalog` - Stores maintenance task types and categories
      - `id` (uuid, primary key)
      - `task_category` (text, category name)
      - `task_name` (text, unique task name)
      - `is_category` (boolean, indicates if entry is a category header)
      - `active` (boolean, indicates if task is active)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on the table
    - Add policies for authenticated users to read, insert, and update
    
  3. Data
    - Insert category headers and task items
    - Use ON CONFLICT to avoid duplicate entries
*/

-- Create the maintenance_tasks_catalog table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_tasks_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_category text NOT NULL,
  task_name text NOT NULL UNIQUE,
  is_category boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function for updating the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_maintenance_tasks_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at with IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_maintenance_tasks_catalog_updated_at'
  ) THEN
    CREATE TRIGGER set_maintenance_tasks_catalog_updated_at
    BEFORE UPDATE ON maintenance_tasks_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_tasks_catalog_updated_at();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies with IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Enable read access for authenticated users' AND tablename = 'maintenance_tasks_catalog'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users" ON maintenance_tasks_catalog
      FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Enable insert for authenticated users' AND tablename = 'maintenance_tasks_catalog'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON maintenance_tasks_catalog
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Enable update for authenticated users' AND tablename = 'maintenance_tasks_catalog'
  ) THEN
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