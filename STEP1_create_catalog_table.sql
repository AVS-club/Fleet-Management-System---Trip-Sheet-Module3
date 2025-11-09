-- ================================================================
-- STEP 1: Create Maintenance Tasks Catalog Table Structure Only
-- ================================================================
-- Run this first, then run STEP2 to populate data
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
