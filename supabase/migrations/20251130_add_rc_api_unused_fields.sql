-- Add unused RC API fields to vehicles table
-- Date: 2025-11-30
-- Purpose: Capture ALL data from RC API (100% utilization)

-- Add missing fields from RC API response
ALTER TABLE public.vehicles
  -- Critical compliance field
  ADD COLUMN IF NOT EXISTS blacklist_status TEXT,
  
  -- Owner information
  ADD COLUMN IF NOT EXISTS owner_count TEXT,
  ADD COLUMN IF NOT EXISTS present_address TEXT,
  ADD COLUMN IF NOT EXISTS permanent_address TEXT,
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  
  -- RTO information
  ADD COLUMN IF NOT EXISTS rto_name TEXT,
  
  -- Additional technical details
  ADD COLUMN IF NOT EXISTS body_type TEXT,
  ADD COLUMN IF NOT EXISTS manufacturing_date TEXT,
  ADD COLUMN IF NOT EXISTS wheelbase TEXT,
  ADD COLUMN IF NOT EXISTS sleeper_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS standing_capacity INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.blacklist_status IS 'Vehicle blacklist status from government database - CRITICAL for compliance';
COMMENT ON COLUMN public.vehicles.owner_count IS 'Number of previous owners (e.g., "1", "2")';
COMMENT ON COLUMN public.vehicles.present_address IS 'Owner present/current address';
COMMENT ON COLUMN public.vehicles.permanent_address IS 'Owner permanent address';
COMMENT ON COLUMN public.vehicles.father_name IS 'Owner father name';
COMMENT ON COLUMN public.vehicles.rto_name IS 'RTO office name (e.g., "RAIPUR RTO")';
COMMENT ON COLUMN public.vehicles.body_type IS 'Vehicle body type (e.g., "Closed Body", "Open Body")';
COMMENT ON COLUMN public.vehicles.manufacturing_date IS 'Original manufacturing date from vehicle';
COMMENT ON COLUMN public.vehicles.wheelbase IS 'Vehicle wheelbase measurement';
COMMENT ON COLUMN public.vehicles.sleeper_capacity IS 'Sleeper berth capacity for trucks';
COMMENT ON COLUMN public.vehicles.standing_capacity IS 'Standing passenger capacity for buses';

