-- ================================================================
-- NUCLEAR OPTION: Hardcode to process ONLY your organization
-- ================================================================
-- This ensures NO KPIs are created for test organizations
-- Guaranteed to fix the duplicate/zero issue
-- ================================================================

DROP FUNCTION IF EXISTS public.generate_kpi_cards();

CREATE OR REPLACE FUNCTION public.generate_kpi_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID := 'ab6c2178-32f9-4a03-b5ab-d535db827a58'; -- YOUR ORGANIZATION ONLY
  cards_created INTEGER := 0;
  
  -- Today's metrics
  today_distance INTEGER;
  today_trips INTEGER;
  today_profit NUMERIC;
  today_active_vehicles INTEGER;
  
  -- Week metrics
  week_distance INTEGER;
  week_trips INTEGER;
  week_profit NUMERIC;
  
  -- Month metrics
  month_distance INTEGER;
  month_trips INTEGER;
  month_revenue NUMERIC;
  month_expenses NUMERIC;
  month_profit NUMERIC;
  
  -- Fleet metrics
  total_vehicles INTEGER;
  active_vehicles INTEGER;
  total_drivers INTEGER;
  active_drivers INTEGER;

BEGIN
  -- ONLY process YOUR organization (hardcoded)
  
  -- Calculate TODAY'S metrics
  SELECT
    COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(net_profit), 0),
    COALESCE(COUNT(DISTINCT vehicle_id), 0)
  INTO today_distance, today_trips, today_profit, today_active_vehicles
  FROM public.trips
  WHERE organization_id = org_id
    AND DATE(trip_start_date) = CURRENT_DATE;
  
  -- Calculate THIS WEEK'S metrics
  SELECT
    COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(net_profit), 0)
  INTO week_distance, week_trips, week_profit
  FROM public.trips
  WHERE organization_id = org_id
    AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)
    AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';
  
  -- Calculate THIS MONTH'S metrics
  SELECT
    COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(income_amount), 0),
    COALESCE(SUM(total_expense), 0),
    COALESCE(SUM(net_profit), 0)
  INTO month_distance, month_trips, month_revenue, month_expenses, month_profit
  FROM public.trips
  WHERE organization_id = org_id
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  
  -- Calculate FLEET metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL)
  INTO total_vehicles, active_vehicles
  FROM public.vehicles
  WHERE organization_id = org_id;
  
  IF total_vehicles IS NULL THEN
    total_vehicles := 0;
    active_vehicles := 0;
  END IF;
  
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL)
  INTO total_drivers, active_drivers
  FROM public.drivers
  WHERE organization_id = org_id;
  
  IF total_drivers IS NULL THEN
    total_drivers := 0;
    active_drivers := 0;
  END IF;
  
  -- Insert/Update KPI cards with UPSERT
  
  -- Today's Distance
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('today.distance', 'Today''s Distance', today_distance || ' km', today_distance,
    jsonb_build_object('type', 'kpi', 'value', today_distance, 'unit', 'km', 'period', 'Today'),
    'primary', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Today's Trips
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('today.trips', 'Today''s Trips', today_trips || ' trips', today_trips,
    jsonb_build_object('type', 'kpi', 'value', today_trips, 'unit', 'trips', 'period', 'Today'),
    'success', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Weekly Distance
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('week.distance', 'This Week''s Distance', week_distance || ' km', week_distance,
    jsonb_build_object('type', 'kpi', 'value', week_distance, 'unit', 'km', 'period', 'This Week'),
    'info', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Monthly Trips
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('month.trips', 'Monthly Trips', month_trips || ' trips', month_trips,
    jsonb_build_object('type', 'kpi', 'value', month_trips, 'unit', 'trips', 'period', 'This Month'),
    'warning', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Monthly Revenue
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('month.revenue', 'Monthly Revenue', '₹' || TO_CHAR(month_revenue, 'FM999,999,999'), month_revenue,
    jsonb_build_object('type', 'kpi', 'value', month_revenue, 'unit', '₹', 'period', 'This Month'),
    'success', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Monthly Profit
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('month.pnl', 'Monthly Net P&L', '₹' || TO_CHAR(month_profit, 'FM999,999,999'), month_profit,
    jsonb_build_object('type', 'kpi', 'value', month_profit, 'unit', '₹', 'period', 'This Month'),
    'success', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Fleet Utilization
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('current.fleet_utilization', 'Fleet Utilization',
    CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) || '%' ELSE '0%' END,
    CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) ELSE 0 END,
    jsonb_build_object('type', 'kpi', 
      'value', CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) ELSE 0 END,
      'unit', '%', 'period', 'Current'),
    'primary', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();
  
  -- Active Drivers
  INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
  VALUES ('current.active_drivers', 'Active Drivers', active_drivers || ' / ' || total_drivers, active_drivers,
    jsonb_build_object('type', 'kpi', 'value', active_drivers, 'total', total_drivers, 'unit', 'drivers', 'period', 'Current'),
    'info', org_id, NOW())
  ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
    kpi_value_human = EXCLUDED.kpi_value_human,
    kpi_value_raw = EXCLUDED.kpi_value_raw,
    kpi_payload = EXCLUDED.kpi_payload,
    computed_at = NOW(),
    updated_at = NOW();

  cards_created := 8;

  RETURN jsonb_build_object(
    'success', true,
    'cards_created', cards_created,
    'organization_id', org_id,
    'message', 'KPI cards generated successfully for your organization only'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO service_role;

-- Now update comparative KPIs function
DROP FUNCTION IF EXISTS public.generate_comparative_kpis();

CREATE OR REPLACE FUNCTION public.generate_comparative_kpis()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    org_id UUID := 'ab6c2178-32f9-4a03-b5ab-d535db827a58'; -- YOUR ORGANIZATION ONLY
    
    -- Current period metrics
    current_mtd_revenue DECIMAL;
    current_mtd_trips INTEGER;
    current_mtd_distance DECIMAL;
    current_mtd_profit DECIMAL;
    current_week_distance DECIMAL;
    current_week_trips INTEGER;
    
    -- Previous period metrics
    prev_mtd_revenue DECIMAL;
    prev_mtd_trips INTEGER;
    prev_mtd_distance DECIMAL;
    prev_mtd_profit DECIMAL;
    prev_week_distance DECIMAL;
    prev_week_trips INTEGER;
    
    -- Comparison percentages
    revenue_change_pct DECIMAL;
    trips_change_pct DECIMAL;
    distance_change_pct DECIMAL;
    profit_change_pct DECIMAL;
    week_distance_change_pct DECIMAL;
    week_trips_change_pct DECIMAL;
    
    -- Top performers
    top_vehicle RECORD;
    top_driver RECORD;
    
    -- Efficiency metrics
    current_avg_kmpl DECIMAL;
    prev_avg_kmpl DECIMAL;
    current_cost_per_km DECIMAL;
    prev_cost_per_km DECIMAL;
    
    -- Date calculations
    current_day_of_month INTEGER;
    current_month_start DATE;
    prev_month_start DATE;
    prev_month_end DATE;
    current_week_start DATE;
    prev_week_start DATE;
    
    cards_created INTEGER := 0;
BEGIN
    -- Calculate date boundaries
    current_day_of_month := EXTRACT(DAY FROM CURRENT_DATE);
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    prev_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
    prev_month_end := prev_month_start + (current_day_of_month - 1) * INTERVAL '1 day';
    current_week_start := DATE_TRUNC('week', CURRENT_DATE);
    prev_week_start := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week');
    
    -- Get current month-to-date metrics for YOUR org only
    SELECT 
        COALESCE(SUM(income_amount), 0),
        COUNT(*),
        COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
        COALESCE(SUM(net_profit), 0)
    INTO current_mtd_revenue, current_mtd_trips, current_mtd_distance, current_mtd_profit
    FROM trips 
    WHERE organization_id = org_id
    AND DATE(trip_start_date) >= current_month_start
    AND DATE(trip_start_date) <= CURRENT_DATE;
    
    -- Get previous month-to-date metrics
    SELECT 
        COALESCE(SUM(income_amount), 0),
        COUNT(*),
        COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
        COALESCE(SUM(net_profit), 0)
    INTO prev_mtd_revenue, prev_mtd_trips, prev_mtd_distance, prev_mtd_profit
    FROM trips 
    WHERE organization_id = org_id
    AND DATE(trip_start_date) >= prev_month_start
    AND DATE(trip_start_date) <= prev_month_end;
    
    -- Get current week metrics
    SELECT 
        COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
        COUNT(*)
    INTO current_week_distance, current_week_trips
    FROM trips 
    WHERE organization_id = org_id
    AND DATE(trip_start_date) >= current_week_start
    AND DATE(trip_start_date) <= CURRENT_DATE;
    
    -- Get previous week metrics
    SELECT 
        COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
        COUNT(*)
    INTO prev_week_distance, prev_week_trips
    FROM trips 
    WHERE organization_id = org_id
    AND DATE(trip_start_date) >= prev_week_start
    AND DATE(trip_start_date) < current_week_start;
    
    -- Calculate percentage changes
    revenue_change_pct := CASE 
        WHEN prev_mtd_revenue = 0 THEN 
            CASE WHEN current_mtd_revenue > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((current_mtd_revenue - prev_mtd_revenue) / prev_mtd_revenue * 100)::NUMERIC, 1)
    END;
    
    trips_change_pct := CASE 
        WHEN prev_mtd_trips = 0 THEN 
            CASE WHEN current_mtd_trips > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((current_mtd_trips - prev_mtd_trips)::NUMERIC / prev_mtd_trips * 100), 1)
    END;
    
    distance_change_pct := CASE 
        WHEN prev_mtd_distance = 0 THEN 
            CASE WHEN current_mtd_distance > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((current_mtd_distance - prev_mtd_distance) / prev_mtd_distance * 100)::NUMERIC, 1)
    END;
    
    profit_change_pct := CASE 
        WHEN prev_mtd_profit = 0 THEN 
            CASE WHEN current_mtd_profit > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((current_mtd_profit - prev_mtd_profit) / prev_mtd_profit * 100)::NUMERIC, 1)
    END;
    
    week_distance_change_pct := CASE 
        WHEN prev_week_distance = 0 THEN 
            CASE WHEN current_week_distance > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((current_week_distance - prev_week_distance) / prev_week_distance * 100)::NUMERIC, 1)
    END;
    
    week_trips_change_pct := CASE 
        WHEN prev_week_trips = 0 THEN 
            CASE WHEN current_week_trips > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((current_week_trips - prev_week_trips)::NUMERIC / prev_week_trips * 100), 1)
    END;
    
    -- Get top vehicle this month
    SELECT 
        v.registration_number,
        COUNT(t.id) as trip_count,
        SUM(t.net_profit) as total_profit
    INTO top_vehicle
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.organization_id = org_id
    AND DATE(t.trip_start_date) >= current_month_start
    AND DATE(t.trip_start_date) <= CURRENT_DATE
    GROUP BY v.registration_number
    ORDER BY total_profit DESC NULLS LAST
    LIMIT 1;
    
    -- Get top driver this month
    SELECT 
        d.name,
        COUNT(t.id) as trip_count,
        SUM(t.net_profit) as total_profit
    INTO top_driver
    FROM trips t
    JOIN drivers d ON t.driver_id = d.id
    WHERE t.organization_id = org_id
    AND DATE(t.trip_start_date) >= current_month_start
    AND DATE(t.trip_start_date) <= CURRENT_DATE
    GROUP BY d.name
    ORDER BY total_profit DESC NULLS LAST
    LIMIT 1;
    
    -- Get efficiency metrics
    SELECT 
        AVG(NULLIF(calculated_kmpl, 0)),
        CASE WHEN SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END) > 0
             THEN SUM(total_expense) / NULLIF(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0)
             ELSE 0 END
    INTO current_avg_kmpl, current_cost_per_km
    FROM trips
    WHERE organization_id = org_id
    AND DATE(trip_start_date) >= current_month_start
    AND DATE(trip_start_date) <= CURRENT_DATE;
    
    SELECT 
        AVG(NULLIF(calculated_kmpl, 0)),
        CASE WHEN SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END) > 0
             THEN SUM(total_expense) / NULLIF(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0)
             ELSE 0 END
    INTO prev_avg_kmpl, prev_cost_per_km
    FROM trips
    WHERE organization_id = org_id
    AND DATE(trip_start_date) >= prev_month_start
    AND DATE(trip_start_date) <= prev_month_end;
    
    -- Insert all comparative KPIs (only for your org)
    
    -- MTD Revenue
    INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
    VALUES (
        'comparison.mtd_revenue',
        'MTD Revenue vs Last Month',
        '₹' || TO_CHAR(current_mtd_revenue, 'FM999,999,999') || ' (' || 
        CASE WHEN revenue_change_pct >= 0 THEN '+' ELSE '' END || revenue_change_pct::TEXT || '%)',
        current_mtd_revenue,
        jsonb_build_object(
            'current_value', current_mtd_revenue,
            'previous_value', prev_mtd_revenue,
            'change_percent', revenue_change_pct,
            'trend', CASE WHEN revenue_change_pct >= 0 THEN 'up' ELSE 'down' END,
            'comparison_type', 'month_to_date',
            'period', 'Day 1-' || current_day_of_month
        ),
        CASE WHEN revenue_change_pct >= 0 THEN 'success' ELSE 'danger' END,
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
    
    -- MTD Trips
    INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
    VALUES (
        'comparison.mtd_trips',
        'MTD Trips vs Last Month',
        current_mtd_trips::TEXT || ' trips (' || 
        CASE WHEN trips_change_pct >= 0 THEN '+' ELSE '' END || trips_change_pct::TEXT || '%)',
        current_mtd_trips,
        jsonb_build_object(
            'current_value', current_mtd_trips,
            'previous_value', prev_mtd_trips,
            'change_percent', trips_change_pct,
            'trend', CASE WHEN trips_change_pct >= 0 THEN 'up' ELSE 'down' END
        ),
        CASE WHEN trips_change_pct >= 0 THEN 'info' ELSE 'warning' END,
        org_id,
        NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
        kpi_value_human = EXCLUDED.kpi_value_human,
        kpi_value_raw = EXCLUDED.kpi_value_raw,
        kpi_payload = EXCLUDED.kpi_payload,
        theme = EXCLUDED.theme,
        updated_at = NOW(),
        computed_at = NOW();
    
    -- MTD Distance
    INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
    VALUES (
        'comparison.mtd_distance',
        'MTD Distance vs Last Month',
        TO_CHAR(current_mtd_distance, 'FM999,999') || ' km (' || 
        CASE WHEN distance_change_pct >= 0 THEN '+' ELSE '' END || distance_change_pct::TEXT || '%)',
        current_mtd_distance,
        jsonb_build_object(
            'current_value', current_mtd_distance,
            'previous_value', prev_mtd_distance,
            'change_percent', distance_change_pct
        ),
        CASE WHEN distance_change_pct >= 0 THEN 'primary' ELSE 'warning' END,
        org_id,
        NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
        kpi_value_human = EXCLUDED.kpi_value_human,
        kpi_value_raw = EXCLUDED.kpi_value_raw,
        kpi_payload = EXCLUDED.kpi_payload,
        theme = EXCLUDED.theme,
        updated_at = NOW(),
        computed_at = NOW();
    
    -- MTD Profit
    INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
    VALUES (
        'comparison.mtd_profit',
        'MTD Profit vs Last Month',
        '₹' || TO_CHAR(current_mtd_profit, 'FM999,999,999') || ' (' || 
        CASE WHEN profit_change_pct >= 0 THEN '+' ELSE '' END || profit_change_pct::TEXT || '%)',
        current_mtd_profit,
        jsonb_build_object(
            'current_value', current_mtd_profit,
            'previous_value', prev_mtd_profit,
            'change_percent', profit_change_pct
        ),
        CASE WHEN profit_change_pct >= 0 THEN 'success' ELSE 'danger' END,
        org_id,
        NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
        kpi_value_human = EXCLUDED.kpi_value_human,
        kpi_value_raw = EXCLUDED.kpi_value_raw,
        kpi_payload = EXCLUDED.kpi_payload,
        theme = EXCLUDED.theme,
        updated_at = NOW(),
        computed_at = NOW();
    
    -- WoW Distance
    INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
    VALUES (
        'comparison.wow_distance',
        'This Week vs Last Week Distance',
        TO_CHAR(current_week_distance, 'FM999,999') || ' km (' || 
        CASE WHEN week_distance_change_pct >= 0 THEN '+' ELSE '' END || week_distance_change_pct::TEXT || '%)',
        current_week_distance,
        jsonb_build_object(
            'current_value', current_week_distance,
            'previous_value', prev_week_distance,
            'change_percent', week_distance_change_pct
        ),
        'info',
        org_id,
        NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
        kpi_value_human = EXCLUDED.kpi_value_human,
        kpi_value_raw = EXCLUDED.kpi_value_raw,
        kpi_payload = EXCLUDED.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW();
    
    -- WoW Trips
    INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
    VALUES (
        'comparison.wow_trips',
        'This Week vs Last Week Trips',
        current_week_trips::TEXT || ' trips (' || 
        CASE WHEN week_trips_change_pct >= 0 THEN '+' ELSE '' END || week_trips_change_pct::TEXT || '%)',
        current_week_trips,
        jsonb_build_object(
            'current_value', current_week_trips,
            'previous_value', prev_week_trips,
            'change_percent', week_trips_change_pct
        ),
        'primary',
        org_id,
        NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
        kpi_value_human = EXCLUDED.kpi_value_human,
        kpi_value_raw = EXCLUDED.kpi_value_raw,
        kpi_payload = EXCLUDED.kpi_payload,
        updated_at = NOW(),
        computed_at = NOW();
    
    -- Top Vehicle (if exists)
    IF top_vehicle.registration_number IS NOT NULL THEN
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'performance.top_vehicle',
            'Top Vehicle This Month',
            top_vehicle.registration_number || ' (₹' || TO_CHAR(top_vehicle.total_profit, 'FM999,999') || ')',
            top_vehicle.total_profit,
            jsonb_build_object(
                'vehicle', top_vehicle.registration_number,
                'trip_count', top_vehicle.trip_count,
                'total_profit', top_vehicle.total_profit
            ),
            'primary',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        cards_created := cards_created + 1;
    END IF;
    
    -- Top Driver (if exists)
    IF top_driver.name IS NOT NULL THEN
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'performance.top_driver',
            'Top Driver This Month',
            top_driver.name || ' (₹' || TO_CHAR(top_driver.total_profit, 'FM999,999') || ')',
            top_driver.total_profit,
            jsonb_build_object(
                'driver', top_driver.name,
                'trip_count', top_driver.trip_count,
                'total_profit', top_driver.total_profit
            ),
            'success',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        cards_created := cards_created + 1;
    END IF;
    
    -- Fuel Efficiency
    IF current_avg_kmpl IS NOT NULL AND current_avg_kmpl > 0 THEN
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'efficiency.fuel_trend',
            'Fuel Efficiency Trend',
            ROUND(current_avg_kmpl, 2)::TEXT || ' km/L',
            ROUND(current_avg_kmpl, 2),
            jsonb_build_object(
                'current_value', ROUND(current_avg_kmpl, 2),
                'previous_value', ROUND(prev_avg_kmpl, 2)
            ),
            'info',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        cards_created := cards_created + 1;
    END IF;
    
    -- Cost per KM
    IF current_cost_per_km IS NOT NULL AND current_cost_per_km > 0 THEN
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'efficiency.cost_per_km',
            'Cost per KM',
            '₹' || ROUND(current_cost_per_km, 2)::TEXT || '/km',
            ROUND(current_cost_per_km, 2),
            jsonb_build_object(
                'current_value', ROUND(current_cost_per_km, 2),
                'previous_value', ROUND(prev_cost_per_km, 2)
            ),
            'info',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        cards_created := cards_created + 1;
    END IF;
    
    cards_created := cards_created + 6; -- Base comparisons
    
    RETURN jsonb_build_object(
        'success', true,
        'cards_created', cards_created,
        'organization_id', org_id,
        'message', 'Comparative KPIs generated successfully for your organization only'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_comparative_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_comparative_kpis() TO service_role;

-- Test both functions immediately
SELECT generate_kpi_cards();
SELECT generate_comparative_kpis();



