-- Complete Fleet Management Database Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic ENUM types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
    CREATE TYPE public.billing_type AS ENUM ('per_km', 'per_ton', 'manual');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profit_status') THEN
    CREATE TYPE public.profit_status AS ENUM ('profit', 'loss', 'neutral');
  END IF;
END $$;

-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(255) UNIQUE NOT NULL,
  make VARCHAR(255),
  model VARCHAR(255),
  year INTEGER,
  type VARCHAR(255),
  fuel_type VARCHAR(255),
  current_odometer INTEGER DEFAULT 0,
  insurance_expiry DATE,
  pollution_expiry DATE,
  fitness_expiry DATE,
  permit_expiry DATE,
  tax_expiry DATE,
  status VARCHAR(50) DEFAULT 'active',
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  date_of_birth DATE,
  date_of_joining DATE,
  license_expiry DATE,
  medical_certificate_expiry DATE,
  aadhar_number VARCHAR(20),
  status VARCHAR(50) DEFAULT 'active',
  experience_years INTEGER DEFAULT 0,
  salary DECIMAL(10,2),
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create destinations table
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  type VARCHAR(50),
  place_id VARCHAR(255),
  place_name TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trips table with refuelings column
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_serial_number VARCHAR(50) UNIQUE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  trip_start_date TIMESTAMPTZ,
  trip_end_date TIMESTAMPTZ,
  start_km INTEGER,
  end_km INTEGER,
  total_km INTEGER,
  destination VARCHAR(255),
  warehouse_id UUID,
  material_type VARCHAR(100),
  material_quantity DECIMAL(10,2),
  material_unit VARCHAR(20),
  trip_expenses DECIMAL(10,2) DEFAULT 0,
  driver_allowance DECIMAL(10,2) DEFAULT 0,
  toll_expenses DECIMAL(10,2) DEFAULT 0,
  other_expenses DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  fuel_quantity DECIMAL(10,2),
  fuel_rate_per_liter DECIMAL(10,2),
  total_fuel_cost DECIMAL(10,2),
  refueling_done BOOLEAN DEFAULT false,
  station VARCHAR(255),
  fuel_station_id UUID,
  documents TEXT[],
  is_return_trip BOOLEAN DEFAULT false,
  freight_rate DECIMAL(10,2),
  billing_type billing_type,
  income_amount DECIMAL(10,2),
  total_expense DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  cost_per_km DECIMAL(10,2),
  profit_status profit_status,
  refuelings JSONB DEFAULT '[]'::jsonb, -- Multiple refuelings support
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  task_type VARCHAR(100),
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  cost DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  vendor VARCHAR(255),
  invoice_number VARCHAR(100),
  next_due_date DATE,
  next_due_km INTEGER,
  notes TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  document_type VARCHAR(100),
  document_number VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create driver_documents table
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id),
  document_type VARCHAR(100),
  document_number VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allows authenticated users to manage their own data)
CREATE POLICY "Users can view their own vehicles" ON public.vehicles
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own drivers" ON public.drivers
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own trips" ON public.trips
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own destinations" ON public.destinations
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own maintenance tasks" ON public.maintenance_tasks
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own vehicle documents" ON public.vehicle_documents
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own driver documents" ON public.driver_documents
  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_start_date ON public.trips(trip_start_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_tasks(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_driver_id ON public.driver_documents(driver_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;