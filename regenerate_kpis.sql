-- ================================================================
-- QUICK KPI REGENERATION SCRIPT
-- ================================================================
-- Run this anytime to refresh KPIs with latest data
-- This is the same logic as the full script but simplified
-- ================================================================

DO $$
DECLARE
  org_record RECORD;
  org_id UUID;

  -- Today's metrics
  today_distance INTEGER;
  today_trips INTEGER;
  today_profit NUMERIC;
  today_active_vehicles INTEGER;

  -- Yesterday's metrics
  yesterday_distance INTEGER;
  yesterday_trips INTEGER;
  yesterday_profit NUMERIC;

  -- Week metrics
  week_distance INTEGER;
  week_trips INTEGER;
  week_profit NUMERIC;
  week_avg_mileage NUMERIC;
  last_week_distance INTEGER;
  last_week_trips INTEGER;
  last_week_profit NUMERIC;
  last_week_avg_mileage NUMERIC;

  -- Month metrics
  month_distance INTEGER;
  month_trips INTEGER;
  month_revenue NUMERIC;
  month_expenses NUMERIC;
  month_profit NUMERIC;
  month_avg_mileage NUMERIC;
  last_month_distance INTEGER;
  last_month_trips INTEGER;
  last_month_profit NUMERIC;
  last_month_avg_mileage NUMERIC;

  -- Fleet metrics
  total_vehicles INTEGER;
  active_vehicles INTEGER;
  total_drivers INTEGER;
  active_drivers INTEGER;

  -- Calculation variables
  distance_change NUMERIC;
  trips_change NUMERIC;
  profit_change NUMERIC;
  mileage_change NUMERIC;

  total_kpi_count INTEGER := 0;

BEGIN
  RAISE NOTICE '🔄 Starting KPI Regeneration...';
  RAISE NOTICE '';

  -- Loop through ALL organizations
  FOR org_record IN SELECT id, name FROM public.organizations ORDER BY created_at LOOP
    org_id := org_record.id;

    RAISE NOTICE '📊 Processing: % (%)', org_record.name, org_id;

    -- DELETE old KPIs for this organization (keep fresh data only)
    DELETE FROM public.kpi_cards WHERE organization_id = org_id;

    -- TODAY'S DATA
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(COUNT(DISTINCT vehicle_id), 0)
    INTO today_distance, today_trips, today_profit, today_active_vehicles
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= CURRENT_DATE
      AND trip_start_date < CURRENT_DATE + INTERVAL '1 day';

    -- YESTERDAY'S DATA
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0)
    INTO yesterday_distance, yesterday_trips, yesterday_profit
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= CURRENT_DATE - INTERVAL '1 day'
      AND trip_start_date < CURRENT_DATE;

    -- THIS WEEK'S DATA
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO week_distance, week_trips, week_profit, week_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)
      AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';

    -- LAST WEEK'S DATA
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO last_week_distance, last_week_trips, last_week_profit, last_week_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
      AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE);

    -- THIS MONTH'S DATA
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(income_amount), 0),
      COALESCE(SUM(total_expense), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO month_distance, month_trips, month_revenue, month_expenses, month_profit, month_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

    -- LAST MONTH'S DATA
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO last_month_distance, last_month_trips, last_month_profit, last_month_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE);

    -- FLEET COUNTS
    SELECT COUNT(*) INTO total_vehicles FROM public.vehicles WHERE organization_id = org_id;
    SELECT COUNT(*) INTO active_vehicles FROM public.vehicles WHERE organization_id = org_id AND status = 'active';
    SELECT COUNT(*) INTO total_drivers FROM public.drivers WHERE organization_id = org_id;
    SELECT COUNT(*) INTO active_drivers FROM public.drivers WHERE organization_id = org_id AND status = 'active';

    -- CALCULATE CHANGES
    distance_change := CASE WHEN yesterday_distance > 0
      THEN ROUND(((today_distance - yesterday_distance)::NUMERIC / yesterday_distance::NUMERIC) * 100, 1)
      ELSE 0 END;

    trips_change := CASE WHEN yesterday_trips > 0
      THEN ROUND(((today_trips - yesterday_trips)::NUMERIC / yesterday_trips::NUMERIC) * 100, 1)
      ELSE 0 END;

    profit_change := CASE WHEN yesterday_profit > 0
      THEN ROUND(((today_profit - yesterday_profit)::NUMERIC / yesterday_profit::NUMERIC) * 100, 1)
      ELSE 0 END;

    -- INSERT DAILY KPIs
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('daily.distance.today', 'Today''s Distance', today_distance || ' km',
     jsonb_build_object('type', 'kpi', 'value', today_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'Today vs Yesterday'),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('daily.trips.today', 'Today''s Trips', today_trips || ' trips',
     jsonb_build_object('type', 'kpi', 'value', today_trips, 'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'Today vs Yesterday'),
     'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('daily.profit.today', 'Today''s P&L', '₹' || ROUND(today_profit),
     jsonb_build_object('type', 'kpi', 'value', ROUND(today_profit), 'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'Today vs Yesterday'),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    -- WEEKLY KPIs
    distance_change := CASE WHEN last_week_distance > 0
      THEN ROUND(((week_distance - last_week_distance)::NUMERIC / last_week_distance::NUMERIC) * 100, 1)
      ELSE 0 END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('weekly.distance', 'This Week''s Distance', week_distance || ' km',
     jsonb_build_object('type', 'kpi', 'value', week_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'This Week vs Last Week'),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    -- MONTHLY KPIs
    distance_change := CASE WHEN last_month_distance > 0
      THEN ROUND(((month_distance - last_month_distance)::NUMERIC / last_month_distance::NUMERIC) * 100, 1)
      ELSE 0 END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('monthly.distance', 'Monthly Distance', month_distance || ' km',
     jsonb_build_object('type', 'kpi', 'value', month_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'This Month vs Last Month'),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('monthly.trips', 'Monthly Trips', month_trips || ' trips',
     jsonb_build_object('type', 'kpi', 'value', month_trips, 'unit', 'trips',
       'period', 'This Month'),
     'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('monthly.revenue', 'Monthly Revenue', '₹' || ROUND(month_revenue),
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_revenue), 'unit', '₹',
       'period', 'This Month'),
     'revenue', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('monthly.profit', 'Monthly Net P&L', '₹' || ROUND(month_profit),
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_profit), 'unit', '₹',
       'period', 'This Month'),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    -- FLEET UTILIZATION
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES
    ('fleet.utilization', 'Fleet Utilization',
     CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) || '%' ELSE '0%' END,
     jsonb_build_object('type', 'kpi',
       'value', CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) ELSE 0 END,
       'unit', '%', 'period', 'Current'),
     'utilization', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload, computed_at = NOW();

    total_kpi_count := total_kpi_count + 8;
    RAISE NOTICE '   ✅ Generated 8 KPI cards';

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ KPI REGENERATION COMPLETE!';
  RAISE NOTICE 'Total KPIs Generated: %', total_kpi_count;
  RAISE NOTICE '========================================';

END $$;
