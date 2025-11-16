-- =====================================================
-- Migration: Remove battery_data and tyre_data columns
-- Created: 2025-11-14
-- Description:
--   Remove redundant battery and tire tracking columns
--   since parts_data JSONB column now handles all parts
--   including batteries and tires
-- =====================================================

-- Drop battery_data column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'battery_data'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    DROP COLUMN battery_data;

    RAISE NOTICE 'Dropped battery_data column from maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'battery_data column does not exist (already removed)';
  END IF;
END $$;

-- Drop tyre_data column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'tyre_data'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    DROP COLUMN tyre_data;

    RAISE NOTICE 'Dropped tyre_data column from maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'tyre_data column does not exist (already removed)';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the columns were dropped:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'maintenance_service_tasks'
-- AND column_name IN ('battery_data', 'tyre_data');
-- (Should return 0 rows)
