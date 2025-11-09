-- Migration: Update Maintenance Service Tasks Schema
-- Created: 2025-11-09
-- Description: Adds missing columns to maintenance_service_tasks table for proper data storage
--
-- Changes:
-- 1. Add service_type column (VARCHAR)
-- 2. Add notes column (TEXT)
-- 3. Add battery_data column (JSONB)
-- 4. Add tyre_data column (JSONB)
-- 5. Add parts_data column (JSONB)
-- 6. Add notes column to maintenance_tasks if missing

-- =====================================================
-- STEP 1: Add Missing Columns to maintenance_service_tasks
-- =====================================================

ALTER TABLE public.maintenance_service_tasks
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS battery_data JSONB,
  ADD COLUMN IF NOT EXISTS tyre_data JSONB,
  ADD COLUMN IF NOT EXISTS parts_data JSONB DEFAULT '[]'::jsonb;

-- =====================================================
-- STEP 2: Add notes column to maintenance_tasks if missing
-- =====================================================

ALTER TABLE public.maintenance_tasks
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- STEP 3: Add check constraints for data integrity
-- =====================================================

-- Ensure service_type has valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'maintenance_service_tasks_service_type_check'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    ADD CONSTRAINT maintenance_service_tasks_service_type_check
    CHECK (service_type IN ('purchase', 'labor', 'both', NULL));
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration:
-- 1. Verify columns exist: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'maintenance_service_tasks';
-- 2. Test form submission with all fields
-- 3. Verify data is being saved correctly to new JSONB columns
