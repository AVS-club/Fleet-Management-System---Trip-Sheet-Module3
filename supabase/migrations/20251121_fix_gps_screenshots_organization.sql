-- Fix organization_id column in trip_gps_screenshots table
-- Make it nullable since we can inherit it from the trip

ALTER TABLE public.trip_gps_screenshots 
ALTER COLUMN organization_id DROP NOT NULL;
