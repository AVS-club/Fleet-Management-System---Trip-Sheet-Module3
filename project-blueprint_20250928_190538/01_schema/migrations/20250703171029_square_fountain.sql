/*
  # Add Trip P&L Fields

  1. New Tables
    - None
  2. Security
    - No changes to RLS
  3. Changes
    - Add new ENUM types for billing_type and profit_status
    - Add P&L related columns to trips table
    - Create trip_pnl_report_view for aggregated P&L data
*/

-- Create ENUM types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
    CREATE TYPE public.billing_type AS ENUM ('per_km', 'per_ton', 'manual');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profit_status') THEN
    CREATE TYPE public.profit_status AS ENUM ('profit', 'loss', 'neutral');
  END IF;
END $$;

-- Add new columns to trips table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'freight_rate') THEN
    ALTER TABLE public.trips ADD COLUMN freight_rate numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'billing_type') THEN
    ALTER TABLE public.trips ADD COLUMN billing_type billing_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'income_amount') THEN
    ALTER TABLE public.trips ADD COLUMN income_amount numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'total_expense') THEN
    ALTER TABLE public.trips ADD COLUMN total_expense numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'net_profit') THEN
    ALTER TABLE public.trips ADD COLUMN net_profit numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'cost_per_km') THEN
    ALTER TABLE public.trips ADD COLUMN cost_per_km numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'profit_status') THEN
    ALTER TABLE public.trips ADD COLUMN profit_status profit_status;
  END IF;
END $$;

-- Create trip_pnl_report_view
CREATE OR REPLACE VIEW public.trip_pnl_report_view AS
SELECT
    to_char(trip_start_date::date, 'YYYY-MM') AS month,
    SUM(income_amount) AS total_income,
    SUM(total_expense) AS total_expense,
    SUM(net_profit) AS net_profit,
    COUNT(id) AS trip_count,
    AVG(cost_per_km) AS avg_cost_per_km
FROM
    public.trips
WHERE
    income_amount IS NOT NULL
    AND total_expense IS NOT NULL
GROUP BY
    1
ORDER BY
    1;