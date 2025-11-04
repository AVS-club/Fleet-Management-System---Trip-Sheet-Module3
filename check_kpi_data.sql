-- Check what's actually stored in the KPI cards
-- Run this in Supabase SQL Editor to see the raw data

SELECT
  kpi_title,
  kpi_value_human,
  kpi_payload,
  computed_at
FROM kpi_cards
WHERE kpi_title LIKE '%Top 3%' OR kpi_title LIKE '%Best%'
ORDER BY computed_at DESC
LIMIT 10;

-- This will show you:
-- 1. What's in kpi_value_human (the display string)
-- 2. What's in kpi_payload (the structured JSON data)
--
-- If kpi_payload has an 'items' array with proper data, we can use that
-- If not, we need to regenerate the KPIs with better formatting
