-- ================================================================
-- QUICK FIX - Just Copy & Paste These 3 Commands in Order
-- ================================================================
-- Run these in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- ============================================================
-- COMMAND 1: Clean up bad data
-- ============================================================
DELETE FROM kpi_cards WHERE kpi_value_human IS NULL;


-- ============================================================
-- COMMAND 2: Apply the fix
-- ============================================================
-- Copy the ENTIRE contents of this file and paste it here:
-- supabase/migrations/20251202_fix_kpi_null_issues.sql


-- ============================================================
-- COMMAND 3: Test it works
-- ============================================================
SELECT generate_comparative_kpis();

-- Expected result: {"success": true, "cards_created": 10, ...}
-- If you see this, you're done! ✅

