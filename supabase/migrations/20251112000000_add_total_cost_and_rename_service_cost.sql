-- =====================================================
-- Migration: Add total_cost to maintenance_tasks and rename cost to service_cost
-- Created: 2025-11-12
-- Description:
--   1. Rename 'cost' to 'service_cost' in maintenance_service_tasks
--   2. Add 'total_cost' to maintenance_tasks (sum of all service costs)
--   3. Create trigger to auto-update total_cost when service tasks change
-- =====================================================

-- =====================================================
-- STEP 1: Rename cost to service_cost in maintenance_service_tasks
-- =====================================================
DO $$
BEGIN
  -- Check if 'cost' column exists and 'service_cost' doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'cost'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'service_cost'
  ) THEN
    ALTER TABLE public.maintenance_service_tasks
    RENAME COLUMN cost TO service_cost;

    RAISE NOTICE 'Renamed cost to service_cost in maintenance_service_tasks';
  ELSE
    RAISE NOTICE 'Column rename already applied or service_cost already exists';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add total_cost to maintenance_tasks
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE public.maintenance_tasks
    ADD COLUMN total_cost DECIMAL(10,2) DEFAULT 0;

    RAISE NOTICE 'Added total_cost column to maintenance_tasks';
  ELSE
    RAISE NOTICE 'total_cost column already exists in maintenance_tasks';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Backfill total_cost for existing tasks
-- =====================================================
UPDATE public.maintenance_tasks mt
SET total_cost = COALESCE(
  (
    SELECT SUM(service_cost)
    FROM public.maintenance_service_tasks mst
    WHERE mst.maintenance_task_id = mt.id
  ),
  0
);

-- =====================================================
-- STEP 4: Create function to update total_cost
-- =====================================================
CREATE OR REPLACE FUNCTION update_maintenance_task_total_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent maintenance_tasks.total_cost
  UPDATE public.maintenance_tasks
  SET total_cost = COALESCE(
    (
      SELECT SUM(service_cost)
      FROM public.maintenance_service_tasks
      WHERE maintenance_task_id = COALESCE(NEW.maintenance_task_id, OLD.maintenance_task_id)
    ),
    0
  )
  WHERE id = COALESCE(NEW.maintenance_task_id, OLD.maintenance_task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Create triggers for auto-updating total_cost
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_total_cost_on_insert ON public.maintenance_service_tasks;
DROP TRIGGER IF EXISTS update_total_cost_on_update ON public.maintenance_service_tasks;
DROP TRIGGER IF EXISTS update_total_cost_on_delete ON public.maintenance_service_tasks;

-- Trigger on INSERT
CREATE TRIGGER update_total_cost_on_insert
AFTER INSERT ON public.maintenance_service_tasks
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_task_total_cost();

-- Trigger on UPDATE
CREATE TRIGGER update_total_cost_on_update
AFTER UPDATE OF service_cost ON public.maintenance_service_tasks
FOR EACH ROW
WHEN (OLD.service_cost IS DISTINCT FROM NEW.service_cost)
EXECUTE FUNCTION update_maintenance_task_total_cost();

-- Trigger on DELETE
CREATE TRIGGER update_total_cost_on_delete
AFTER DELETE ON public.maintenance_service_tasks
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_task_total_cost();

-- =====================================================
-- STEP 6: Add index for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_task_id_cost
ON public.maintenance_service_tasks(maintenance_task_id, service_cost);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these queries to verify:
-- 1. Check columns renamed:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'maintenance_service_tasks' AND column_name IN ('cost', 'service_cost');
--
-- 2. Check total_cost added:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'maintenance_tasks' AND column_name = 'total_cost';
--
-- 3. Test total_cost calculation:
--    SELECT mt.id, mt.total_cost,
--           (SELECT SUM(service_cost) FROM maintenance_service_tasks WHERE maintenance_task_id = mt.id) as calculated
--    FROM maintenance_tasks mt
--    LIMIT 10;
