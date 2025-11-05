-- Check all KPI cards for hash mark issues
-- Run this in Supabase SQL Editor to identify corrupted data

SELECT
  kpi_title,
  kpi_value_human,
  kpi_payload,
  theme,
  computed_at
FROM kpi_cards
ORDER BY computed_at DESC
LIMIT 20;

-- Specifically check for hash marks in values
SELECT
  kpi_title,
  kpi_value_human,
  CASE
    WHEN kpi_value_human LIKE '%#%' THEN 'HAS HASH MARKS'
    ELSE 'OK'
  END as status
FROM kpi_cards
WHERE kpi_value_human LIKE '%#%'
ORDER BY computed_at DESC;
