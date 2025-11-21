-- Fix KPI metrics showing zero values for ALL organizations
-- This comprehensive fix processes every organization in the system

-- First, let's diagnose the issue for all organizations
DO $$
DECLARE
    org_record RECORD;
    trip_count INTEGER;
    vehicle_count INTEGER;
    driver_count INTEGER;
    today_trips INTEGER;
    month_trips INTEGER;
    week_trips INTEGER;
BEGIN
    RAISE NOTICE '=== Checking all organizations ===';
    
    FOR org_record IN SELECT id, name FROM organizations LOOP
        -- Check basic counts
        SELECT COUNT(*) INTO trip_count FROM trips WHERE organization_id = org_record.id;
        SELECT COUNT(*) INTO vehicle_count FROM vehicles WHERE organization_id = org_record.id;
        SELECT COUNT(*) INTO driver_count FROM drivers WHERE organization_id = org_record.id;
        
        -- Only process if organization has data
        IF trip_count > 0 THEN
            -- Check date-based counts
            SELECT COUNT(*) INTO today_trips 
            FROM trips 
            WHERE organization_id = org_record.id 
            AND DATE(COALESCE(trip_start_date, created_at)) = CURRENT_DATE;
            
            SELECT COUNT(*) INTO week_trips 
            FROM trips 
            WHERE organization_id = org_record.id 
            AND DATE(COALESCE(trip_start_date, created_at)) >= DATE_TRUNC('week', CURRENT_DATE);
            
            SELECT COUNT(*) INTO month_trips 
            FROM trips 
            WHERE organization_id = org_record.id 
            AND DATE(COALESCE(trip_start_date, created_at)) >= DATE_TRUNC('month', CURRENT_DATE);
            
            RAISE NOTICE 'Organization: % (%)', org_record.name, org_record.id;
            RAISE NOTICE '  Total trips: %, Vehicles: %, Drivers: %', trip_count, vehicle_count, driver_count;
            RAISE NOTICE '  Today: %, This Week: %, This Month: %', today_trips, week_trips, month_trips;
        END IF;
    END LOOP;
END $$;

-- Now fix KPIs for ALL organizations
DO $$
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
    
    -- Date range
    latest_trip_date DATE;
    date_for_today DATE;
    date_for_week_start DATE;
    date_for_month_start DATE;
BEGIN
    RAISE NOTICE '=== Generating KPIs for all organizations ===';
    
    -- Process each organization
    FOR org_record IN SELECT id, name FROM organizations LOOP
        org_id := org_record.id;
        
        -- Get the latest trip date for this organization (to handle historical data)
        SELECT MAX(DATE(COALESCE(trip_start_date, created_at)))
        INTO latest_trip_date
        FROM trips
        WHERE organization_id = org_id;
        
        -- Skip if no trips
        IF latest_trip_date IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Use latest trip date as "today" if it's in the past
        IF latest_trip_date < CURRENT_DATE THEN
            date_for_today := latest_trip_date;
            date_for_week_start := latest_trip_date - INTERVAL '7 days';
            date_for_month_start := latest_trip_date - INTERVAL '30 days';
        ELSE
            date_for_today := CURRENT_DATE;
            date_for_week_start := CURRENT_DATE - INTERVAL '7 days';
            date_for_month_start := CURRENT_DATE - INTERVAL '30 days';
        END IF;
        
        -- Calculate TODAY metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO today_distance, today_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) = date_for_today;
        
        -- Calculate WEEK metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO week_distance, week_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= date_for_week_start;
        
        -- Calculate MONTH metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*),
            COALESCE(SUM(income_amount), 0),
            COALESCE(SUM(net_profit), 0)
        INTO month_distance, month_trips, month_revenue, month_profit
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= date_for_month_start;
        
        -- Calculate fleet utilization
        SELECT COUNT(*) INTO total_vehicles FROM vehicles WHERE organization_id = org_id;
        SELECT COUNT(DISTINCT vehicle_id) INTO active_vehicles 
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= date_for_month_start;
        
        IF total_vehicles > 0 THEN
            fleet_utilization := ROUND((active_vehicles::DECIMAL / total_vehicles) * 100, 1);
        ELSE
            fleet_utilization := 0;
        END IF;
        
        -- Calculate active drivers
        SELECT COUNT(*) INTO total_drivers FROM drivers WHERE organization_id = org_id;
        SELECT COUNT(DISTINCT driver_id) INTO active_drivers 
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= date_for_month_start;
        
        -- Insert/Update Today's Distance
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'today.distance',
            'Today''s Distance',
            today_distance::TEXT || ' km',
            today_distance,
            jsonb_build_object('distance_km', today_distance, 'period', 'today', 'date', date_for_today),
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
        
        -- Insert/Update Today's Trips
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'today.trips',
            'Today''s Trips',
            today_trips::TEXT || ' trips',
            today_trips,
            jsonb_build_object('count', today_trips, 'period', 'today', 'date', date_for_today),
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
        
        -- Insert/Update Week's Distance
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
        
        -- Insert/Update Monthly Trips
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
        
        -- Insert/Update Monthly Revenue
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
        
        -- Insert/Update Monthly P&L
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
        
        -- Insert/Update Fleet Utilization
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
        
        -- Insert/Update Active Drivers
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
        
        RAISE NOTICE 'Processed organization: % (%) - % KPIs updated', org_record.name, org_id, 8;
    END LOOP;
    
    RAISE NOTICE '=== KPI generation complete for all organizations ===';
END $$;

-- Show summary of what was generated
SELECT 
    o.name as organization_name,
    COUNT(k.kpi_key) as kpi_count,
    MAX(k.computed_at) as last_updated
FROM organizations o
LEFT JOIN kpi_cards k ON k.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;
