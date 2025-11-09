-- Migration: Add notes column to maintenance_service_tasks
-- Created: 2025-11-09
-- Description: Adds missing notes column to maintenance_service_tasks table
--
-- This is a minimal migration that only adds the one column that's actually missing
-- from the database schema. All other columns (service_type, battery_data, tyre_data,
-- parts_data, battery_warranty_url, tyre_warranty_url) already exist.

-- =====================================================
-- Add notes column to maintenance_service_tasks
-- =====================================================

ALTER TABLE public.maintenance_service_tasks
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration, verify the column exists:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'maintenance_service_tasks' AND column_name = 'notes';
