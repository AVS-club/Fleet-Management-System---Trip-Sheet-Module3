-- Clean up duplicate KPI entries and keep only the ones with actual values
-- This removes zero-value duplicates and ensures unique KPIs per organization

DO $$
DECLARE
    org_id UUID := 'ab6c2178-32f9-4a03-b5ab-d535db827a58';
BEGIN
    -- For each comparative KPI key, keep only the one with the highest value (non-zero)
    -- Delete duplicates with zero values
    
    -- Clean up MTD Revenue duplicates
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key = 'comparison.mtd_revenue'
    AND kpi_value_raw = 0
    AND EXISTS (
        SELECT 1 FROM kpi_cards k2
        WHERE k2.organization_id = org_id
        AND k2.kpi_key = 'comparison.mtd_revenue'
        AND k2.kpi_value_raw > 0
    );
    
    -- Clean up MTD Trips duplicates
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key = 'comparison.mtd_trips'
    AND kpi_value_raw = 0
    AND EXISTS (
        SELECT 1 FROM kpi_cards k2
        WHERE k2.organization_id = org_id
        AND k2.kpi_key = 'comparison.mtd_trips'
        AND k2.kpi_value_raw > 0
    );
    
    -- Clean up MTD Distance duplicates
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key = 'comparison.mtd_distance'
    AND kpi_value_raw = 0
    AND EXISTS (
        SELECT 1 FROM kpi_cards k2
        WHERE k2.organization_id = org_id
        AND k2.kpi_key = 'comparison.mtd_distance'
        AND k2.kpi_value_raw > 0
    );
    
    -- Clean up MTD Profit duplicates
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key = 'comparison.mtd_profit'
    AND kpi_value_raw = 0
    AND EXISTS (
        SELECT 1 FROM kpi_cards k2
        WHERE k2.organization_id = org_id
        AND k2.kpi_key = 'comparison.mtd_profit'
        AND k2.kpi_value_raw > 0
    );
    
    -- Clean up Week-over-Week Distance duplicates
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key = 'comparison.wow_distance'
    AND kpi_value_raw = 0
    AND EXISTS (
        SELECT 1 FROM kpi_cards k2
        WHERE k2.organization_id = org_id
        AND k2.kpi_key = 'comparison.wow_distance'
        AND k2.kpi_value_raw > 0
    );
    
    -- Clean up Week-over-Week Trips duplicates
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key = 'comparison.wow_trips'
    AND kpi_value_raw = 0
    AND EXISTS (
        SELECT 1 FROM kpi_cards k2
        WHERE k2.organization_id = org_id
        AND k2.kpi_key = 'comparison.wow_trips'
        AND k2.kpi_value_raw > 0
    );
    
    -- Clean up zero-value efficiency KPIs
    DELETE FROM kpi_cards
    WHERE organization_id = org_id
    AND kpi_key IN ('efficiency.fuel_trend', 'efficiency.cost_per_km')
    AND (kpi_value_raw = 0 OR kpi_value_raw IS NULL);
    
    RAISE NOTICE 'Cleaned up duplicate KPI entries';
END $$;

-- Now clean up for ALL organizations
DO $$
DECLARE
    org_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR org_record IN SELECT DISTINCT organization_id FROM kpi_cards LOOP
        -- Remove zero-value duplicates for each organization
        DELETE FROM kpi_cards
        WHERE organization_id = org_record.organization_id
        AND kpi_key LIKE 'comparison.%'
        AND kpi_value_raw = 0
        AND EXISTS (
            SELECT 1 FROM kpi_cards k2
            WHERE k2.organization_id = org_record.organization_id
            AND k2.kpi_key = kpi_cards.kpi_key
            AND k2.kpi_value_raw > 0
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Deleted % duplicate KPIs for organization %', deleted_count, org_record.organization_id;
        END IF;
    END LOOP;
END $$;

-- Show current comparative KPIs after cleanup
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw,
    computed_at,
    theme
FROM kpi_cards
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
AND (kpi_key LIKE 'comparison.%' OR kpi_key LIKE 'performance.%' OR kpi_key LIKE 'efficiency.%')
ORDER BY 
    CASE 
        WHEN kpi_value_raw > 0 THEN 0  -- Non-zero values first
        ELSE 1
    END,
    kpi_key;
