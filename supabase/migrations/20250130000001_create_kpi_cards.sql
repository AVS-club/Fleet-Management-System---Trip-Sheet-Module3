/*
  # Create kpi_cards table for media content and KPIs
  
  This table stores KPI cards and media content for the Hero Feed,
  including YouTube videos, images, and educational content.
*/

-- Create kpi_cards table
CREATE TABLE IF NOT EXISTS public.kpi_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_key VARCHAR(100) NOT NULL, -- Unique identifier for the KPI/media item
  kpi_title VARCHAR(255) NOT NULL, -- Display title
  kpi_value_human VARCHAR(255) NOT NULL, -- Human-readable value or description
  kpi_payload JSONB NOT NULL, -- Flexible JSON data for media content
  theme VARCHAR(50) NOT NULL DEFAULT 'default', -- Theme for styling
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- When this KPI was computed
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of kpi_key and computed_at
  UNIQUE(kpi_key, computed_at)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_cards_kpi_key ON public.kpi_cards(kpi_key);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_computed_at ON public.kpi_cards(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_theme ON public.kpi_cards(theme);
CREATE INDEX IF NOT EXISTS idx_kpi_cards_organization_id ON public.kpi_cards(organization_id);

-- Enable RLS
ALTER TABLE public.kpi_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for organization-based access
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kpi_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_kpi_cards_updated_at
  BEFORE UPDATE ON public.kpi_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_cards_updated_at();

-- Insert sample media/educational content
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the first organization ID
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  -- Only insert if we have an organization and no KPI cards exist
  IF org_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.kpi_cards LIMIT 1) THEN
    
    INSERT INTO public.kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_payload, theme, organization_id, computed_at) VALUES 
      -- YouTube video cards
      ('media.youtube.1', 'Fleet Safety Tips', 'Training Video', 
        '{"type": "youtube", "videoId": "dQw4w9WgXcQ", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", "duration": "3:32", "views": "2.1B"}'::jsonb, 
        'trips', org_id, NOW() - INTERVAL '1 day'),
      
      ('media.youtube.2', 'Fuel Efficiency Guide', 'Best Practices', 
        '{"type": "youtube", "videoId": "ScMzIvxBSi4", "thumbnail": "https://img.youtube.com/vi/ScMzIvxBSi4/maxresdefault.jpg", "duration": "8:45", "views": "1.2M"}'::jsonb, 
        'fuel', org_id, NOW() - INTERVAL '2 days'),
      
      ('media.youtube.3', 'Maintenance Best Practices', 'Expert Tips', 
        '{"type": "youtube", "videoId": "jNQXAC9IVRw", "thumbnail": "https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg", "duration": "12:15", "views": "856K"}'::jsonb, 
        'maintenance', org_id, NOW() - INTERVAL '3 days'),
      
      -- Image cards
      ('media.image.1', 'Fleet Update', 'New Vehicle Added', 
        '{"type": "image", "url": "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800", "caption": "Welcome our new truck to the fleet", "alt": "New truck in fleet"}'::jsonb, 
        'trips', org_id, NOW() - INTERVAL '4 hours'),
      
      ('media.image.2', 'Driver of the Month', 'Congratulations!', 
        '{"type": "image", "url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", "caption": "John Smith - Outstanding performance this month", "alt": "Driver of the month"}'::jsonb, 
        'drivers', org_id, NOW() - INTERVAL '1 day'),
      
      -- Playlist cards
      ('media.playlist.1', 'Driver Training Series', 'Watch Playlist', 
        '{"type": "playlist", "playlistId": "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf", "videos": 12, "totalDuration": "2h 30m", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"}'::jsonb, 
        'training', org_id, NOW() - INTERVAL '2 days'),
      
      -- Regular KPI cards
      ('kpi.monthly_distance', 'Monthly Distance Covered', '2,450 km', 
        '{"type": "kpi", "value": 2450, "unit": "km", "trend": "up", "change": "+12%", "period": "January 2024"}'::jsonb, 
        'distance', org_id, NOW() - INTERVAL '1 day'),
      
      ('kpi.fuel_efficiency', 'Average Fuel Efficiency', '12.5 km/l', 
        '{"type": "kpi", "value": 12.5, "unit": "km/l", "trend": "up", "change": "+5%", "period": "January 2024"}'::jsonb, 
        'fuel', org_id, NOW() - INTERVAL '1 day'),
      
      ('kpi.fleet_utilization', 'Fleet Utilization', '78%', 
        '{"type": "kpi", "value": 78, "unit": "%", "trend": "down", "change": "-3%", "period": "January 2024"}'::jsonb, 
        'utilization', org_id, NOW() - INTERVAL '1 day'),
      
      ('kpi.monthly_pnl', 'Monthly P&L', '₹45,200', 
        '{"type": "kpi", "value": 45200, "unit": "₹", "trend": "up", "change": "+8%", "period": "January 2024"}'::jsonb, 
        'pnl', org_id, NOW() - INTERVAL '1 day');
    
  END IF;
END $$;
