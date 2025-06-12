/*
  # Initial Schema Setup

  1. New Tables
    - `vehicles`
      - Vehicle registration and details
      - Tracks maintenance status and documents
    - `drivers` 
      - Driver information and documents
      - Links to vehicles and tracks performance
    - `trips`
      - Trip records with route details
      - Tracks fuel, expenses, and mileage
    - `warehouses`
      - Storage locations and coordinates
    - `destinations`
      - Delivery points and route metrics
    - `maintenance_tasks`
      - Vehicle maintenance records
      - Tracks service history and costs
    - `material_types`
      - Cargo categories for trips

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create enum types
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'inactive', 'stood');
CREATE TYPE vehicle_type AS ENUM ('truck', 'tempo', 'trailer');
CREATE TYPE fuel_type AS ENUM ('diesel', 'petrol', 'cng');
CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'onLeave', 'suspended', 'blacklisted');
CREATE TYPE destination_type AS ENUM ('district', 'city', 'town', 'village');
CREATE TYPE state_type AS ENUM ('chhattisgarh', 'odisha');
CREATE TYPE maintenance_status AS ENUM ('open', 'in_progress', 'resolved', 'escalated', 'rework');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE maintenance_type AS ENUM ('general_scheduled', 'emergency_breakdown', 'driver_damage', 'warranty_claim');

-- Create vehicles table
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text UNIQUE NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  type vehicle_type NOT NULL,
  fuel_type fuel_type NOT NULL,
  current_odometer integer NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'active',
  chassis_number text,
  engine_number text,
  owner_name text,
  rc_copy boolean DEFAULT false,
  insurance_document boolean DEFAULT false,
  insurance_end_date timestamptz,
  fitness_document boolean DEFAULT false,
  fitness_expiry_date timestamptz,
  permit_document boolean DEFAULT false,
  permit_expiry_date timestamptz,
  puc_document boolean DEFAULT false,
  puc_expiry_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create drivers table
CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_number text UNIQUE NOT NULL,
  contact_number text NOT NULL,
  email text,
  join_date date NOT NULL,
  status driver_status NOT NULL DEFAULT 'active',
  experience integer NOT NULL,
  primary_vehicle_id uuid REFERENCES vehicles(id),
  photo text,
  license_document text,
  license_expiry_date timestamptz,
  documents_verified boolean DEFAULT false,
  driver_status_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warehouses table
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pincode text NOT NULL,
  latitude decimal(10,8),
  longitude decimal(11,8),
  active boolean DEFAULT true,
  material_type_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create destinations table
CREATE TABLE destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  standard_distance integer NOT NULL,
  estimated_time text NOT NULL,
  historical_deviation integer NOT NULL,
  type destination_type NOT NULL,
  state state_type NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trips table
CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_serial_number text UNIQUE NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  destinations jsonb NOT NULL,
  trip_start_date timestamptz NOT NULL,
  trip_end_date timestamptz NOT NULL,
  trip_duration integer NOT NULL,
  manual_trip_id boolean DEFAULT false,
  start_km integer NOT NULL,
  end_km integer NOT NULL,
  gross_weight decimal(10,2) NOT NULL,
  station text,
  refueling_done boolean DEFAULT false,
  fuel_quantity decimal(10,2),
  fuel_cost decimal(10,2),
  total_fuel_cost decimal(10,2),
  unloading_expense decimal(10,2) DEFAULT 0,
  driver_expense decimal(10,2) DEFAULT 0,
  road_rto_expense decimal(10,2) DEFAULT 0,
  breakdown_expense decimal(10,2) DEFAULT 0,
  total_road_expenses decimal(10,2) DEFAULT 0,
  short_trip boolean DEFAULT false,
  remarks text,
  calculated_kmpl decimal(10,2),
  route_deviation decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_tasks table
CREATE TABLE maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  task_type maintenance_type NOT NULL,
  title jsonb NOT NULL,
  description text,
  status maintenance_status NOT NULL DEFAULT 'open',
  priority maintenance_priority NOT NULL,
  vendor_id text NOT NULL,
  garage_id text NOT NULL,
  estimated_cost decimal(10,2) NOT NULL,
  actual_cost decimal(10,2),
  bills jsonb DEFAULT '[]',
  complaint_description text,
  resolution_summary text,
  warranty_expiry timestamptz,
  warranty_status text,
  warranty_claimed boolean DEFAULT false,
  part_replaced boolean DEFAULT false,
  part_details jsonb,
  parts_required jsonb DEFAULT '[]',
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  downtime_days integer NOT NULL DEFAULT 0,
  odometer_reading integer NOT NULL,
  next_service_due jsonb,
  attachments jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create material_types table
CREATE TABLE material_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON drivers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON destinations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON trips
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON maintenance_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON material_types
  FOR SELECT TO authenticated USING (true);

-- Add indexes for better query performance
CREATE INDEX idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX idx_drivers_license ON drivers(license_number);
CREATE INDEX idx_trips_dates ON trips(trip_start_date, trip_end_date);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_maintenance_vehicle ON maintenance_tasks(vehicle_id);
CREATE INDEX idx_maintenance_dates ON maintenance_tasks(start_date, end_date);