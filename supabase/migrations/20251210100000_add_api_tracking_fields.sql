-- Migration: Add API tracking fields to drivers and vehicles tables
-- This allows tracking the source of data and storing original API responses

-- Add API tracking fields to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS api_fetched_data JSONB,
ADD COLUMN IF NOT EXISTS api_fetch_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_overrides JSONB,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

-- Add comments to explain the columns
COMMENT ON COLUMN public.drivers.api_fetched_data IS 'Stores the original API response from DL verification service';
COMMENT ON COLUMN public.drivers.api_fetch_timestamp IS 'Timestamp when data was last fetched from API';
COMMENT ON COLUMN public.drivers.manual_overrides IS 'Stores fields that were manually edited after API fetch';
COMMENT ON COLUMN public.drivers.data_source IS 'Source of data: manual, api, or mixed';

-- Add index for faster queries on data_source
CREATE INDEX IF NOT EXISTS idx_drivers_data_source ON public.drivers(data_source);
CREATE INDEX IF NOT EXISTS idx_drivers_api_fetch_timestamp ON public.drivers(api_fetch_timestamp);

-- Add API tracking fields to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS api_fetched_data JSONB,
ADD COLUMN IF NOT EXISTS api_fetch_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_overrides JSONB,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

-- Add comments to explain the columns
COMMENT ON COLUMN public.vehicles.api_fetched_data IS 'Stores the original API response from RC verification service';
COMMENT ON COLUMN public.vehicles.api_fetch_timestamp IS 'Timestamp when data was last fetched from API';
COMMENT ON COLUMN public.vehicles.manual_overrides IS 'Stores fields that were manually edited after API fetch';
COMMENT ON COLUMN public.vehicles.data_source IS 'Source of data: manual, api, or mixed';

-- Add index for faster queries on data_source
CREATE INDEX IF NOT EXISTS idx_vehicles_data_source ON public.vehicles(data_source);
CREATE INDEX IF NOT EXISTS idx_vehicles_api_fetch_timestamp ON public.vehicles(api_fetch_timestamp);

-- Create function to track manual overrides
CREATE OR REPLACE FUNCTION track_manual_overrides()
RETURNS TRIGGER AS $$
BEGIN
  -- If data was previously from API and now being manually edited
  IF OLD.data_source IN ('api', 'mixed') AND NEW.data_source IS NULL THEN
    -- Track which fields were manually changed
    NEW.manual_overrides = jsonb_build_object(
      'fields', jsonb_build_array(),
      'timestamp', NOW()
    );
    NEW.data_source = 'mixed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for drivers table
DROP TRIGGER IF EXISTS drivers_track_overrides ON public.drivers;
CREATE TRIGGER drivers_track_overrides
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION track_manual_overrides();

-- Create triggers for vehicles table
DROP TRIGGER IF EXISTS vehicles_track_overrides ON public.vehicles;
CREATE TRIGGER vehicles_track_overrides
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION track_manual_overrides();

