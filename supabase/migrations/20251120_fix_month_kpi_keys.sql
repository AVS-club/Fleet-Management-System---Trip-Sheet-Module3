-- Fix the month KPI keys - copy data from monthly.* to month.*
-- The frontend expects month.* keys, not monthly.*

DO $$
DECLARE
    org_id UUID := 'ab6c2178-32f9-4a03-b5ab-d535db827a58';
BEGIN
    -- Copy monthly.trips to month.trips
    UPDATE kpi_cards 
    SET 
        kpi_value_human = src.kpi_value_human,
        kpi_value_raw = src.kpi_value_raw,
        kpi_payload = src.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW()
    FROM (
        SELECT kpi_value_human, kpi_value_raw, kpi_payload 
        FROM kpi_cards 
        WHERE kpi_key = 'monthly.trips' 
        AND organization_id = org_id
    ) AS src
    WHERE kpi_cards.kpi_key = 'month.trips' 
    AND kpi_cards.organization_id = org_id;

    -- Copy monthly.revenue to month.revenue
    UPDATE kpi_cards 
    SET 
        kpi_value_human = src.kpi_value_human,
        kpi_value_raw = src.kpi_value_raw,
        kpi_payload = src.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW()
    FROM (
        SELECT kpi_value_human, kpi_value_raw, kpi_payload 
        FROM kpi_cards 
        WHERE kpi_key = 'monthly.revenue' 
        AND organization_id = org_id
    ) AS src
    WHERE kpi_cards.kpi_key = 'month.revenue' 
    AND kpi_cards.organization_id = org_id;

    -- Copy monthly.profit to month.pnl
    UPDATE kpi_cards 
    SET 
        kpi_value_human = src.kpi_value_human,
        kpi_value_raw = src.kpi_value_raw,
        kpi_payload = src.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW()
    FROM (
        SELECT kpi_value_human, kpi_value_raw, kpi_payload 
        FROM kpi_cards 
        WHERE kpi_key = 'monthly.profit' 
        AND organization_id = org_id
    ) AS src
    WHERE kpi_cards.kpi_key = 'month.pnl' 
    AND kpi_cards.organization_id = org_id;

    -- Also copy weekly.distance to week.distance if needed
    UPDATE kpi_cards 
    SET 
        kpi_value_human = src.kpi_value_human,
        kpi_value_raw = src.kpi_value_raw,
        kpi_payload = src.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW()
    FROM (
        SELECT kpi_value_human, kpi_value_raw, kpi_payload 
        FROM kpi_cards 
        WHERE kpi_key = 'weekly.distance' 
        AND organization_id = org_id
    ) AS src
    WHERE kpi_cards.kpi_key = 'week.distance' 
    AND kpi_cards.organization_id = org_id;

    -- Copy fleet.utilization to current.fleet_utilization if it has better data
    UPDATE kpi_cards 
    SET 
        kpi_value_human = src.kpi_value_human,
        kpi_value_raw = src.kpi_value_raw,
        kpi_payload = src.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW()
    FROM (
        SELECT kpi_value_human, kpi_value_raw, kpi_payload 
        FROM kpi_cards 
        WHERE kpi_key = 'fleet.utilization' 
        AND organization_id = org_id
        AND kpi_value_raw > 0
    ) AS src
    WHERE kpi_cards.kpi_key = 'current.fleet_utilization' 
    AND kpi_cards.organization_id = org_id
    AND src.kpi_value_raw IS NOT NULL;

    -- Clean up duplicate keys - delete the old format ones
    DELETE FROM kpi_cards 
    WHERE organization_id = org_id 
    AND kpi_key IN ('monthly.trips', 'monthly.revenue', 'monthly.profit', 'weekly.distance', 'fleet.utilization', 'fleet.active_drivers');

    RAISE NOTICE 'KPI keys fixed and duplicates removed';
END $$;

-- Show the final correct KPIs
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw
FROM kpi_cards
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
AND kpi_key IN (
    'today.distance',
    'today.trips', 
    'week.distance',
    'month.trips',
    'month.revenue',
    'month.pnl',
    'current.fleet_utilization',
    'current.active_drivers'
)
ORDER BY 
    CASE kpi_key 
        WHEN 'today.distance' THEN 1
        WHEN 'today.trips' THEN 2
        WHEN 'week.distance' THEN 3
        WHEN 'month.trips' THEN 4
        WHEN 'month.revenue' THEN 5
        WHEN 'month.pnl' THEN 6
        WHEN 'current.fleet_utilization' THEN 7
        WHEN 'current.active_drivers' THEN 8
    END;
