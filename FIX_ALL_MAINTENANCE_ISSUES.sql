-- ================================================================
-- COMPLETE FIX FOR ALL MAINTENANCE MODULE ISSUES
-- ================================================================
-- This script will fix ALL known schema issues
-- Run this in Supabase SQL Editor
-- ================================================================

BEGIN;

\echo '🔧 Starting maintenance module fixes...'
\echo ''

-- ================================================================
-- FIX 1: Add missing columns to maintenance_service_tasks
-- ================================================================

\echo '📝 FIX 1: Adding missing columns to maintenance_service_tasks...'

-- Add all required columns if they don't exist
-- NOTE: battery_data, tyre_data, and warranty columns removed as zombie code
-- Use unified parts_data system instead
ALTER TABLE public.maintenance_service_tasks
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS parts_data JSONB DEFAULT '[]'::jsonb;

\echo '✅ Columns added/verified'
\echo ''

-- ================================================================
-- FIX 2: Remove invalid columns if they exist
-- ================================================================

\echo '📝 FIX 2: Removing invalid tracking columns if they exist...'

-- Drop battery_tracking and tyre_tracking if they exist (they shouldn't!)
DO $$
BEGIN
  -- Drop battery_tracking if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
      AND column_name = 'battery_tracking'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks DROP COLUMN battery_tracking;
    RAISE NOTICE '✅ Removed battery_tracking column';
  ELSE
    RAISE NOTICE '✅ battery_tracking column does not exist (good)';
  END IF;

  -- Drop tyre_tracking if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
      AND column_name = 'tyre_tracking'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks DROP COLUMN tyre_tracking;
    RAISE NOTICE '✅ Removed tyre_tracking column';
  ELSE
    RAISE NOTICE '✅ tyre_tracking column does not exist (good)';
  END IF;
END $$;

\echo ''

-- ================================================================
-- FIX 3: Add check constraint for service_type
-- ================================================================

\echo '📝 FIX 3: Adding check constraint for service_type...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'maintenance_service_tasks_service_type_check'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD CONSTRAINT maintenance_service_tasks_service_type_check
    CHECK (service_type IN ('purchase', 'labor', 'both', NULL));
    RAISE NOTICE '✅ Added service_type check constraint';
  ELSE
    RAISE NOTICE '✅ service_type check constraint already exists';
  END IF;
END $$;

\echo ''

-- ================================================================
-- FIX 4: Add notes column to maintenance_tasks if missing
-- ================================================================

\echo '📝 FIX 4: Adding notes column to maintenance_tasks...'

ALTER TABLE public.maintenance_tasks
  ADD COLUMN IF NOT EXISTS notes TEXT;

\echo '✅ Notes column added/verified'
\echo ''

-- ================================================================
-- FIX 5: Ensure maintenance_vendors has required columns
-- ================================================================

\echo '📝 FIX 5: Fixing maintenance_vendors table...'

ALTER TABLE public.maintenance_vendors
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index on active column for faster queries
CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_active
  ON public.maintenance_vendors(active);

-- Set existing vendors to active
UPDATE public.maintenance_vendors
SET active = TRUE
WHERE active IS NULL;

\echo '✅ Vendors table fixed'
\echo ''

-- ================================================================
-- FIX 6: Add organization_id filter indexes for performance
-- ================================================================

\echo '📝 FIX 6: Adding performance indexes...'

CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_org
  ON public.maintenance_service_tasks(maintenance_task_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_org
  ON public.maintenance_tasks(organization_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_vehicle
  ON public.maintenance_tasks(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_org
  ON public.maintenance_vendors(organization_id);

\echo '✅ Indexes created'
\echo ''

-- ================================================================
-- FIX 7: Verify RLS policies exist on maintenance_service_tasks
-- ================================================================

\echo '📝 FIX 7: Ensuring RLS policies...'

-- Enable RLS on maintenance_service_tasks
ALTER TABLE public.maintenance_service_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view service tasks for their org tasks" ON public.maintenance_service_tasks;
DROP POLICY IF EXISTS "Users can insert service tasks for their org tasks" ON public.maintenance_service_tasks;
DROP POLICY IF EXISTS "Users can update service tasks for their org tasks" ON public.maintenance_service_tasks;
DROP POLICY IF EXISTS "Users can delete service tasks for their org tasks" ON public.maintenance_service_tasks;

-- Create RLS policies for maintenance_service_tasks
CREATE POLICY "Users can view service tasks for their org tasks"
  ON public.maintenance_service_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_tasks mt
      INNER JOIN public.organization_users ou ON ou.organization_id = mt.organization_id
      WHERE mt.id = maintenance_service_tasks.maintenance_task_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert service tasks for their org tasks"
  ON public.maintenance_service_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_tasks mt
      INNER JOIN public.organization_users ou ON ou.organization_id = mt.organization_id
      WHERE mt.id = maintenance_service_tasks.maintenance_task_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update service tasks for their org tasks"
  ON public.maintenance_service_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_tasks mt
      INNER JOIN public.organization_users ou ON ou.organization_id = mt.organization_id
      WHERE mt.id = maintenance_service_tasks.maintenance_task_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete service tasks for their org tasks"
  ON public.maintenance_service_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_tasks mt
      INNER JOIN public.organization_users ou ON ou.organization_id = mt.organization_id
      WHERE mt.id = maintenance_service_tasks.maintenance_task_id
        AND ou.user_id = auth.uid()
    )
  );

\echo '✅ RLS policies configured'
\echo ''

-- ================================================================
-- VERIFICATION
-- ================================================================

\echo '=================================================='
\echo '📊 VERIFICATION RESULTS'
\echo '=================================================='
\echo ''

-- Show columns in maintenance_service_tasks
\echo 'Columns in maintenance_service_tasks:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
ORDER BY ordinal_position;

\echo ''
\echo 'Expected columns with correct data types:'
\echo '✅ service_type (character varying)'
\echo '✅ notes (text)'
\echo '✅ battery_data (jsonb)'
\echo '✅ tyre_data (jsonb)'
\echo '✅ parts_data (jsonb)'
\echo '✅ battery_warranty_url (ARRAY)'
\echo '✅ tyre_warranty_url (ARRAY)'
\echo '✅ part_warranty_url (ARRAY)'
\echo ''

-- Verify no invalid columns exist
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No invalid tracking columns found'
    ELSE '❌ ERROR: Found invalid columns: ' || string_agg(column_name, ', ')
  END as tracking_columns_check
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND column_name IN ('battery_tracking', 'tyre_tracking');

\echo ''
\echo '=================================================='
\echo '✅ ALL FIXES COMPLETE'
\echo '=================================================='
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Refresh your browser with Ctrl+Shift+R (hard refresh)'
\echo '2. Open DevTools Console (F12) and clear all errors'
\echo '3. Try creating a new maintenance task'
\echo '4. Verify no "battery_tracking" errors appear'
\echo ''
\echo 'If issues persist:'
\echo '- Check that your frontend code does NOT reference battery_tracking'
\echo '- Verify you are using the latest version of ServiceGroupsSection.tsx'
\echo '- Clear browser cache completely'
\echo '=================================================='

COMMIT;
