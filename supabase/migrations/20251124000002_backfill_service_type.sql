-- =====================================================
-- Migration: Backfill service_type for existing records
-- Created: 2025-11-24
-- Description:
--   Intelligently backfills service_type for existing maintenance_service_tasks
--   by analyzing the tasks associated with each service group
-- =====================================================

-- =====================================================
-- STEP 1: Backfill based on task patterns
-- =====================================================

-- Set to 'purchase' if tasks contain Purchase keywords
UPDATE public.maintenance_service_tasks
SET service_type = 'purchase'
WHERE service_type IS NULL
  AND EXISTS (
    SELECT 1 
    FROM unnest(tasks) AS task_id
    JOIN maintenance_tasks_catalog mtc ON mtc.id = task_id::uuid
    WHERE mtc.task_name ILIKE '%purchase%'
       OR mtc.task_name ILIKE '%buy%'
       OR mtc.task_name ILIKE '%part%'
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM unnest(tasks) AS task_id
    JOIN maintenance_tasks_catalog mtc ON mtc.id = task_id::uuid
    WHERE mtc.task_name ILIKE '%service%'
       OR mtc.task_name ILIKE '%repair%'
       OR mtc.task_name ILIKE '%wash%'
       OR mtc.task_name ILIKE '%install%'
  );

-- Set to 'labor' if tasks contain service/repair keywords and no purchase
UPDATE public.maintenance_service_tasks
SET service_type = 'labor'
WHERE service_type IS NULL
  AND EXISTS (
    SELECT 1 
    FROM unnest(tasks) AS task_id
    JOIN maintenance_tasks_catalog mtc ON mtc.id = task_id::uuid
    WHERE mtc.task_name ILIKE '%service%'
       OR mtc.task_name ILIKE '%repair%'
       OR mtc.task_name ILIKE '%wash%'
       OR mtc.task_name ILIKE '%coating%'
       OR mtc.task_name ILIKE '%clean%'
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM unnest(tasks) AS task_id
    JOIN maintenance_tasks_catalog mtc ON mtc.id = task_id::uuid
    WHERE mtc.task_name ILIKE '%purchase%'
  );

-- Set to 'both' if tasks contain both purchase AND service keywords
UPDATE public.maintenance_service_tasks
SET service_type = 'both'
WHERE service_type IS NULL
  AND EXISTS (
    SELECT 1 
    FROM unnest(tasks) AS task_id
    JOIN maintenance_tasks_catalog mtc ON mtc.id = task_id::uuid
    WHERE mtc.task_name ILIKE '%purchase%'
  )
  AND EXISTS (
    SELECT 1 
    FROM unnest(tasks) AS task_id
    JOIN maintenance_tasks_catalog mtc ON mtc.id = task_id::uuid
    WHERE mtc.task_name ILIKE '%service%'
       OR mtc.task_name ILIKE '%repair%'
       OR mtc.task_name ILIKE '%install%'
  );

-- =====================================================
-- STEP 2: Backfill based on parts_data presence
-- =====================================================

-- If parts_data exists, likely a purchase
UPDATE public.maintenance_service_tasks
SET service_type = 'purchase'
WHERE service_type IS NULL
  AND parts_data IS NOT NULL
  AND jsonb_array_length(parts_data) > 0;

-- =====================================================
-- STEP 3: Default remaining to 'labor' (service/repair)
-- =====================================================

-- Any remaining NULL values default to labor (safest assumption)
UPDATE public.maintenance_service_tasks
SET service_type = 'labor'
WHERE service_type IS NULL;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the backfill:
-- 
-- SELECT 
--   service_type,
--   COUNT(*) as count,
--   ROUND(AVG(service_cost), 2) as avg_cost
-- FROM maintenance_service_tasks
-- GROUP BY service_type
-- ORDER BY count DESC;

