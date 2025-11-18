-- Fix KPI Cards Table - Add missing updated_at column
-- This fixes the error: column "updated_at" of relation "kpi_cards" does not exist

-- Add updated_at column if it doesn't exist
ALTER TABLE public.kpi_cards 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_kpi_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_kpi_cards_updated_at ON public.kpi_cards;

CREATE TRIGGER update_kpi_cards_updated_at
  BEFORE UPDATE ON public.kpi_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_cards_updated_at();

-- Now test the generate_kpi_cards function
SELECT generate_kpi_cards();
