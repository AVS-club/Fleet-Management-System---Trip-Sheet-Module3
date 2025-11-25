-- =====================================================
-- Database Verification Query
-- Run this in Supabase SQL Editor to check actual data
-- =====================================================

-- Check service groups for the specific task
SELECT 
  id,
  vendor_id,
  service_type,
  service_cost,
  tasks,
  use_line_items,
  bill_url,
  parts_data,
  created_at
FROM maintenance_service_tasks
WHERE maintenance_task_id = '019708de-3dd9-4d52-845f-e27e77c9ca7b'
ORDER BY created_at;

-- Check if columns exist in table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'maintenance_service_tasks'
  AND column_name IN ('vendor_id', 'service_type', 'service_cost')
ORDER BY column_name;

-- Count records with NULL service_type
SELECT 
  COUNT(*) as total_records,
  COUNT(service_type) as records_with_service_type,
  COUNT(*) - COUNT(service_type) as null_service_types
FROM maintenance_service_tasks;

