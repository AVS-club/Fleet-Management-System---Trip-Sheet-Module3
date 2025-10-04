-- Fix events_feed migration - handle existing view/table conflict

-- First, check if events_feed exists as a view and drop it
DROP VIEW IF EXISTS public.events_feed CASCADE;

-- Now create the events_feed table
CREATE TABLE IF NOT EXISTS public.events_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind VARCHAR(50) NOT NULL, -- Type of event: ai_alert, activity, vehicle_activity, vehicle_doc, maintenance, trip, kpi
  event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'info', -- Priority: danger, warn, info
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  entity_json JSONB, -- Flexible JSON data for event-specific information
  status VARCHAR(50), -- Status for actionable events (pending, accepted, rejected, completed, etc.)
  metadata JSONB, -- Additional metadata
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if table was created successfully)
DO $$
BEGIN
  -- Check if the table exists and is not a view
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events_feed' 
    AND table_type = 'BASE TABLE'
  ) THEN
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_events_feed_kind ON public.events_feed(kind);
    CREATE INDEX IF NOT EXISTS idx_events_feed_event_time ON public.events_feed(event_time DESC);
    CREATE INDEX IF NOT EXISTS idx_events_feed_priority ON public.events_feed(priority);
    CREATE INDEX IF NOT EXISTS idx_events_feed_status ON public.events_feed(status);
    CREATE INDEX IF NOT EXISTS idx_events_feed_organization_id ON public.events_feed(organization_id);
    
    -- Enable RLS
    ALTER TABLE public.events_feed ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for organization-based access
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
    
    RAISE NOTICE 'Successfully created events_feed table with indexes and policies';
  ELSE
    RAISE NOTICE 'events_feed table creation failed or is not a base table';
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_feed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events_feed' 
    AND table_type = 'BASE TABLE'
  ) THEN
    CREATE TRIGGER trigger_update_events_feed_updated_at
      BEFORE UPDATE ON public.events_feed
      FOR EACH ROW
      EXECUTE FUNCTION update_events_feed_updated_at();
    
    RAISE NOTICE 'Successfully created trigger for events_feed';
  END IF;
END $$;

-- Create ai_alerts table if it doesn't exist (for AI alert events)
CREATE TABLE IF NOT EXISTS public.ai_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'warn',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  entity_type VARCHAR(50), -- vehicle, driver, trip, etc.
  entity_id UUID, -- ID of the related entity
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
