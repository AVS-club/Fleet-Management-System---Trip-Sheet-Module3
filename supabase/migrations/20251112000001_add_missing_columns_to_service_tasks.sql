-- =====================================================
-- Migration: Add missing columns to maintenance_service_tasks
-- Created: 2025-11-12
-- Description:
--   Add columns needed for the new service groups structure:
--   - organization_id: For RLS multi-tenant isolation
--   - service_type: Type of service (purchase/labor/both)
--   - notes: Service notes
--   - parts_data: JSONB for parts information
--   - battery_data: JSONB for battery information
--   - tyre_data: JSONB for tyre information
-- =====================================================

-- Add organization_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added organization_id column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'organization_id column already exists';
  END IF;
END $$;

-- Add service_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN service_type VARCHAR(50) CHECK (service_type IN ('purchase', 'labor', 'both'));

    RAISE NOTICE 'Added service_type column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'service_type column already exists';
  END IF;
END $$;

-- Add notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN notes TEXT DEFAULT '';

    RAISE NOTICE 'Added notes column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'notes column already exists';
  END IF;
END $$;

-- Add parts_data column (JSONB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'parts_data'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN parts_data JSONB DEFAULT '[]'::jsonb;

    RAISE NOTICE 'Added parts_data column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'parts_data column already exists';
  END IF;
END $$;

-- Add battery_data column (JSONB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'battery_data'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN battery_data JSONB DEFAULT '{}'::jsonb;

    RAISE NOTICE 'Added battery_data column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'battery_data column already exists';
  END IF;
END $$;

-- Add tyre_data column (JSONB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'tyre_data'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD COLUMN tyre_data JSONB DEFAULT '{}'::jsonb;

    RAISE NOTICE 'Added tyre_data column to maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'tyre_data column already exists';
  END IF;
END $$;

-- Create index for organization_id (for RLS performance)
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_org_id
ON public.maintenance_service_tasks(organization_id);

-- =====================================================
-- Update RLS Policies to use organization_id
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "maintenance_service_tasks_select_policy" ON public.maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_insert_policy" ON public.maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_update_policy" ON public.maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_delete_policy" ON public.maintenance_service_tasks;

-- Create new policies using organization_id
CREATE POLICY "maintenance_service_tasks_select_policy"
ON public.maintenance_service_tasks
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organizations
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "maintenance_service_tasks_insert_policy"
ON public.maintenance_service_tasks
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_organizations
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "maintenance_service_tasks_update_policy"
ON public.maintenance_service_tasks
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organizations
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "maintenance_service_tasks_delete_policy"
ON public.maintenance_service_tasks
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organizations
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'maintenance_service_tasks'
-- AND column_name IN ('organization_id', 'service_type', 'notes', 'parts_data', 'battery_data', 'tyre_data')
-- ORDER BY column_name;
