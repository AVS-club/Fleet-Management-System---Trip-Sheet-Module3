-- ================================================================
-- COMPREHENSIVE KPI GENERATION (FIXED VERSION)
-- ================================================================
-- This corrected version fixes all identified issues:
-- 1. Added missing RLS policies (UPDATE/DELETE)
-- 2. Fixed unique constraint (removed computed_at)
-- 3. Added ON CONFLICT handling (UPSERT)
-- 4. Loops through ALL organizations (not just first)
-- 5. Fixed DELETE to be organization-specific
-- 6. Protected division by zero properly
-- 7. Added transaction wrapper
-- 8. Added missing indexes
-- 9. Improved date comparisons
-- 10. Added NULL checks
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: CREATE TABLES SAFELY WITH COLUMN CHECKS
-- ================================================================

-- Create events_feed table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.events_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind VARCHAR(50) NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  entity_json JSONB,
  status VARCHAR(50),
  metadata JSONB,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create kpi_cards table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.kpi_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_key VARCHAR(100) NOT NULL,
  kpi_title VARCHAR(255) NOT NULL,
  kpi_value_human VARCHAR(255) NOT NULL,
  kpi_payload JSONB NOT NULL,
  theme VARCHAR(50) NOT NULL DEFAULT 'default',
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id column to kpi_cards if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'kpi_cards'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.kpi_cards
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added organization_id column to kpi_cards';
  END IF;
END $$;

-- Add organization_id column to events_feed if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events_feed'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.events_feed
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added organization_id column to events_feed';
  END IF;
END $$;

-- ================================================================
-- FIX #2: Correct unique constraint (without computed_at)
-- ================================================================

-- Drop old constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kpi_cards_kpi_key_organization_id_computed_at_key'
  ) THEN
    ALTER TABLE public.kpi_cards
    DROP CONSTRAINT kpi_cards_kpi_key_organization_id_computed_at_key;
    RAISE NOTICE '✅ Dropped old unique constraint from kpi_cards';
  END IF;
END $$;

-- Add correct unique constraint (only kpi_key + organization_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kpi_cards_kpi_key_organization_id_key'
  ) THEN
    ALTER TABLE public.kpi_cards
    ADD CONSTRAINT kpi_cards_kpi_key_organization_id_key
    UNIQUE(kpi_key, organization_id);
    RAISE NOTICE '✅ Added correct unique constraint to kpi_cards';
  END IF;
END $$;

