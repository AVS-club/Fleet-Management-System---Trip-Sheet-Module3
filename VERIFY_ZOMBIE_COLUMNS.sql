-- ============================================
-- VERIFICATION: Check for Battery/Tire Zombie Columns
-- ============================================
-- Run this in Supabase SQL Editor to verify cleanup status

-- 1. Check if zombie columns still exist in maintenance_service_tasks
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND (
    column_name LIKE '%battery%'
    OR column_name LIKE '%tyre%'
    OR column_name LIKE '%tire%'
  )
ORDER BY column_name;

-- Expected result: 0 rows (no battery/tyre columns should exist)
-- If you see any rows, the zombie columns still exist and need to be removed

-- ============================================
-- 2. Verify parts_data column exists and is JSONB
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenance_service_tasks'
  AND column_name = 'parts_data';

-- Expected result: 1 row showing parts_data as JSONB type

-- ============================================
-- 3. Check sample data to see if parts_data is being used
-- ============================================
SELECT
  id,
  maintenance_task_id,
  parts_data,
  created_at
FROM maintenance_service_tasks
WHERE parts_data IS NOT NULL
  AND jsonb_array_length(parts_data) > 0
LIMIT 5;

-- Expected result: Shows recent tasks with parts_data populated

-- ============================================
-- 4. Verify storage buckets for part warranties exist
-- ============================================
SELECT
  id,
  name,
  created_at
FROM storage.buckets
WHERE name IN ('part-warranties', 'maintenance-bills');

-- Expected result: 2 rows showing both buckets exist

-- ============================================
-- INTERPRETATION:
-- ============================================
-- If Query 1 returns 0 rows: ✅ Database is clean, zombie columns removed
-- If Query 1 returns rows:   ⚠️ Need to run REMOVE_BATTERY_TYRE_ZOMBIES.sql
-- If Query 2 returns 0 rows: ❌ parts_data column missing, serious problem
-- If Query 2 returns 1 row:  ✅ parts_data column exists correctly
