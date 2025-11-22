-- ================================================================
-- FINAL KPI FIX - Use Current 2025 Data
-- ================================================================
-- This fixes the KPI functions to properly show your 2025 data
-- ================================================================

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

    cards_created := cards_created + 8;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cards_created', cards_created,
    'message', 'KPI cards generated successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO service_role;

COMMENT ON FUNCTION public.generate_kpi_cards() IS 'Generates or refreshes KPI dashboard cards for all organizations. Called by the refresh-kpis edge function and GitHub Actions workflow.';

-- Test it immediately
SELECT generate_kpi_cards();

-- Verify the results
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_value_raw,
    TO_CHAR(computed_at, 'HH24:MI:SS') as time_generated
FROM kpi_cards
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
ORDER BY 
    CASE 
        WHEN kpi_key LIKE 'today.%' THEN 1
        WHEN kpi_key LIKE 'week.%' THEN 2
        WHEN kpi_key LIKE 'month.%' THEN 3
        WHEN kpi_key LIKE 'current.%' THEN 4
        ELSE 5
    END,
    kpi_key;
