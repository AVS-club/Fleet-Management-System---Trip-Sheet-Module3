-- Migration: Add driver_photo_url column to drivers table
-- Description: Adds a column to store driver profile photo URLs
-- Date: 2025-11-02

-- Add driver_photo_url column to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS driver_photo_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.drivers.driver_photo_url IS 'URL/path to driver profile photo stored in Supabase Storage or external location';