-- ================================================================
-- FIX #8: Add missing indexes for performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_events_feed_kind ON public.events_feed(kind);
CREATE INDEX IF NOT EXISTS idx_events_feed_event_time ON public.events_feed(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_feed_priority ON public.events_feed(priority);
CREATE INDEX IF NOT EXISTS idx_events_feed_organization_id ON public.events_feed(organization_id);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_kpi_key ON public.kpi_cards(kpi_key);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_computed_at ON public.kpi_cards(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_theme ON public.kpi_cards(theme);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_organization_id ON public.kpi_cards(organization_id);

-- Add missing trip indexes
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON public.trips(trip_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_org_start_date ON public.trips(organization_id, trip_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_org_date_range ON public.trips(organization_id, trip_start_date)
  WHERE trip_start_date IS NOT NULL;

-- Enable RLS (safe - won't error if already enabled)
ALTER TABLE public.events_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_cards ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- FIX #1: Add ALL necessary RLS policies (including UPDATE/DELETE)
-- ================================================================

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view events from their organization" ON public.events_feed;
DROP POLICY IF EXISTS "Users can insert events for their organization" ON public.events_feed;
DROP POLICY IF EXISTS "Users can update events for their organization" ON public.events_feed;
DROP POLICY IF EXISTS "Users can delete events for their organization" ON public.events_feed;
DROP POLICY IF EXISTS "Users can view KPI cards from their organization" ON public.kpi_cards;
DROP POLICY IF EXISTS "Users can insert KPI cards for their organization" ON public.kpi_cards;
DROP POLICY IF EXISTS "Users can update KPI cards for their organization" ON public.kpi_cards;
DROP POLICY IF EXISTS "Users can delete KPI cards for their organization" ON public.kpi_cards;

-- Create comprehensive RLS policies for events_feed
CREATE POLICY "Users can view events from their organization" ON public.events_feed
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events for their organization" ON public.events_feed
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events for their organization" ON public.events_feed
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events for their organization" ON public.events_feed
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

-- Create comprehensive RLS policies for kpi_cards
CREATE POLICY "Users can view KPI cards from their organization" ON public.kpi_cards
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert KPI cards for their organization" ON public.kpi_cards
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update KPI cards for their organization" ON public.kpi_cards
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete KPI cards for their organization" ON public.kpi_cards
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
    )
  );

-- Create trigger functions (replace if exists)
CREATE OR REPLACE FUNCTION update_events_feed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_kpi_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_update_events_feed_updated_at ON public.events_feed;
DROP TRIGGER IF EXISTS trigger_update_kpi_cards_updated_at ON public.kpi_cards;

-- Create triggers
CREATE TRIGGER trigger_update_events_feed_updated_at
  BEFORE UPDATE ON public.events_feed
  FOR EACH ROW
  EXECUTE FUNCTION update_events_feed_updated_at();

CREATE TRIGGER trigger_update_kpi_cards_updated_at
  BEFORE UPDATE ON public.kpi_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_cards_updated_at();

-- ================================================================
-- STEP 2: GENERATE KPI CARDS WITH COMPETITIVE ANALYSIS
-- ================================================================

DO $$
DECLARE
  org_record RECORD;
  org_id UUID;

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
  -- ================================================================
  -- FIX #4: Loop through ALL organizations
  -- ================================================================

  FOR org_record IN SELECT id, name FROM public.organizations ORDER BY created_at LOOP
    org_id := org_record.id;
    org_count := org_count + 1;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Processing Organization: % (%)', org_record.name, org_id;
    RAISE NOTICE '========================================';

    -- ================================================================
    -- FIX #5: Clean old KPI data for THIS organization only
    -- ================================================================

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
    -- FIX #12: Calculate maintenance costs with NULL checks
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
    -- FIX #6: Safe percentage calculations with proper division protection
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
    -- FIX #3: INSERT KPI CARDS WITH ON CONFLICT (UPSERT)
    -- ================================================================

    -- DAILY METRICS
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.distance.today', 'Today''s Distance',
     today_distance || ' km',
     jsonb_build_object(
       'type', 'kpi',
       'value', today_distance,
       'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'Today vs Yesterday',
       'comparison', jsonb_build_object('yesterday', yesterday_distance)
     ),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.trips.today', 'Today''s Trips',
     today_trips || ' trips',
     jsonb_build_object(
       'type', 'kpi',
       'value', today_trips,
       'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'Today vs Yesterday',
       'comparison', jsonb_build_object('yesterday', yesterday_trips)
     ),
     'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.profit.today', 'Today''s P&L',
     '₹' || ROUND(today_profit),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(today_profit),
       'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'Today vs Yesterday',
       'comparison', jsonb_build_object('yesterday', ROUND(yesterday_profit))
     ),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('daily.active_vehicles', 'Active Vehicles',
     today_active_vehicles || ' / ' || total_vehicles,
     jsonb_build_object(
       'type', 'kpi',
       'value', today_active_vehicles,
       'total', total_vehicles,
       'unit', 'vehicles',
       'period', 'Today'
     ),
     'vehicles', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    -- ================================================================
    -- WEEKLY METRICS
    -- ================================================================

    distance_change := CASE
      WHEN last_week_distance > 0
      THEN ROUND(((week_distance - last_week_distance)::NUMERIC / last_week_distance::NUMERIC) * 100, 1)
      ELSE 0
    END;

    trips_change := CASE
      WHEN last_week_trips > 0
      THEN ROUND(((week_trips - last_week_trips)::NUMERIC / last_week_trips::NUMERIC) * 100, 1)
      ELSE 0
    END;

    profit_change := CASE
      WHEN last_week_profit > 0
      THEN ROUND(((week_profit - last_week_profit)::NUMERIC / last_week_profit::NUMERIC) * 100, 1)
      ELSE 0
    END;

    mileage_change := CASE
      WHEN last_week_avg_mileage > 0
      THEN ROUND(((week_avg_mileage - last_week_avg_mileage)::NUMERIC / last_week_avg_mileage::NUMERIC) * 100, 1)
      ELSE 0
    END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.distance', 'This Week''s Distance',
     week_distance || ' km',
     jsonb_build_object(
       'type', 'kpi',
       'value', week_distance,
       'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'This Week vs Last Week',
       'comparison', jsonb_build_object('last_week', last_week_distance)
     ),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.trips', 'This Week''s Trips',
     week_trips || ' trips',
     jsonb_build_object(
       'type', 'kpi',
       'value', week_trips,
       'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'This Week vs Last Week',
       'comparison', jsonb_build_object('last_week', last_week_trips)
     ),
     'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.profit', 'This Week''s P&L',
     '₹' || ROUND(week_profit),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(week_profit),
       'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'This Week vs Last Week',
       'comparison', jsonb_build_object('last_week', ROUND(last_week_profit))
     ),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('weekly.mileage', 'Avg Mileage (Week)',
     ROUND(week_avg_mileage, 2) || ' km/l',
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(week_avg_mileage, 2),
       'unit', 'km/l',
       'trend', CASE WHEN mileage_change > 0 THEN 'up' WHEN mileage_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN mileage_change > 0 THEN '+' ELSE '' END || mileage_change || '%',
       'period', 'This Week vs Last Week',
       'comparison', jsonb_build_object('last_week', ROUND(last_week_avg_mileage, 2))
     ),
     'fuel', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    -- ================================================================
    -- MONTHLY METRICS
    -- ================================================================

    distance_change := CASE
      WHEN last_month_distance > 0
      THEN ROUND(((month_distance - last_month_distance)::NUMERIC / last_month_distance::NUMERIC) * 100, 1)
      ELSE 0
    END;

    trips_change := CASE
      WHEN last_month_trips > 0
      THEN ROUND(((month_trips - last_month_trips)::NUMERIC / last_month_trips::NUMERIC) * 100, 1)
      ELSE 0
    END;

    profit_change := CASE
      WHEN last_month_profit > 0
      THEN ROUND(((month_profit - last_month_profit)::NUMERIC / last_month_profit::NUMERIC) * 100, 1)
      ELSE 0
    END;

    mileage_change := CASE
      WHEN last_month_avg_mileage > 0
      THEN ROUND(((month_avg_mileage - last_month_avg_mileage)::NUMERIC / last_month_avg_mileage::NUMERIC) * 100, 1)
      ELSE 0
    END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.distance', 'Monthly Distance',
     month_distance || ' km',
     jsonb_build_object(
       'type', 'kpi',
       'value', month_distance,
       'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'This Month vs Last Month',
       'comparison', jsonb_build_object('last_month', last_month_distance)
     ),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.trips', 'Monthly Trips',
     month_trips || ' trips',
     jsonb_build_object(
       'type', 'kpi',
       'value', month_trips,
       'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'This Month vs Last Month',
       'comparison', jsonb_build_object('last_month', last_month_trips)
     ),
     'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.revenue', 'Monthly Revenue',
     '₹' || ROUND(month_revenue),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(month_revenue),
       'unit', '₹',
       'period', 'This Month'
     ),
     'revenue', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.expenses', 'Monthly Expenses',
     '₹' || ROUND(month_expenses),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(month_expenses),
       'unit', '₹',
       'period', 'This Month'
     ),
     'expenses', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.profit', 'Monthly Net P&L',
     '₹' || ROUND(month_profit),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(month_profit),
       'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'This Month vs Last Month',
       'comparison', jsonb_build_object('last_month', ROUND(last_month_profit))
     ),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.mileage', 'Avg Mileage (Month)',
     ROUND(month_avg_mileage, 2) || ' km/l',
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(month_avg_mileage, 2),
       'unit', 'km/l',
       'trend', CASE WHEN mileage_change > 0 THEN 'up' WHEN mileage_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN mileage_change > 0 THEN '+' ELSE '' END || mileage_change || '%',
       'period', 'This Month vs Last Month',
       'comparison', jsonb_build_object('last_month', ROUND(last_month_avg_mileage, 2))
     ),
     'fuel', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.maintenance', 'Maintenance Costs',
     '₹' || ROUND(month_maintenance_cost),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(month_maintenance_cost),
       'unit', '₹',
       'period', 'This Month'
     ),
     'maintenance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    -- ================================================================
    -- FIRST 10 DAYS COMPARISON
    -- ================================================================

    distance_change := CASE
      WHEN last_month_first10_distance > 0
      THEN ROUND(((this_month_first10_distance - last_month_first10_distance)::NUMERIC / last_month_first10_distance::NUMERIC) * 100, 1)
      ELSE 0
    END;

    trips_change := CASE
      WHEN last_month_first10_trips > 0
      THEN ROUND(((this_month_first10_trips - last_month_first10_trips)::NUMERIC / last_month_first10_trips::NUMERIC) * 100, 1)
      ELSE 0
    END;

    profit_change := CASE
      WHEN last_month_first10_profit > 0
      THEN ROUND(((this_month_first10_profit - last_month_first10_profit)::NUMERIC / last_month_first10_profit::NUMERIC) * 100, 1)
      ELSE 0
    END;

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('comparison.first10days.distance', 'Distance (First 10 Days)',
     this_month_first10_distance || ' km',
     jsonb_build_object(
       'type', 'kpi',
       'value', this_month_first10_distance,
       'unit', 'km',
       'trend', CASE WHEN distance_change > 0 THEN 'up' WHEN distance_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN distance_change > 0 THEN '+' ELSE '' END || distance_change || '%',
       'period', 'First 10 Days Comparison',
       'comparison', jsonb_build_object('last_month_first10', last_month_first10_distance)
     ),
     'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('comparison.first10days.trips', 'Trips (First 10 Days)',
     this_month_first10_trips || ' trips',
     jsonb_build_object(
       'type', 'kpi',
       'value', this_month_first10_trips,
       'unit', 'trips',
       'trend', CASE WHEN trips_change > 0 THEN 'up' WHEN trips_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN trips_change > 0 THEN '+' ELSE '' END || trips_change || '%',
       'period', 'First 10 Days Comparison',
       'comparison', jsonb_build_object('last_month_first10', last_month_first10_trips)
     ),
     'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('comparison.first10days.profit', 'P&L (First 10 Days)',
     '₹' || ROUND(this_month_first10_profit),
     jsonb_build_object(
       'type', 'kpi',
       'value', ROUND(this_month_first10_profit),
       'unit', '₹',
       'trend', CASE WHEN profit_change > 0 THEN 'up' WHEN profit_change < 0 THEN 'down' ELSE 'neutral' END,
       'change', CASE WHEN profit_change > 0 THEN '+' ELSE '' END || profit_change || '%',
       'period', 'First 10 Days Comparison',
       'comparison', jsonb_build_object('last_month_first10', ROUND(last_month_first10_profit))
     ),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    -- ================================================================
    -- FLEET UTILIZATION
    -- ================================================================

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('fleet.utilization', 'Fleet Utilization',
     CASE WHEN total_vehicles > 0
       THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) || '%'
       ELSE '0%'
     END,
     jsonb_build_object(
       'type', 'kpi',
       'value', CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) ELSE 0 END,
       'unit', '%',
       'period', 'Current',
       'comparison', jsonb_build_object('active', active_vehicles, 'total', total_vehicles)
     ),
     'utilization', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('fleet.driver_utilization', 'Driver Utilization',
     CASE WHEN total_drivers > 0
       THEN ROUND((active_drivers::NUMERIC / total_drivers::NUMERIC) * 100) || '%'
       ELSE '0%'
     END,
     jsonb_build_object(
       'type', 'kpi',
       'value', CASE WHEN total_drivers > 0 THEN ROUND((active_drivers::NUMERIC / total_drivers::NUMERIC) * 100) ELSE 0 END,
       'unit', '%',
       'period', 'Current',
       'comparison', jsonb_build_object('active', active_drivers, 'total', total_drivers)
     ),
     'utilization', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    -- ================================================================
    -- COST ANALYSIS
    -- ================================================================

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.cost_per_km', 'Cost per KM',
     CASE WHEN month_distance > 0 AND month_expenses > 0
       THEN '₹' || ROUND(month_expenses::NUMERIC / month_distance::NUMERIC, 2)
       ELSE '₹0'
     END,
     jsonb_build_object(
       'type', 'kpi',
       'value', CASE WHEN month_distance > 0 AND month_expenses > 0
                THEN ROUND(month_expenses::NUMERIC / month_distance::NUMERIC, 2)
                ELSE 0 END,
       'unit', '₹/km',
       'period', 'This Month'
     ),
     'expenses', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES
    ('monthly.profit_margin', 'Profit Margin',
     CASE WHEN month_revenue > 0
       THEN ROUND((month_profit::NUMERIC / month_revenue::NUMERIC) * 100, 1) || '%'
       ELSE '0%'
     END,
     jsonb_build_object(
       'type', 'kpi',
       'value', CASE WHEN month_revenue > 0
                THEN ROUND((month_profit::NUMERIC / month_revenue::NUMERIC) * 100, 1)
                ELSE 0 END,
       'unit', '%',
       'period', 'This Month'
     ),
     'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id)
    DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      theme = EXCLUDED.theme,
      computed_at = NOW(),
      updated_at = NOW();

    -- Count KPIs for this org
    RAISE NOTICE '✅ Generated 22 KPI cards for organization: %', org_record.name;
    total_kpi_count := total_kpi_count + 22;

  END LOOP;

  -- ================================================================
  -- FINAL SUMMARY
  -- ================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ KPI GENERATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organizations Processed: %', org_count;
  RAISE NOTICE 'Total KPI Cards Generated: %', total_kpi_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 KPI Summary per Organization:';
  RAISE NOTICE '- Daily KPIs: 4';
  RAISE NOTICE '- Weekly KPIs: 4';
  RAISE NOTICE '- Monthly KPIs: 7';
  RAISE NOTICE '- First 10 Days Comparisons: 3';
  RAISE NOTICE '- Fleet Metrics: 2';
  RAISE NOTICE '- Cost Analysis: 2';
  RAISE NOTICE 'Total per Org: 22 KPI Cards';
  RAISE NOTICE '========================================';

END $$;

-- ================================================================
-- STEP 3: VERIFY DATA
-- ================================================================

SELECT
  o.name as organization_name,
  k.theme,
  COUNT(*) as card_count
FROM public.kpi_cards k
JOIN public.organizations o ON k.organization_id = o.id
GROUP BY o.name, k.theme
ORDER BY o.name, k.theme;

-- ================================================================
-- FIX #9: COMMIT TRANSACTION
-- ================================================================

COMMIT;

-- ================================================================
-- MIGRATION COMPLETE! ✅
-- ================================================================
-- All 12 identified issues have been fixed:
-- ✅ #1: Added UPDATE/DELETE RLS policies
-- ✅ #2: Fixed unique constraint (removed computed_at)
-- ✅ #3: Added ON CONFLICT handling (UPSERT)
-- ✅ #4: Loops through ALL organizations
-- ✅ #5: Fixed DELETE to be organization-specific
-- ✅ #6: Protected division by zero properly
-- ✅ #7: Added transaction wrapper (BEGIN/COMMIT)
-- ✅ #8: Added missing indexes on trips
-- ✅ #9: Transaction wrapper added
-- ✅ #10: DELETE now filters by organization_id
-- ✅ #11: RLS policies comprehensive
-- ✅ #12: Added NULL checks in maintenance query
-- ================================================================
