-- ================================================================
-- CREATE generate_kpi_cards RPC FUNCTION
-- ================================================================
-- This function is called by the refresh-kpis edge function
-- and GitHub Actions workflow to regenerate KPI dashboard cards
-- ================================================================

-- First ensure the kpi_cards table exists with proper structure
CREATE TABLE IF NOT EXISTS public.kpi_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_key VARCHAR(100) NOT NULL,
  kpi_title VARCHAR(255) NOT NULL,
  kpi_value_human VARCHAR(255) NOT NULL,
  kpi_payload JSONB NOT NULL,
  theme VARCHAR(50) NOT NULL DEFAULT 'default',
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'kpi_cards_kpi_key_organization_id_key'
  ) THEN
    ALTER TABLE public.kpi_cards 
    ADD CONSTRAINT kpi_cards_kpi_key_organization_id_key 
    UNIQUE(kpi_key, organization_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_cards_kpi_key ON public.kpi_cards(kpi_key);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_computed_at ON public.kpi_cards(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_organization_id ON public.kpi_cards(organization_id);

-- Enable RLS
ALTER TABLE public.kpi_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate it
DROP POLICY IF EXISTS "Users can view KPI cards from their organization" ON public.kpi_cards;

CREATE POLICY "Users can view KPI cards from their organization" ON public.kpi_cards
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Drop the function if it exists to recreate it
DROP FUNCTION IF EXISTS public.generate_kpi_cards();

-- Note: organization_id already exists in vehicles, drivers, and trips tables
-- Adding calculated_kmpl column to trips if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'trips'
    AND column_name = 'calculated_kmpl'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN calculated_kmpl NUMERIC;
  END IF;
END $$;

-- Create the RPC function
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

    -- Delete old KPIs for this organization (refresh with new data)
    DELETE FROM public.kpi_cards 
    WHERE organization_id = org_id 
      AND computed_at < NOW() - INTERVAL '1 minute';

    -- Calculate TODAY'S metrics
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

    -- Calculate THIS WEEK'S metrics
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
      COALESCE(COUNT(*), 0),
      COALESCE(SUM(net_profit), 0)
    INTO week_distance, week_trips, week_profit
    FROM public.trips
    WHERE organization_id = org_id
      AND trip_start_date >= DATE_TRUNC('week', CURRENT_DATE)
      AND trip_start_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';

    -- Calculate THIS MONTH'S metrics
    SELECT
      COALESCE(SUM(end_km - start_km), 0),
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
      COUNT(*) FILTER (WHERE status = 'active')
    INTO total_vehicles, active_vehicles
    FROM public.vehicles
    WHERE organization_id = org_id;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active')
    INTO total_drivers, active_drivers
    FROM public.drivers
    WHERE organization_id = org_id;

    -- Insert KPI cards with ON CONFLICT handling for updates
    
    -- Today's Distance
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('today.distance', 'Today''s Distance', today_distance || ' km',
      jsonb_build_object('type', 'kpi', 'value', today_distance, 'unit', 'km', 'period', 'Today'),
      'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Today's Trips
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('today.trips', 'Today''s Trips', today_trips || ' trips',
      jsonb_build_object('type', 'kpi', 'value', today_trips, 'unit', 'trips', 'period', 'Today'),
      'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Weekly Distance
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('weekly.distance', 'This Week''s Distance', week_distance || ' km',
      jsonb_build_object('type', 'kpi', 'value', week_distance, 'unit', 'km', 'period', 'This Week'),
      'distance', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Monthly Trips
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.trips', 'Monthly Trips', month_trips || ' trips',
      jsonb_build_object('type', 'kpi', 'value', month_trips, 'unit', 'trips', 'period', 'This Month'),
      'trips', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Monthly Revenue
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.revenue', 'Monthly Revenue', '₹' || ROUND(month_revenue),
      jsonb_build_object('type', 'kpi', 'value', ROUND(month_revenue), 'unit', '₹', 'period', 'This Month'),
      'revenue', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Monthly Profit
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('monthly.profit', 'Monthly Net P&L', '₹' || ROUND(month_profit),
      jsonb_build_object('type', 'kpi', 'value', ROUND(month_profit), 'unit', '₹', 'period', 'This Month'),
      'pnl', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Fleet Utilization
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('fleet.utilization', 'Fleet Utilization',
      CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) || '%' ELSE '0%' END,
      jsonb_build_object('type', 'kpi', 
        'value', CASE WHEN total_vehicles > 0 THEN ROUND((active_vehicles::NUMERIC / total_vehicles::NUMERIC) * 100) ELSE 0 END,
        'unit', '%', 'period', 'Current'),
      'utilization', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    -- Active Drivers
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at)
    VALUES ('fleet.active_drivers', 'Active Drivers', active_drivers || ' / ' || total_drivers,
      jsonb_build_object('type', 'kpi', 'value', active_drivers, 'total', total_drivers, 'unit', 'drivers', 'period', 'Current'),
      'drivers', org_id, NOW())
    ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
      kpi_value_human = EXCLUDED.kpi_value_human,
      kpi_payload = EXCLUDED.kpi_payload,
      computed_at = NOW(),
      updated_at = NOW();

    cards_created := cards_created + 8;
  END LOOP;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'cards_created', cards_created,
    'message', 'KPI cards generated successfully'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO authenticated;

-- Grant execute permission to service role (for edge functions)
GRANT EXECUTE ON FUNCTION public.generate_kpi_cards() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.generate_kpi_cards() IS 'Generates or refreshes KPI dashboard cards for all organizations. Called by the refresh-kpis edge function and GitHub Actions workflow.';
