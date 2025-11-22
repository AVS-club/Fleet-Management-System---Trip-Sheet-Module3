-- Trigger KPI Refresh After Fixes
-- This manually calls both KPI generation functions to populate data

-- Step 1: Generate base KPIs (today, week, month, current)
SELECT generate_kpi_cards();

-- Step 2: Generate comparative KPIs (MTD, WoW, performance, efficiency)
SELECT generate_comparative_kpis();

-- Step 3: Verify the results
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw,
    computed_at,
    theme,
    organization_id
FROM kpi_cards
WHERE computed_at >= NOW() - INTERVAL '5 minutes'
ORDER BY 
    CASE 
        WHEN kpi_key LIKE 'today.%' THEN 1
        WHEN kpi_key LIKE 'week.%' THEN 2
        WHEN kpi_key LIKE 'month.%' THEN 3
        WHEN kpi_key LIKE 'current.%' THEN 4
        WHEN kpi_key LIKE 'comparison.%' THEN 5
        WHEN kpi_key LIKE 'performance.%' THEN 6
        WHEN kpi_key LIKE 'efficiency.%' THEN 7
        ELSE 8
    END,
    kpi_key;

-- Step 4: Check for any zero values that shouldn't be zero
SELECT 
    kpi_key,
    kpi_value_human,
    kpi_value_raw,
    computed_at
FROM kpi_cards
WHERE (kpi_value_raw IS NULL OR kpi_value_raw::TEXT = '0')
    AND kpi_key NOT LIKE 'comparison.wow_%' -- Week-over-week might legitimately be 0
    AND computed_at >= NOW() - INTERVAL '5 minutes'
ORDER BY kpi_key;

-- Step 5: Show summary
DO $$
DECLARE
    total_kpis INTEGER;
    zero_kpis INTEGER;
    recent_kpis INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_kpis FROM kpi_cards;
    SELECT COUNT(*) INTO zero_kpis FROM kpi_cards WHERE kpi_value_raw IS NULL OR kpi_value_raw::TEXT = '0';
    SELECT COUNT(*) INTO recent_kpis FROM kpi_cards WHERE computed_at >= NOW() - INTERVAL '5 minutes';
    
    RAISE NOTICE '📊 KPI Summary:';
    RAISE NOTICE '  Total KPIs: %', total_kpis;
    RAISE NOTICE '  KPIs with zero values: %', zero_kpis;
    RAISE NOTICE '  KPIs generated in last 5 minutes: %', recent_kpis;
    
    IF recent_kpis > 0 THEN
        RAISE NOTICE '✅ KPI generation successful!';
    ELSE
        RAISE WARNING '⚠️ No recent KPIs found. Check if functions executed properly.';
    END IF;
END $$;

