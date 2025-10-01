-- Fix Route Deviation Column Issue
-- This migration adds the missing route_deviation column to the trips table

-- Add route_deviation column to trips table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'route_deviation'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN route_deviation DECIMAL(5,2);
  END IF;
END $$;

-- Add other missing columns that might be needed
DO $$
BEGIN
  -- Add calculated_kmpl column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'calculated_kmpl'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN calculated_kmpl DECIMAL(5,2);
  END IF;
  
  -- Add fuel_efficiency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'fuel_efficiency'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN fuel_efficiency DECIMAL(5,2);
  END IF;
  
  -- Add total_distance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'total_distance'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN total_distance DECIMAL(8,2);
  END IF;
  
  -- Add fuel_consumed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'fuel_consumed'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN fuel_consumed DECIMAL(8,2);
  END IF;
  
  -- Add trip_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trip_duration'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN trip_duration INTEGER;
  END IF;
  
  -- Add gross_weight column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'gross_weight'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN gross_weight DECIMAL(8,2);
  END IF;
  
  -- Add unloading_expense column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'unloading_expense'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN unloading_expense DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add driver_expense column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'driver_expense'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN driver_expense DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add road_rto_expense column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'road_rto_expense'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN road_rto_expense DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add breakdown_expense column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'breakdown_expense'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN breakdown_expense DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add miscellaneous_expense column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'miscellaneous_expense'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN miscellaneous_expense DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add total_road_expenses column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'total_road_expenses'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN total_road_expenses DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add fuel_bill_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'fuel_bill_url'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN fuel_bill_url TEXT;
  END IF;
  
  -- Add advance_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'advance_amount'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN advance_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add remarks column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'remarks'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN remarks TEXT;
  END IF;
  
  -- Add destinations column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'destinations'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN destinations TEXT[];
  END IF;
  
  -- Add destination_names column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'destination_names'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN destination_names TEXT[];
  END IF;
  
  -- Add organization_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN organization_id UUID;
  END IF;
END $$;

-- Add indexes for performance
DO $$
BEGIN
  -- Add index for route_deviation if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_trips_route_deviation'
  ) THEN
    CREATE INDEX idx_trips_route_deviation ON public.trips(route_deviation);
  END IF;
  
  -- Add index for organization_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_trips_organization_id'
  ) THEN
    CREATE INDEX idx_trips_organization_id ON public.trips(organization_id);
  END IF;
END $$;

-- Clean up any existing data that might have % symbols in route_deviation
-- (This is a safety measure in case the column was created as TEXT)
UPDATE public.trips 
SET route_deviation = NULL 
WHERE route_deviation::TEXT LIKE '%\%%';

-- Add comment to the column
COMMENT ON COLUMN public.trips.route_deviation IS 'Route deviation percentage as decimal (e.g., 15.2 for 15.2%)';
