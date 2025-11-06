-- ================================================================
-- CREATE generate_kpi_cards() FUNCTION
-- ================================================================
-- This function generates all 22 KPI cards for all organizations
-- Can be called from Edge Functions or directly via: SELECT generate_kpi_cards();
-- Returns: { cards_created: number, execution_time_ms: number }
-- ================================================================

CREATE OR REPLACE FUNCTION generate_kpi_cards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_record RECORD;
  org_id UUID;
  start_time TIMESTAMP;
  end_time TIMESTAMP;

  -- Today's metrics
  today_distance INTEGER;
  today_trips INTEGER;
  today_fuel NUMERIC;
  today_profit NUMERIC;
  today_active_vehicles INTEGER;

  -- Yesterday's metrics
  yesterday_distance INTEGER;
  yesterday_trips INTEGER;
  yesterday_fuel NUMERIC;
  yesterday_profit NUMERIC;

  -- This week metrics
  week_distance INTEGER;
  week_trips INTEGER;
  week_fuel NUMERIC;
  week_profit NUMERIC;
  week_avg_mileage NUMERIC;

  -- Last week metrics
  last_week_distance INTEGER;
  last_week_trips INTEGER;
  last_week_profit NUMERIC;
  last_week_avg_mileage NUMERIC;

  -- This month metrics
  month_distance INTEGER;
  month_trips INTEGER;
  month_fuel NUMERIC;
  month_revenue NUMERIC;
  month_expenses NUMERIC;
  month_profit NUMERIC;
  month_avg_mileage NUMERIC;
  month_maintenance_cost NUMERIC;

  -- Last month metrics
  last_month_distance INTEGER;
  last_month_trips INTEGER;
  last_month_profit NUMERIC;
  last_month_avg_mileage NUMERIC;

  -- First 10 days comparison
  this_month_first10_distance INTEGER;
  last_month_first10_distance INTEGER;
  this_month_first10_trips INTEGER;
  last_month_first10_trips INTEGER;
  this_month_first10_profit NUMERIC;
  last_month_first10_profit NUMERIC;

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

  -- Counters
  org_count INTEGER := 0;
  total_kpi_count INTEGER := 0;

