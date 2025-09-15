/*
  # Create maintenance service tasks table

  1. New Tables
    - `maintenance_service_tasks`
      - `id` (uuid, primary key)
      - `maintenance_task_id` (uuid, foreign key to maintenance_tasks)
      - `vendor_id` (text, vendor identifier)
      - `tasks` (text[], array of task names)
      - `cost` (numeric, service cost)
      - `bill_url` (text[], array of bill document URLs)
      - `battery_tracking` (boolean, tracks battery replacement)
      - `battery_serial` (text, battery serial number)
      - `battery_brand` (text, battery brand)
      - `battery_warranty_expiry_date` (date, battery warranty expiry)
      - `tyre_tracking` (boolean, tracks tyre replacement)
      - `tyre_positions` (text[], array of tyre positions)
      - `tyre_brand` (text, tyre brand)
      - `tyre_serials` (text, comma-separated tyre serial numbers)
      - `tyre_warranty_expiry_date` (date, tyre warranty expiry)
      - `tyre_warranty_file` (text[], tyre warranty document URLs)
      - `battery_warranty_file` (text[], battery warranty document URLs)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `maintenance_service_tasks` table
    - Add policies for authenticated users to manage their own service tasks
*/

CREATE TABLE IF NOT EXISTS public.maintenance_service_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_task_id uuid NOT NULL REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
  vendor_id text NOT NULL DEFAULT '',
  tasks text[] NOT NULL DEFAULT '{}',
  cost numeric(10,2) NOT NULL DEFAULT 0,
  bill_url text[] DEFAULT NULL,
  battery_tracking boolean DEFAULT false,
  battery_serial text DEFAULT NULL,
  battery_brand text DEFAULT NULL,
  battery_warranty_expiry_date date DEFAULT NULL,
  tyre_tracking boolean DEFAULT false,
  tyre_positions text[] DEFAULT '{}',
  tyre_brand text DEFAULT NULL,
  tyre_serials text DEFAULT NULL,
  tyre_warranty_expiry_date date DEFAULT NULL,
  tyre_warranty_file text[] DEFAULT NULL,
  battery_warranty_file text[] DEFAULT NULL,
  parts_replaced boolean DEFAULT false,
  battery_data jsonb DEFAULT NULL,
  tyre_data jsonb DEFAULT NULL,
  battery_warranty_url text[] DEFAULT NULL,
  tyre_warranty_url text[] DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_service_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for authenticated users" ON public.maintenance_service_tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON public.maintenance_service_tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable update for authenticated users" ON public.maintenance_service_tasks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.maintenance_service_tasks
  FOR DELETE TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_task_id 
  ON public.maintenance_service_tasks(maintenance_task_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_vendor_id 
  ON public.maintenance_service_tasks(vendor_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp_maintenance_service_tasks()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_maintenance_service_tasks
  BEFORE UPDATE ON public.maintenance_service_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_maintenance_service_tasks();