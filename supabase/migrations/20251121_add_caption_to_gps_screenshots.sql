-- Add missing caption column to trip_gps_screenshots table
ALTER TABLE public.trip_gps_screenshots 
ADD COLUMN IF NOT EXISTS caption TEXT;