BEGIN
  start_time := clock_timestamp();

  -- ================================================================
  -- Loop through ALL organizations
  -- ================================================================

  FOR org_record IN SELECT id, name FROM public.organizations ORDER BY created_at LOOP
    org_id := org_record.id;
    org_count := org_count + 1;

    -- Clean old KPI data for THIS organization only (> 1 hour old)
    DELETE FROM public.kpi_cards
    WHERE organization_id = org_id
      AND computed_at < NOW() - INTERVAL '1 hour';

    -- ================================================================
    -- CALCULATE TODAY'S METRICS
    -- ================================================================

    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(total_fuel_cost), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(COUNT(DISTINCT vehicle_id), 0)
    INTO
      today_distance, today_trips, today_fuel, today_profit, today_active_vehicles
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= CURRENT_DATE
      AND trip_start_date < CURRENT_DATE + INTERVAL '1 day';

    -- ================================================================
    -- CALCULATE YESTERDAY'S METRICS
    -- ================================================================

    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(total_fuel_cost), 0),
      COALESCE(SUM(net_profit), 0)
    INTO
      yesterday_distance, yesterday_trips, yesterday_fuel, yesterday_profit
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= CURRENT_DATE - INTERVAL '1 day'
      AND trip_start_date < CURRENT_DATE;

    -- ================================================================
    -- CALCULATE THIS WEEK'S METRICS
    -- ================================================================

    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(total_fuel_cost), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO
      week_distance, week_trips, week_fuel, week_profit, week_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)
      AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';

    -- ================================================================
    -- CALCULATE LAST WEEK'S METRICS
    -- ================================================================

    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO
      last_week_distance, last_week_trips, last_week_profit, last_week_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
      AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE);

    -- ================================================================
    -- CALCULATE THIS MONTH'S METRICS
    -- ================================================================

    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(total_fuel_cost), 0),
      COALESCE(SUM(income_amount), 0),
      COALESCE(SUM(total_expense), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO
      month_distance, month_trips, month_fuel, month_revenue,
      month_expenses, month_profit, month_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

    -- ================================================================
    -- Calculate maintenance costs with NULL checks
    -- ================================================================

    SELECT COALESCE(SUM(mt.actual_cost), 0)
    INTO month_maintenance_cost
    FROM public.maintenance_tasks mt
    JOIN public.vehicles v ON mt.vehicle_id = v.id
    WHERE v.organization_id = org_id
      AND v.organization_id IS NOT NULL
      AND mt.vehicle_id IS NOT NULL
      AND mt.start_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND mt.start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

    -- ================================================================
    -- CALCULATE LAST MONTH'S METRICS
    -- ================================================================

    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0),
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0)
    INTO
      last_month_distance, last_month_trips, last_month_profit, last_month_avg_mileage
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE);

    -- ================================================================
    -- CALCULATE FIRST 10 DAYS COMPARISON
    -- ================================================================

    -- This month's first 10 days
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0)
    INTO
      this_month_first10_distance, this_month_first10_trips, this_month_first10_profit
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days';

    -- Last month's first 10 days
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0)
    INTO
      last_month_first10_distance, last_month_first10_trips, last_month_first10_profit
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND trip_start_date < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '10 days';

    -- ================================================================
    -- CALCULATE FLEET METRICS
    -- ================================================================

    SELECT COUNT(*) INTO total_vehicles
    FROM public.vehicles
    WHERE organization_id = org_id;

    SELECT COUNT(*) INTO active_vehicles
    FROM public.vehicles
    WHERE organization_id = org_id AND status = 'active';

    SELECT COUNT(*) INTO total_drivers
    FROM public.drivers
    WHERE organization_id = org_id;

    SELECT COUNT(*) INTO active_drivers
    FROM public.drivers
    WHERE organization_id = org_id AND status = 'active';

    -- ================================================================
    -- Safe percentage calculations with proper division protection
    -- ================================================================

    distance_change := CASE
      WHEN yesterday_distance > 0 AND today_distance IS NOT NULL
      THEN ROUND(((today_distance - yesterday_distance)::NUMERIC / yesterday_distance::NUMERIC) * 100, 1)
      ELSE 0
    END;

    trips_change := CASE
      WHEN yesterday_trips > 0 AND today_trips IS NOT NULL
      THEN ROUND(((today_trips - yesterday_trips)::NUMERIC / yesterday_trips::NUMERIC) * 100, 1)
      ELSE 0
    END;

    profit_change := CASE
      WHEN yesterday_profit > 0 AND today_profit IS NOT NULL
      THEN ROUND(((today_profit - yesterday_profit)::NUMERIC / yesterday_profit::NUMERIC) * 100, 1)
      ELSE 0
    END;

    -- ================================================================
    -- INSERT KPI CARDS WITH ON CONFLICT (UPSERT) - DAILY METRICS
    -- ================================================================

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.distance.today', 'Today''s Distance',
     today_distance || ' km',
     jsonb_build_object(
       'type', 'kpi', 'value', today_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'Today vs Yesterday', 'comparison', jsonb_build_object('yesterday', yesterday_distance)
     ), 'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.trips.today', 'Today''s Trips', today_trips || ' trips',
     jsonb_build_object('type', 'kpi', 'value', today_trips, 'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'Today vs Yesterday', 'comparison', jsonb_build_object('yesterday', yesterday_trips)
     ), 'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.profit.today', 'Today''s P&L', '₹' || ROUND(today_profit),
     jsonb_build_object('type', 'kpi', 'value', ROUND(today_profit), 'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'Today vs Yesterday', 'comparison', jsonb_build_object('yesterday', ROUND(yesterday_profit))
     ), 'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.active_vehicles', 'Active Vehicles', today_active_vehicles || ' / ' || total_vehicles,
     jsonb_build_object('type', 'kpi', 'value', today_active_vehicles, 'total', total_vehicles,
       'unit', 'vehicles', 'period', 'Today'
     ), 'vehicles', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- ================================================================
    -- WEEKLY METRICS
    -- ================================================================

    distance_change := CASE WHEN last_week_distance > 0
      THEN ROUND(((week_distance - last_week_distance)::NUMERIC / last_week_distance::NUMERIC) * 100, 1) ELSE 0 END;
    trips_change := CASE WHEN last_week_trips > 0
      THEN ROUND(((week_trips - last_week_trips)::NUMERIC / last_week_trips::NUMERIC) * 100, 1) ELSE 0 END;
    profit_change := CASE WHEN last_week_profit > 0
      THEN ROUND(((week_profit - last_week_profit)::NUMERIC / last_week_profit::NUMERIC) * 100, 1) ELSE 0 END;
    mileage_change := CASE WHEN last_week_avg_mileage > 0
      THEN ROUND(((week_avg_mileage - last_week_avg_mileage)::NUMERIC / last_week_avg_mileage::NUMERIC) * 100, 1) ELSE 0 END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.distance', 'This Week''s Distance', week_distance || ' km',
     jsonb_build_object('type', 'kpi', 'value', week_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'This Week vs Last Week', 'comparison', jsonb_build_object('last_week', last_week_distance)
     ), 'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.trips', 'This Week''s Trips', week_trips || ' trips',
     jsonb_build_object('type', 'kpi', 'value', week_trips, 'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'This Week vs Last Week', 'comparison', jsonb_build_object('last_week', last_week_trips)
     ), 'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.profit', 'This Week''s P&L', '₹' || ROUND(week_profit),
     jsonb_build_object('type', 'kpi', 'value', ROUND(week_profit), 'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'This Week vs Last Week', 'comparison', jsonb_build_object('last_week', ROUND(last_week_profit))
     ), 'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.mileage', 'Avg Mileage (Week)', ROUND(week_avg_mileage, 2) || ' km/l',
     jsonb_build_object('type', 'kpi', 'value', ROUND(week_avg_mileage, 2), 'unit', 'km/l',
       'trend', CASE WHEN mileage_change > 0 THEN 'up' WHEN mileage_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN mileage_change > 0 THEN '+' ELSE '' END || mileage_change || '%',
       'period', 'This Week vs Last Week', 'comparison', jsonb_build_object('last_week', ROUND(last_week_avg_mileage, 2))
     ), 'fuel', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- ================================================================
    -- MONTHLY METRICS (7 KPIs)
    -- ================================================================

    distance_change := CASE WHEN last_month_distance > 0
      THEN ROUND(((month_distance - last_month_distance)::NUMERIC / last_month_distance::NUMERIC) * 100, 1) ELSE 0 END;
    trips_change := CASE WHEN last_month_trips > 0
      THEN ROUND(((month_trips - last_month_trips)::NUMERIC / last_month_trips::NUMERIC) * 100, 1) ELSE 0 END;
    profit_change := CASE WHEN last_month_profit > 0
      THEN ROUND(((month_profit - last_month_profit)::NUMERIC / last_month_profit::NUMERIC) * 100, 1) ELSE 0 END;
    mileage_change := CASE WHEN last_month_avg_mileage > 0
      THEN ROUND(((month_avg_mileage - last_month_avg_mileage)::NUMERIC / last_month_avg_mileage::NUMERIC) * 100, 1) ELSE 0 END;

    -- Monthly Distance
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.distance', 'Monthly Distance', month_distance || ' km',
     jsonb_build_object('type', 'kpi', 'value', month_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'This Month vs Last Month', 'comparison', jsonb_build_object('last_month', last_month_distance)
     ), 'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- Monthly Trips
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.trips', 'Monthly Trips', month_trips || ' trips',
     jsonb_build_object('type', 'kpi', 'value', month_trips, 'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'This Month vs Last Month', 'comparison', jsonb_build_object('last_month', last_month_trips)
     ), 'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- Monthly Revenue
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.revenue', 'Monthly Revenue', '₹' || ROUND(month_revenue),
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_revenue), 'unit', '₹', 'period', 'This Month'
     ), 'revenue', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- Monthly Expenses
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.expenses', 'Monthly Expenses', '₹' || ROUND(month_expenses),
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_expenses), 'unit', '₹', 'period', 'This Month'
     ), 'expenses', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- Monthly Net P&L
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.profit', 'Monthly Net P&L', '₹' || ROUND(month_profit),
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_profit), 'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'This Month vs Last Month', 'comparison', jsonb_build_object('last_month', ROUND(last_month_profit))
     ), 'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- Monthly Mileage
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.mileage', 'Avg Mileage (Month)', ROUND(month_avg_mileage, 2) || ' km/l',
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_avg_mileage, 2), 'unit', 'km/l',
       'trend', CASE WHEN mileage_change > 0 THEN 'up' WHEN mileage_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN mileage_change > 0 THEN '+' ELSE '' END || mileage_change || '%',
       'period', 'This Month vs Last Month', 'comparison', jsonb_build_object('last_month', ROUND(last_month_avg_mileage, 2))
     ), 'fuel', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- Maintenance Costs
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.maintenance', 'Maintenance Costs', '₹' || ROUND(month_maintenance_cost),
     jsonb_build_object('type', 'kpi', 'value', ROUND(month_maintenance_cost), 'unit', '₹', 'period', 'This Month'
     ), 'maintenance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- ================================================================
    -- FIRST 10 DAYS COMPARISON (3 KPIs)
    -- ================================================================

    distance_change := CASE WHEN last_month_first10_distance > 0
      THEN ROUND(((this_month_first10_distance - last_month_first10_distance)::NUMERIC / last_month_first10_distance::NUMERIC) * 100, 1) ELSE 0 END;
    trips_change := CASE WHEN last_month_first10_trips > 0
      THEN ROUND(((this_month_first10_trips - last_month_first10_trips)::NUMERIC / last_month_first10_trips::NUMERIC) * 100, 1) ELSE 0 END;
    profit_change := CASE WHEN last_month_first10_profit > 0
      THEN ROUND(((this_month_first10_profit - last_month_first10_profit)::NUMERIC / last_month_first10_profit::NUMERIC) * 100, 1) ELSE 0 END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('comparison.first10days.distance', 'Distance (First 10 Days)', this_month_first10_distance || ' km',
     jsonb_build_object('type', 'kpi', 'value', this_month_first10_distance, 'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'First 10 Days Comparison', 'comparison', jsonb_build_object('last_month_first10', last_month_first10_distance)
     ), 'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('comparison.first10days.trips', 'Trips (First 10 Days)', this_month_first10_trips || ' trips',
     jsonb_build_object('type', 'kpi', 'value', this_month_first10_trips, 'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'First 10 Days Comparison', 'comparison', jsonb_build_object('last_month_first10', last_month_first10_trips)
     ), 'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('comparison.first10days.profit', 'P&L (First 10 Days)', '₹' || ROUND(this_month_first10_profit),
     jsonb_build_object('type', 'kpi', 'value', ROUND(this_month_first10_profit), 'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'First 10 Days Comparison', 'comparison', jsonb_build_object('last_month_first10', ROUND(last_month_first10_profit))
     ), 'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- ================================================================
    -- FLEET UTILIZATION (2 KPIs)
    -- ================================================================

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('fleet.utilization', 'Fleet Utilization',
     CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) || '%' ELSE '0%' END,
     jsonb_build_object('type', 'kpi',
       'value', CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) ELSE 0 END,
       'unit', '%', 'period', 'Current', 'comparison', jsonb_build_object('active', active_vehicles, 'total', total_vehicles)
     ), 'utilization', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('fleet.driver_utilization', 'Driver Utilization',
     CASE WHEN total_drivers > 0 THEN ROUND((active_drivers::NUMERIC / total_drivers::NUMERIC) * 100) || '%' ELSE '0%' END,
     jsonb_build_object('type', 'kpi',
       'value', CASE WHEN total_drivers > 0 THEN ROUND((active_drivers::NUMERIC / total_drivers::NUMERIC) * 100) ELSE 0 END,
       'unit', '%', 'period', 'Current', 'comparison', jsonb_build_object('active', active_drivers, 'total', total_drivers)
     ), 'utilization', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    -- ================================================================
    -- COST ANALYSIS (2 KPIs)
    -- ================================================================

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.cost_per_km', 'Cost per KM',
     CASE WHEN month_distance > 0 AND month_expenses > 0 THEN '₹' || ROUND(month_expenses::NUMERIC / month_distance::NUMERIC, 2) ELSE '₹0' END,
     jsonb_build_object('type', 'kpi',
       'value', CASE WHEN month_distance > 0 AND month_expenses > 0 THEN ROUND(month_expenses::NUMERIC / month_distance::NUMERIC, 2) ELSE 0 END,
       'unit', '₹/km', 'period', 'This Month'
     ), 'expenses', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.profit_margin', 'Profit Margin',
     CASE WHEN month_revenue > 0 THEN ROUND((month_profit::NUMERIC / month_revenue::NUMERIC) * 100, 1) || '%' ELSE '0%' END,
     jsonb_build_object('type', 'kpi',
       'value', CASE WHEN month_revenue > 0 THEN ROUND((month_profit::NUMERIC / month_revenue::NUMERIC) * 100, 1) ELSE 0 END,
       'unit', '%', 'period', 'This Month'
     ), 'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human, kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme, computed_at = NOW(), updated_at = NOW();

    total_kpi_count := total_kpi_count + 22;

  END LOOP;

  end_time := clock_timestamp();

  -- Return JSON result
  RETURN jsonb_build_object(
    'success', true,
    'cards_created', total_kpi_count,
    'organizations_processed', org_count,
    'execution_time_ms', ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)
  );

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_kpi_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_kpi_cards() TO service_role;

-- Add comment
COMMENT ON FUNCTION generate_kpi_cards() IS 'Generates all 22 KPI cards for all organizations. Returns JSON with cards_created and execution_time_ms.';
