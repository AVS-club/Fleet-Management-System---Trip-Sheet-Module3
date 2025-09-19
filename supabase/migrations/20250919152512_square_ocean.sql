-- Add odometer_image column to maintenance_tasks table
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS odometer_image TEXT;