-- Create TNC Acceptances Table
-- This table stores Terms and Conditions acceptance records for users

CREATE TABLE IF NOT EXISTS public.tnc_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  tnc_version TEXT DEFAULT '1.0',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tnc_acceptances_user_id ON public.tnc_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_tnc_acceptances_organization_id ON public.tnc_acceptances(organization_id);
CREATE INDEX IF NOT EXISTS idx_tnc_acceptances_user_org ON public.tnc_acceptances(user_id, organization_id);

-- Enable RLS
ALTER TABLE public.tnc_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own TNC acceptances" ON public.tnc_acceptances;
DROP POLICY IF EXISTS "Users can insert own TNC acceptances" ON public.tnc_acceptances;
DROP POLICY IF EXISTS "Users can update own TNC acceptances" ON public.tnc_acceptances;

-- Users can view their own TNC acceptances
CREATE POLICY "Users can view own TNC acceptances"
  ON public.tnc_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own TNC acceptances
CREATE POLICY "Users can insert own TNC acceptances"
  ON public.tnc_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own TNC acceptances
CREATE POLICY "Users can update own TNC acceptances"
  ON public.tnc_acceptances
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_tnc_acceptances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_tnc_acceptances_updated_at ON public.tnc_acceptances;

CREATE TRIGGER update_tnc_acceptances_updated_at
  BEFORE UPDATE ON public.tnc_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION update_tnc_acceptances_updated_at();

