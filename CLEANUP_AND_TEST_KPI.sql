-- ================================================================
-- KPI FIX - CLEANUP AND TEST SCRIPT
-- ================================================================
-- Run these commands in your Supabase SQL Editor

-- STEP 1: Clean up any bad KPI records with NULL kpi_value_human
-- ================================================================
DELETE FROM kpi_cards 
WHERE kpi_value_human IS NULL;

-- Check how many were deleted
-- This should return 0 after cleanup
SELECT COUNT(*) as null_kpi_count 
FROM kpi_cards 
WHERE kpi_value_human IS NULL;


-- STEP 2: Apply the fix (run the migration file)
-- ================================================================
-- Copy and paste the entire contents of:
-- supabase/migrations/20251202_fix_kpi_null_issues.sql
-- into the Supabase SQL Editor and run it


-- STEP 3: Test the fix by running the comparative KPIs function
-- ================================================================
SELECT generate_comparative_kpis();

-- This should return something like:
-- {"success": true, "cards_created": 10, "message": "Comparative KPIs generated successfully"}


-- STEP 4: Verify all KPIs have valid data
-- ================================================================
-- Check for any NULL values in kpi_value_human
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw,
    organization_id,
    computed_at
FROM kpi_cards
WHERE kpi_value_human IS NULL;
-- This should return 0 rows


-- STEP 5: View all comparative KPIs to verify they're correct
-- ================================================================
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    theme,
    computed_at
FROM kpi_cards
WHERE kpi_key LIKE 'comparison.%' 
   OR kpi_key LIKE 'performance.%'
   OR kpi_key LIKE 'efficiency.%'
ORDER BY kpi_key;


-- STEP 6: Test the complete KPI refresh (both basic and comparative)
-- ================================================================
-- This tests both functions together (what the GitHub Action calls)
SELECT generate_kpi_cards();
SELECT generate_comparative_kpis();


-- OPTIONAL: If you want to see the error count per KPI type
-- ================================================================
SELECT 
    SUBSTRING(kpi_key FROM 1 FOR POSITION('.' IN kpi_key || '.') - 1) as kpi_category,
    COUNT(*) as total_kpis,
    COUNT(CASE WHEN kpi_value_human IS NULL THEN 1 END) as null_count
FROM kpi_cards
GROUP BY kpi_category
ORDER BY kpi_category;

