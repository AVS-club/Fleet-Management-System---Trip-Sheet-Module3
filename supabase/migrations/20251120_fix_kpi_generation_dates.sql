-- Fix the generate_kpi_cards function to handle date mismatches
-- This updates the function to be more flexible with dates

CREATE OR REPLACE FUNCTION public.generate_kpi_cards()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    org_record RECORD;
    org_id UUID;
    
    -- Metrics
    today_distance DECIMAL;
    today_trips INTEGER;
    week_distance DECIMAL;
    week_trips INTEGER;
    month_distance DECIMAL;
    month_trips INTEGER;
    month_revenue DECIMAL;
    month_profit DECIMAL;
    fleet_utilization DECIMAL;
    active_drivers INTEGER;
    total_drivers INTEGER;
    active_vehicles INTEGER;
    total_vehicles INTEGER;
    
    cards_created INTEGER := 0;
BEGIN
    -- Process each organization
    FOR org_record IN SELECT id FROM organizations LOOP
        org_id := org_record.id;
        
        -- Calculate TODAY metrics (with fallback to most recent day with data)
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO today_distance, today_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) = (
            -- Use today if there's data, otherwise use the most recent day with data
            SELECT COALESCE(
                (SELECT DATE(COALESCE(trip_start_date, created_at)) 
                 FROM trips 
                 WHERE organization_id = org_id 
                 AND DATE(COALESCE(trip_start_date, created_at)) = CURRENT_DATE 
                 LIMIT 1),
                (SELECT MAX(DATE(COALESCE(trip_start_date, created_at))) 
                 FROM trips 
                 WHERE organization_id = org_id)
            )
        );
        
        -- Calculate WEEK metrics (last 7 days from most recent data)
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO week_distance, week_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= (
            SELECT COALESCE(MAX(DATE(created_at)), CURRENT_DATE) - INTERVAL '7 days'
            FROM trips WHERE organization_id = org_id
        );
        
        -- Calculate MONTH metrics (last 30 days from most recent data)
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*),
            COALESCE(SUM(income_amount), 0),
            COALESCE(SUM(net_profit), 0)
        INTO month_distance, month_trips, month_revenue, month_profit
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= (
            SELECT COALESCE(MAX(DATE(created_at)), CURRENT_DATE) - INTERVAL '30 days'
            FROM trips WHERE organization_id = org_id
        );
        
        -- Calculate fleet utilization (vehicles used in last 30 days)
        SELECT COUNT(*) INTO total_vehicles FROM vehicles WHERE organization_id = org_id;
        SELECT COUNT(DISTINCT vehicle_id) INTO active_vehicles 
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= (
            SELECT COALESCE(MAX(DATE(created_at)), CURRENT_DATE) - INTERVAL '30 days'
            FROM trips WHERE organization_id = org_id
        );
        
        IF total_vehicles > 0 THEN
            fleet_utilization := ROUND((active_vehicles::DECIMAL / total_vehicles) * 100, 1);
        ELSE
            fleet_utilization := 0;
        END IF;
        
        -- Calculate active drivers (drivers with trips in last 30 days)
        SELECT COUNT(*) INTO total_drivers FROM drivers WHERE organization_id = org_id;
        SELECT COUNT(DISTINCT driver_id) INTO active_drivers 
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= (
            SELECT COALESCE(MAX(DATE(created_at)), CURRENT_DATE) - INTERVAL '30 days'
            FROM trips WHERE organization_id = org_id
        );
        
        -- Insert/Update KPIs
        -- Today's Distance
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'today.distance',
            'Today''s Distance',
            today_distance::TEXT || ' km',
            today_distance,
            jsonb_build_object('distance_km', today_distance, 'period', 'today'),
            'primary',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Today's Trips
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'today.trips',
            'Today''s Trips',
            today_trips::TEXT || ' trips',
            today_trips,
            jsonb_build_object('count', today_trips, 'period', 'today'),
            'success',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Week's Distance
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'week.distance',
            'This Week''s Distance',
            week_distance::TEXT || ' km',
            week_distance,
            jsonb_build_object('distance_km', week_distance, 'period', 'week'),
            'info',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Monthly Trips
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'month.trips',
            'Monthly Trips',
            month_trips::TEXT || ' trips',
            month_trips,
            jsonb_build_object('count', month_trips, 'period', 'month'),
            'warning',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Monthly Revenue
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'month.revenue',
            'Monthly Revenue',
            '₹' || month_revenue::TEXT,
            month_revenue,
            jsonb_build_object('revenue', month_revenue, 'period', 'month'),
            'success',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Monthly Net P&L
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'month.pnl',
            'Monthly Net P&L',
            '₹' || month_profit::TEXT,
            month_profit,
            jsonb_build_object('profit', month_profit, 'period', 'month'),
            CASE WHEN month_profit >= 0 THEN 'success' ELSE 'danger' END,
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Fleet Utilization
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'current.fleet_utilization',
            'Fleet Utilization',
            fleet_utilization::TEXT || '%',
            fleet_utilization,
            jsonb_build_object('utilization_percent', fleet_utilization, 'active_vehicles', active_vehicles, 'total_vehicles', total_vehicles),
            'primary',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Active Drivers
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'current.active_drivers',
            'Active Drivers',
            active_drivers::TEXT || ' / ' || total_drivers::TEXT,
            active_drivers,
            jsonb_build_object('active_drivers', active_drivers, 'total_drivers', total_drivers),
            'info',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        cards_created := cards_created + 8;
    END LOOP;
    
    RETURN jsonb_build_object('cards_created', cards_created);
END;
$$;

-- Run the function immediately to populate with correct data
SELECT generate_kpi_cards();
