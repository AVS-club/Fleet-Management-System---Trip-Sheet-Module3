-- ================================================================
-- Create Maintenance Tasks Catalog Table
-- ================================================================
-- Purpose: Centralized catalog of all maintenance tasks for the organization
-- Date: 2025-11-09
-- ================================================================

-- Create the maintenance_tasks_catalog table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks_catalog (
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
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_catalog_org
  ON public.maintenance_tasks_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_catalog_task_name
  ON public.maintenance_tasks_catalog(task_name);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_catalog_category
  ON public.maintenance_tasks_catalog(task_category);

-- Enable RLS
ALTER TABLE public.maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;

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
-- Seed default maintenance tasks for all organizations
-- ================================================================

-- Function to populate catalog for an organization
CREATE OR REPLACE FUNCTION public.populate_maintenance_catalog_for_org(org_id UUID)
RETURNS VOID AS $$
DECLARE
  task_list TEXT[] := ARRAY[
    -- PURCHASE TASKS
    'Engine Oil Purchase',
    'Oil Filter Purchase',
    'Air Filter Purchase',
    'Fuel Filter Purchase',
    'Battery Purchase',
    'Tyre Purchase',
    'Brake Pad Purchase',
    'Brake Shoe Purchase',
    'Brake Disc Purchase',
    'Brake Drum Purchase',
    'Brake Oil Purchase',
    'Clutch Plate Purchase',
    'Clutch Assembly Purchase',
    'Coolant Purchase',
    'Radiator Hose Purchase',
    'Water Pump Purchase',
    'Thermostat Purchase',
    'Alternator Purchase',
    'Starter Motor Purchase',
    'Shock Absorber Purchase',
    'Spring Purchase',
    'Ball Joint Purchase',
    'Tie Rod End Purchase',
    'Wheel Bearing Purchase',
    'Spark Plug Purchase',
    'Glow Plug Purchase',
    'Timing Belt Purchase',
    'Drive Belt Purchase',
    'Windshield Wiper Purchase',
    'Light Bulb Purchase',
    'Fuse Purchase',
    'Parts Purchase',

    -- LABOR TASKS
    'Engine Oil Change',
    'Oil Filter Replacement',
    'Air Filter Replacement',
    'Fuel Filter Replacement',
    'Battery Replacement',
    'Tyre Replacement',
    'Brake Pad Replacement',
    'Brake Shoe Replacement',
    'Brake Disc Replacement',
    'Brake Drum Replacement',
    'Brake Oil Top-up',
    'Clutch Plate Replacement',
    'Clutch Assembly Replacement',
    'Coolant Top-up',
    'Radiator Hose Replacement',
    'Water Pump Replacement',
    'Thermostat Replacement',
    'Alternator Replacement',
    'Starter Motor Replacement',
    'Shock Absorber Replacement',
    'Spring Replacement',
    'Ball Joint Replacement',
    'Tie Rod End Replacement',
    'Wheel Bearing Replacement',
    'Spark Plug Replacement',
    'Glow Plug Replacement',
    'Timing Belt Replacement',
    'Drive Belt Replacement',
    'Windshield Wiper Replacement',
    'Light Bulb Replacement',
    'Fuse Replacement',
    'General Inspection',
    'Wheel Alignment',
    'Wheel Balancing',
    'Tyre Rotation',
    'Brake Inspection',
    'Suspension Check',
    'Steering Check',
    'Exhaust Inspection',
    'Cooling System Check',
    'Engine Diagnostic',
    'Transmission Service',
    'Differential Service',
    'AC Service',
    'Electrical System Check',
    'Body & Paint Work',
    'Denting & Painting',
    'Rust Treatment',
    'Underbody Coating',
    'Interior Cleaning',
    'Engine Wash',
    'Full Vehicle Service',
    'Pre-Purchase Inspection',
    'Emission Test',
    'Fitness Certificate Renewal',
    'Insurance Claim Work',
    'Accident Repair',
    'Engine Overhaul',
    'Gearbox Overhaul',
    'Clutch Overhaul'
  ];
  task_name TEXT;
  category_name TEXT;
BEGIN
  -- Clear existing tasks for this organization (if any)
  DELETE FROM public.maintenance_tasks_catalog WHERE organization_id = org_id;

  -- Insert all tasks
  FOREACH task_name IN ARRAY task_list
  LOOP
    -- Determine category based on task name
    IF task_name LIKE '%Purchase%' THEN
      category_name := 'Purchase Tasks';
    ELSE
      category_name := 'Labor & Service Tasks';
    END IF;

    INSERT INTO public.maintenance_tasks_catalog (
      task_category,
      task_name,
      is_category,
      active,
      organization_id
    ) VALUES (
      category_name,
      task_name,
      FALSE,
      TRUE,
      org_id
    );
  END LOOP;

  RAISE NOTICE 'Populated % tasks for organization %', array_length(task_list, 1), org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Populate catalog for all existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    PERFORM public.populate_maintenance_catalog_for_org(org_record.id);
  END LOOP;
  RAISE NOTICE 'Populated maintenance catalog for all organizations';
END $$;

-- Create trigger to auto-populate catalog for new organizations
CREATE OR REPLACE FUNCTION public.auto_populate_maintenance_catalog()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.populate_maintenance_catalog_for_org(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_populate_maintenance_catalog
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_maintenance_catalog();

-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this migration:
-- 1. SELECT COUNT(*) FROM maintenance_tasks_catalog; -- Should show tasks
-- 2. SELECT DISTINCT task_category FROM maintenance_tasks_catalog; -- Should show categories
-- 3. Test creating a new organization and verify catalog is auto-populated
