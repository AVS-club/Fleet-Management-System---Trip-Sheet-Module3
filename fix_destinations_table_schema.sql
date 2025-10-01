-- Fix destinations table schema to match the code expectations
-- This migration adds missing columns and updates RLS policies

-- Add missing columns to destinations table
ALTER TABLE public.destinations 
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS standard_distance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(20) DEFAULT '0h 0m',
ADD COLUMN IF NOT EXISTS historical_deviation DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'chhattisgarh',
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update existing records to have default values
UPDATE public.destinations 
SET 
  standard_distance = 0,
  estimated_time = '0h 0m',
  historical_deviation = 0,
  state = 'chhattisgarh',
  active = true
WHERE standard_distance IS NULL 
   OR estimated_time IS NULL 
   OR historical_deviation IS NULL 
   OR state IS NULL 
   OR active IS NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "destinations_delete_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON public.destinations;

-- Create new RLS policies that work with organization_id
CREATE POLICY "destinations_select_policy" ON public.destinations
  FOR SELECT USING (
    organization_id = (
      SELECT raw_user_meta_data->>'organization_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )::UUID
  );

CREATE POLICY "destinations_insert_policy" ON public.destinations
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT raw_user_meta_data->>'organization_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )::UUID
    AND added_by = auth.uid()
  );

CREATE POLICY "destinations_update_policy" ON public.destinations
  FOR UPDATE USING (
    organization_id = (
      SELECT raw_user_meta_data->>'organization_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )::UUID
  ) WITH CHECK (
    organization_id = (
      SELECT raw_user_meta_data->>'organization_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )::UUID
  );

CREATE POLICY "destinations_delete_policy" ON public.destinations
  FOR DELETE USING (
    organization_id = (
      SELECT raw_user_meta_data->>'organization_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )::UUID
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_destinations_organization_id ON public.destinations(organization_id);
CREATE INDEX IF NOT EXISTS idx_destinations_place_id ON public.destinations(place_id);
CREATE INDEX IF NOT EXISTS idx_destinations_added_by ON public.destinations(added_by);

-- Update existing destinations to have organization_id based on added_by user
UPDATE public.destinations 
SET organization_id = (
  SELECT raw_user_meta_data->>'organization_id'::UUID
  FROM auth.users 
  WHERE auth.users.id = destinations.added_by
)
WHERE organization_id IS NULL AND added_by IS NOT NULL;

-- Enable RLS on destinations table
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
