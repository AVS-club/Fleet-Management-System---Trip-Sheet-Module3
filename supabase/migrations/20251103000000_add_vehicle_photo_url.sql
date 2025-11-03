-- Migration: Add vehicle_photo_url column to vehicles table
-- Created: 2025-11-03
-- Description: Adds support for storing a single vehicle photo URL per vehicle

-- Add vehicle_photo_url column to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.vehicles.vehicle_photo_url IS 'Storage path for vehicle photo (single photo per vehicle, stored in vehicle-photos bucket at vehicles/{vehicle-id}/photo.{ext})';

-- Create index for faster lookups (optional, but useful for filtering vehicles with/without photos)
CREATE INDEX IF NOT EXISTS idx_vehicles_photo_url ON public.vehicles(vehicle_photo_url) WHERE vehicle_photo_url IS NOT NULL;
