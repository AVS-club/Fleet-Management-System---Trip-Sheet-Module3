-- =====================================================
-- Simple Backfill for service_type
-- Created: 2025-11-24
-- Description: Sets all NULL service_type to 'labor' as safe default
-- =====================================================

-- Update all NULL service_type records to 'labor'
-- This is the safest default as most maintenance involves service/repair work
UPDATE public.maintenance_service_tasks
SET service_type = 'labor'
WHERE service_type IS NULL;

-- Show results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % records with service_type = labor', updated_count;
END $$;

