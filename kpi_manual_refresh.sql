-- ================================================================
-- MANUAL KPI REFRESH
-- ================================================================
-- Run this script to manually refresh KPIs at any time
-- ================================================================

SELECT public.generate_kpi_cards();

-- Expected output:
-- cards_created
-- -------------
-- 8 (or multiples of 8, depending on number of organizations)
