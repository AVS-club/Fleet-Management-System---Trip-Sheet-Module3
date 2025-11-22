-- ================================================================
-- PERMANENT FIX FOR KPI DATE ISSUES
-- ================================================================
-- This solution dynamically adapts to your data's actual dates
-- Works with both current and historical data
-- ================================================================

-- Drop and recreate the function with intelligent date handling
DROP FUNCTION IF EXISTS public.generate_kpi_cards();

CREATE OR REPLACE FUNCTION public.generate_kpi_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  org_id UUID;
  cards_created INTEGER := 0;
  
  -- Date range variables
  latest_trip_date DATE;
  reference_date DATE;
  data_is_current BOOLEAN;
  
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
  -- Loop through ALL organizations
  FOR org_record IN SELECT id, name FROM public.organizations ORDER BY created_at LOOP
    org_id := org_record.id;
    
    -- INTELLIGENT DATE DETECTION
    -- Find the most recent trip date for this organization
    SELECT MAX(trip_start_date) INTO latest_trip_date
    FROM public.trips
    WHERE organization_id = org_id;
    
    -- If no trips found, try without organization filter
    IF latest_trip_date IS NULL THEN
      SELECT MAX(trip_start_date) INTO latest_trip_date
      FROM public.trips;
    END IF;
    
    -- Determine reference date and if data is current
    IF latest_trip_date IS NULL THEN
      -- No trips at all, use current date
      reference_date := CURRENT_DATE;
      data_is_current := true;
    ELSIF latest_trip_date >= CURRENT_DATE - INTERVAL '7 days' THEN
      -- Data is recent (within last week), use current date
      reference_date := CURRENT_DATE;
      data_is_current := true;
    ELSE
      -- Data is historical, use the latest trip date as reference
      reference_date := latest_trip_date;
      data_is_current := false;
    END IF;
    
    -- Calculate TODAY'S metrics (relative to reference date)
    SELECT
      COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(COUNT(DISTINCT vehicle_id), 0)
    INTO today_distance, today_trips, today_profit, today_active_vehicles
    FROM public.trips
    WHERE (organization_id = org_id OR organization_id IS NULL)
      AND DATE(trip_start_date) = reference_date;
    
    -- If no data for "today", look for most recent day with data
    IF today_trips = 0 AND latest_trip_date IS NOT NULL THEN
      SELECT
        COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(net_profit), 0),
        COALESCE(COUNT(DISTINCT vehicle_id), 0)
      INTO today_distance, today_trips, today_profit, today_active_vehicles
      FROM public.trips
      WHERE (organization_id = org_id OR organization_id IS NULL)
        AND DATE(trip_start_date) = latest_trip_date;
    END IF;
    
    -- Calculate THIS WEEK'S metrics (relative to reference date)
    SELECT
      COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0)
    INTO week_distance, week_trips, week_profit
    FROM public.trips
    WHERE (organization_id = org_id OR organization_id IS NULL)
      AND DATE(trip_start_date) >= DATE_TRUNC('week', reference_date)
      AND DATE(trip_start_date) < DATE_TRUNC('week', reference_date) + INTERVAL '1 week';
    
    -- Calculate THIS MONTH'S metrics (relative to reference date)
    SELECT
      COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(income_amount), 0),
      COALESCE(SUM(total_expense), 0),
      COALESCE(SUM(net_profit), 0)
    INTO month_distance, month_trips, month_revenue, month_expenses, month_profit
    FROM public.trips
    WHERE (organization_id = org_id OR organization_id IS NULL)
      AND DATE(trip_start_date) >= DATE_TRUNC('month', reference_date)
      AND DATE(trip_start_date) < DATE_TRUNC('month', reference_date) + INTERVAL '1 month';
    
    -- Calculate FLEET metrics (always current)
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL)
    INTO total_vehicles, active_vehicles
    FROM public.vehicles
    WHERE organization_id = org_id OR organization_id IS NULL;
    
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL)
    INTO total_drivers, active_drivers
    FROM public.drivers
    WHERE organization_id = org_id OR organization_id IS NULL;
    
    -- Insert/Update KPI cards
    -- Today's Distance
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw, 
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'today.distance', 
      CASE WHEN data_is_current THEN 'Today''s Distance' 
           ELSE 'Latest Day Distance (' || TO_CHAR(reference_date, 'Mon DD') || ')' END,
      today_distance || ' km', 
      today_distance,
      jsonb_build_object(
        'type', 'kpi', 
        'value', today_distance, 
        'unit', 'km', 
        'period', CASE WHEN data_is_current THEN 'Today' ELSE TO_CHAR(reference_date, 'YYYY-MM-DD') END,
        'is_historical', NOT data_is_current
      ),
      'primary', 
      org_id, 
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Today's Trips
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'today.trips',
      CASE WHEN data_is_current THEN 'Today''s Trips'
           ELSE 'Latest Day Trips (' || TO_CHAR(reference_date, 'Mon DD') || ')' END,
      today_trips || ' trips',
      today_trips,
      jsonb_build_object(
        'type', 'kpi',
        'value', today_trips,
        'unit', 'trips',
        'period', CASE WHEN data_is_current THEN 'Today' ELSE TO_CHAR(reference_date, 'YYYY-MM-DD') END,
        'is_historical', NOT data_is_current
      ),
      'success',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Weekly Distance
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'week.distance',
      CASE WHEN data_is_current THEN 'This Week''s Distance'
           ELSE 'Week Distance (' || TO_CHAR(DATE_TRUNC('week', reference_date), 'Mon DD') || ')' END,
      week_distance || ' km',
      week_distance,
      jsonb_build_object(
        'type', 'kpi',
        'value', week_distance,
        'unit', 'km',
        'period', CASE WHEN data_is_current THEN 'This Week' 
                       ELSE TO_CHAR(DATE_TRUNC('week', reference_date), 'YYYY-MM-DD') END,
        'is_historical', NOT data_is_current
      ),
      'info',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Monthly Trips
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'month.trips',
      CASE WHEN data_is_current THEN 'Monthly Trips'
           ELSE TO_CHAR(reference_date, 'Month YYYY') || ' Trips' END,
      month_trips || ' trips',
      month_trips,
      jsonb_build_object(
        'type', 'kpi',
        'value', month_trips,
        'unit', 'trips',
        'period', CASE WHEN data_is_current THEN 'This Month'
                       ELSE TO_CHAR(reference_date, 'Month YYYY') END,
        'is_historical', NOT data_is_current
      ),
      'warning',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Monthly Revenue
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'month.revenue',
      CASE WHEN data_is_current THEN 'Monthly Revenue'
           ELSE TO_CHAR(reference_date, 'Month YYYY') || ' Revenue' END,
      '₹' || TO_CHAR(month_revenue, 'FM999,999,999'),
      month_revenue,
      jsonb_build_object(
        'type', 'kpi',
        'value', month_revenue,
        'unit', '₹',
        'period', CASE WHEN data_is_current THEN 'This Month'
                       ELSE TO_CHAR(reference_date, 'Month YYYY') END,
        'is_historical', NOT data_is_current
      ),
      'success',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Monthly Profit
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'month.pnl',
      CASE WHEN data_is_current THEN 'Monthly Net P&L'
           ELSE TO_CHAR(reference_date, 'Month YYYY') || ' Net P&L' END,
      '₹' || TO_CHAR(month_profit, 'FM999,999,999'),
      month_profit,
      jsonb_build_object(
        'type', 'kpi',
        'value', month_profit,
        'unit', '₹',
        'period', CASE WHEN data_is_current THEN 'This Month'
                       ELSE TO_CHAR(reference_date, 'Month YYYY') END,
        'is_historical', NOT data_is_current
      ),
      'success',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Fleet Utilization (always current)
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'current.fleet_utilization',
      'Fleet Utilization',
      CASE WHEN total_vehicles > 0 
           THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) || '%'
           ELSE '0%' END,
      CASE WHEN total_vehicles > 0 
           THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100)
           ELSE 0 END,
      jsonb_build_object(
        'type', 'kpi',
        'value', CASE WHEN total_vehicles > 0 
                      THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100)
                      ELSE 0 END,
        'unit', '%',
        'period', 'Current',
        'active', active_vehicles,
        'total', total_vehicles
      ),
      'primary',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();
    
    -- Active Drivers (always current)
    INSERT INTO public.kpi_cards (
      kpi_key, kpi_title, kpi_value_human, kpi_value_raw,
      kpi_payload, theme, organization_id, computed_at
    )
    VALUES (
      'current.active_drivers',
      'Active Drivers',
      active_drivers || ' / ' || total_drivers,
      active_drivers,
      jsonb_build_object(
        'type', 'kpi',
        'value', active_drivers,
        'total', total_drivers,
        'unit', 'drivers',
        'period', 'Current'
      ),
      'info',
      org_id,
      NOW()
    )
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_title = EXCLUDED.kpi_title,
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_value_raw = EXCLUDED.kpi_value_raw,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    cards_created := cards_created + 8;
  END LOOP;

  -- Return success response with diagnostic info
  RETURN jsonb_build_object(
    'success', true,
    'cards_created', cards_created,
    'message', 'KPI cards generated successfully',
    'latest_data_date', latest_trip_date,
    'using_historical_data', (latest_trip_date IS NOT NULL AND latest_trip_date < CURRENT_DATE - INTERVAL '7 days')
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.generate_kpi_cards() IS 
'Intelligent KPI generation that adapts to your data dates. 
Works with both current and historical data. 
Automatically detects if data is current (within 7 days) or historical.
Shows appropriate labels for historical data periods.';

-- Test the function immediately
SELECT generate_kpi_cards();
