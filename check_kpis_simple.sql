-- Quick KPI Check Script
-- Run this in Supabase SQL Editor to verify KPI data

-- ================================================================
-- 1. Check if kpi_cards table exists and has data
-- ================================================================
SELECT
  'Total KPI Cards' as metric,
  COUNT(*) as count
FROM kpi_cards;

-- ================================================================
-- 2. Check KPI cards by theme
-- ================================================================
SELECT
  theme,
  COUNT(*) as count
FROM kpi_cards
GROUP BY theme
ORDER BY count DESC;

-- ================================================================
-- 3. Check for NULL organization_id (will cause RLS issues)
-- ================================================================
SELECT
  'KPIs with NULL organization_id' as issue,
  COUNT(*) as count
FROM kpi_cards
WHERE organization_id IS NULL;

-- ================================================================
-- 4. Sample KPI cards (most recent)
-- ================================================================
SELECT
  kpi_title,
  kpi_value_human,
  theme,
  organization_id,
  computed_at
FROM kpi_cards
ORDER BY computed_at DESC
LIMIT 10;

-- ================================================================
-- 5. Check organization distribution
-- ================================================================
SELECT
  organization_id,
  COUNT(*) as kpi_count
FROM kpi_cards
WHERE organization_id IS NOT NULL
GROUP BY organization_id;

-- ================================================================
-- 6. Check events_feed for KPI events
-- ================================================================
SELECT
  'KPI Events in Feed' as metric,
  COUNT(*) as count
FROM events_feed
WHERE kind = 'kpi';

-- ================================================================
-- 7. Check for recent KPI events
-- ================================================================
SELECT
  title,
  description,
  event_time,
  organization_id
FROM events_feed
WHERE kind = 'kpi'
ORDER BY event_time DESC
LIMIT 5;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- If SQL ran successfully, you should see:
-- - Total KPI Cards: 22+ (per organization)
-- - Themes: distance, trips, fuel, pnl, utilization, etc.
-- - NULL organization_id: 0 (if any, re-run the SQL fix)
-- - KPI Events in Feed: 0 (we merge them in frontend, not in DB)
-- ================================================================
