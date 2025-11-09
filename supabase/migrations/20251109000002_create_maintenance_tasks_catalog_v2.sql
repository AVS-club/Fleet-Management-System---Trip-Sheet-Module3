-- ================================================================
-- Create Maintenance Tasks Catalog Table (Simplified Version)
-- ================================================================
-- Purpose: Centralized catalog of all maintenance tasks for the organization
-- Date: 2025-11-09
-- ================================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.maintenance_tasks_catalog CASCADE;

-- Create the maintenance_tasks_catalog table
CREATE TABLE public.maintenance_tasks_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_category VARCHAR(100) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  is_category BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_maintenance_tasks_catalog_org ON public.maintenance_tasks_catalog(organization_id);
CREATE INDEX idx_maintenance_tasks_catalog_task_name ON public.maintenance_tasks_catalog(task_name);
CREATE INDEX idx_maintenance_tasks_catalog_category ON public.maintenance_tasks_catalog(task_category);

-- Enable RLS
ALTER TABLE public.maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "maintenance_tasks_catalog_select_policy" ON public.maintenance_tasks_catalog;
DROP POLICY IF EXISTS "maintenance_tasks_catalog_insert_policy" ON public.maintenance_tasks_catalog;
DROP POLICY IF EXISTS "maintenance_tasks_catalog_update_policy" ON public.maintenance_tasks_catalog;
DROP POLICY IF EXISTS "maintenance_tasks_catalog_delete_policy" ON public.maintenance_tasks_catalog;

-- Create RLS policies
CREATE POLICY "maintenance_tasks_catalog_select_policy"
ON public.maintenance_tasks_catalog
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "maintenance_tasks_catalog_insert_policy"
ON public.maintenance_tasks_catalog
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "maintenance_tasks_catalog_update_policy"
ON public.maintenance_tasks_catalog
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid()
  )
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "maintenance_tasks_catalog_delete_policy"
ON public.maintenance_tasks_catalog
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_users
    WHERE user_id = auth.uid()
  )
);

-- ================================================================
-- MANUAL STEP: Populate catalog after this migration completes
-- ================================================================
-- Run this separately in SQL Editor after the table is created:
--
-- INSERT INTO public.maintenance_tasks_catalog (task_category, task_name, is_category, active, organization_id)
-- SELECT 'Purchase Tasks', task_name, false, true, org.id
-- FROM public.organizations org
-- CROSS JOIN (VALUES
--   ('Engine Oil Purchase'), ('Oil Filter Purchase'), ('Air Filter Purchase'), ('Fuel Filter Purchase'),
--   ('Battery Purchase'), ('Tyre Purchase'), ('Brake Pad Purchase'), ('Brake Shoe Purchase'),
--   ('Brake Disc Purchase'), ('Brake Drum Purchase'), ('Brake Oil Purchase'), ('Clutch Plate Purchase'),
--   ('Clutch Assembly Purchase'), ('Coolant Purchase'), ('Radiator Hose Purchase'), ('Water Pump Purchase'),
--   ('Thermostat Purchase'), ('Alternator Purchase'), ('Starter Motor Purchase'), ('Shock Absorber Purchase'),
--   ('Spring Purchase'), ('Ball Joint Purchase'), ('Tie Rod End Purchase'), ('Wheel Bearing Purchase'),
--   ('Spark Plug Purchase'), ('Glow Plug Purchase'), ('Timing Belt Purchase'), ('Drive Belt Purchase'),
--   ('Windshield Wiper Purchase'), ('Light Bulb Purchase'), ('Fuse Purchase'), ('Parts Purchase')
-- ) AS tasks(task_name);
--
-- INSERT INTO public.maintenance_tasks_catalog (task_category, task_name, is_category, active, organization_id)
-- SELECT 'Labor & Service Tasks', task_name, false, true, org.id
-- FROM public.organizations org
-- CROSS JOIN (VALUES
--   ('Engine Oil Change'), ('Oil Filter Replacement'), ('Air Filter Replacement'), ('Fuel Filter Replacement'),
--   ('Battery Replacement'), ('Tyre Replacement'), ('Brake Pad Replacement'), ('Brake Shoe Replacement'),
--   ('Brake Disc Replacement'), ('Brake Drum Replacement'), ('Brake Oil Top-up'), ('Clutch Plate Replacement'),
--   ('Clutch Assembly Replacement'), ('Coolant Top-up'), ('Radiator Hose Replacement'), ('Water Pump Replacement'),
--   ('Thermostat Replacement'), ('Alternator Replacement'), ('Starter Motor Replacement'), ('Shock Absorber Replacement'),
--   ('Spring Replacement'), ('Ball Joint Replacement'), ('Tie Rod End Replacement'), ('Wheel Bearing Replacement'),
--   ('Spark Plug Replacement'), ('Glow Plug Replacement'), ('Timing Belt Replacement'), ('Drive Belt Replacement'),
--   ('Windshield Wiper Replacement'), ('Light Bulb Replacement'), ('Fuse Replacement'), ('General Inspection'),
--   ('Wheel Alignment'), ('Wheel Balancing'), ('Tyre Rotation'), ('Brake Inspection'), ('Suspension Check'),
--   ('Steering Check'), ('Exhaust Inspection'), ('Cooling System Check'), ('Engine Diagnostic'),
--   ('Transmission Service'), ('Differential Service'), ('AC Service'), ('Electrical System Check'),
--   ('Body & Paint Work'), ('Denting & Painting'), ('Rust Treatment'), ('Underbody Coating'),
--   ('Interior Cleaning'), ('Engine Wash'), ('Full Vehicle Service'), ('Pre-Purchase Inspection'),
--   ('Emission Test'), ('Fitness Certificate Renewal'), ('Insurance Claim Work'), ('Accident Repair'),
--   ('Engine Overhaul'), ('Gearbox Overhaul'), ('Clutch Overhaul')
-- ) AS tasks(task_name);
