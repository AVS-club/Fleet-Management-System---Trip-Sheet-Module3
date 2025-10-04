-- Step 1: Create the kpi_cards table first
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of kpi_key and computed_at
  UNIQUE(kpi_key, computed_at)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_kpi_cards_kpi_key ON public.kpi_cards(kpi_key);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_computed_at ON public.kpi_cards(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_theme ON public.kpi_cards(theme);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_organization_id ON public.kpi_cards(organization_id);

-- Step 3: Enable RLS
ALTER TABLE public.kpi_cards ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
CREATE POLICY "Users can view KPI cards from their organization" ON public.kpi_cards
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert KPI cards for their organization" ON public.kpi_cards
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Step 5: Create function and trigger
CREATE OR REPLACE FUNCTION update_kpi_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kpi_cards_updated_at
  BEFORE UPDATE ON public.kpi_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_cards_updated_at();
