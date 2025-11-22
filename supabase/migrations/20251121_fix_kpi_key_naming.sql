-- Fix KPI Key Naming: Migrate from weekly.* and monthly.* to week.* and month.*
-- This ensures consistency with the frontend expectations

-- Step 1: Copy data from old keys to new keys (if they don't already exist)
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT DISTINCT organization_id FROM kpi_cards LOOP
        -- Copy weekly.distance to week.distance
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at, created_at, updated_at)
        SELECT 
            'week.distance',
            kpi_title,
            kpi_value_human,
            kpi_value_raw,
            kpi_payload,
            'info',
            organization_id,
            computed_at,
            created_at,
            updated_at
        FROM kpi_cards
        WHERE kpi_key = 'weekly.distance' 
        AND organization_id = org_record.organization_id
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            computed_at = EXCLUDED.computed_at,
            updated_at = NOW();

        -- Copy monthly.trips to month.trips
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at, created_at, updated_at)
        SELECT 
            'month.trips',
            kpi_title,
            kpi_value_human,
            kpi_value_raw,
            kpi_payload,
            'warning',
            organization_id,
            computed_at,
            created_at,
            updated_at
        FROM kpi_cards
        WHERE kpi_key = 'monthly.trips' 
        AND organization_id = org_record.organization_id
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            computed_at = EXCLUDED.computed_at,
            updated_at = NOW();

        -- Copy monthly.revenue to month.revenue
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at, created_at, updated_at)
        SELECT 
            'month.revenue',
            kpi_title,
            kpi_value_human,
            kpi_value_raw,
            kpi_payload,
            'success',
            organization_id,
            computed_at,
            created_at,
            updated_at
        FROM kpi_cards
        WHERE kpi_key = 'monthly.revenue' 
        AND organization_id = org_record.organization_id
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            computed_at = EXCLUDED.computed_at,
            updated_at = NOW();

        -- Copy monthly.profit to month.pnl
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at, created_at, updated_at)
        SELECT 
            'month.pnl',
            kpi_title,
            kpi_value_human,
            kpi_value_raw,
            kpi_payload,
            'success',
            organization_id,
            computed_at,
            created_at,
            updated_at
        FROM kpi_cards
        WHERE kpi_key = 'monthly.profit' 
        AND organization_id = org_record.organization_id
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            computed_at = EXCLUDED.computed_at,
            updated_at = NOW();

        -- Copy fleet.utilization to current.fleet_utilization
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at, created_at, updated_at)
        SELECT 
            'current.fleet_utilization',
            kpi_title,
            kpi_value_human,
            kpi_value_raw,
            kpi_payload,
            'primary',
            organization_id,
            computed_at,
            created_at,
            updated_at
        FROM kpi_cards
        WHERE kpi_key = 'fleet.utilization' 
        AND organization_id = org_record.organization_id
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            computed_at = EXCLUDED.computed_at,
            updated_at = NOW();

        -- Copy fleet.active_drivers to current.active_drivers
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at, created_at, updated_at)
        SELECT 
            'current.active_drivers',
            kpi_title,
            kpi_value_human,
            kpi_value_raw,
            kpi_payload,
            'info',
            organization_id,
            computed_at,
            created_at,
            updated_at
        FROM kpi_cards
        WHERE kpi_key = 'fleet.active_drivers' 
        AND organization_id = org_record.organization_id
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            computed_at = EXCLUDED.computed_at,
            updated_at = NOW();
    END LOOP;
END $$;

-- Step 2: Delete old keys with incorrect naming
DELETE FROM kpi_cards WHERE kpi_key IN (
    'weekly.distance',
    'monthly.trips',
    'monthly.revenue',
    'monthly.profit',
    'fleet.utilization',
    'fleet.active_drivers'
);

-- Step 3: Log the fix
DO $$
BEGIN
    RAISE NOTICE 'KPI key naming fixed: Migrated from weekly.*/monthly.*/fleet.* to week.*/month.*/current.* format';
END $$;

