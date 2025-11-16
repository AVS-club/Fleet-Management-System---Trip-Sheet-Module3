-- Migration: Remove notes column from maintenance_service_tasks table
-- Date: 2025-11-16
-- Reason: Notes field is not being used in the UI and adds unnecessary clutter

-- Drop the notes column from maintenance_service_tasks table
ALTER TABLE maintenance_service_tasks
DROP COLUMN IF EXISTS notes;

-- Verification query (run separately to check):
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'maintenance_service_tasks'
-- ORDER BY ordinal_position;
