-- Simple and robust events_feed setup
-- This will handle any existing conflicts and create the table properly

-- Step 1: Drop any existing events_feed (view or table)
DROP VIEW IF EXISTS public.events_feed CASCADE;
DROP TABLE IF EXISTS public.events_feed CASCADE;

-- Step 2: Create the events_feed table from scratch
CREATE TABLE public.events_feed (
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

-- Step 3: Create indexes
CREATE INDEX idx_events_feed_kind ON public.events_feed(kind);
CREATE INDEX idx_events_feed_event_time ON public.events_feed(event_time DESC);
CREATE INDEX idx_events_feed_priority ON public.events_feed(priority);
CREATE INDEX idx_events_feed_status ON public.events_feed(status);
CREATE INDEX idx_events_feed_organization_id ON public.events_feed(organization_id);

-- Step 4: Enable RLS
ALTER TABLE public.events_feed ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies
CREATE POLICY "Users can view events from their organization" ON public.events_feed
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events for their organization" ON public.events_feed
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events from their organization" ON public.events_feed
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Step 6: Create function and trigger
CREATE OR REPLACE FUNCTION update_events_feed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_events_feed_updated_at
  BEFORE UPDATE ON public.events_feed
  FOR EACH ROW
  EXECUTE FUNCTION update_events_feed_updated_at();

-- Step 7: Create ai_alerts table
CREATE TABLE IF NOT EXISTS public.ai_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'warn',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  entity_type VARCHAR(50),
  entity_id UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ai_alerts
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_alerts
CREATE POLICY "Users can view AI alerts from their organization" ON public.ai_alerts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update AI alerts from their organization" ON public.ai_alerts
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for ai_alerts updated_at
CREATE TRIGGER trigger_update_ai_alerts_updated_at
  BEFORE UPDATE ON public.ai_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_events_feed_updated_at();

-- Success message
SELECT 'Events feed table created successfully!' as status;
