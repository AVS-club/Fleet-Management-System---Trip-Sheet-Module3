-- Quick verification query to check KPI values
-- Run this to see if KPIs have real data

SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw,
    TO_CHAR(computed_at, 'YYYY-MM-DD HH24:MI:SS') as last_updated,
    theme
FROM kpi_cards
WHERE computed_at >= NOW() - INTERVAL '1 hour'
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

