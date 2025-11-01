-- ================================================================
-- VERIFY KPI DATA EXISTS
-- ================================================================

-- Check how many KPI cards exist
SELECT COUNT(*) as total_kpi_cards
FROM public.kpi_cards;

-- Show all KPI cards with their values
SELECT
  kpi_key,
  kpi_title,
  kpi_value_human,
  theme,
  computed_at,
  organization_id
FROM public.kpi_cards
ORDER BY computed_at DESC;

-- Check if organization_id is NULL (RLS issue)
SELECT
  COUNT(*) as kpis_with_null_org
FROM public.kpi_cards
WHERE organization_id IS NULL;

-- Show KPIs by theme
SELECT
  theme,
  COUNT(*) as count,
  MAX(computed_at) as latest_computed
FROM public.kpi_cards
GROUP BY theme
ORDER BY count DESC;
