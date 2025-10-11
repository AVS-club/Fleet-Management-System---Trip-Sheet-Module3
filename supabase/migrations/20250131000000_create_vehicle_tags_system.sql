-- Add organization_id to vehicles table if it doesn't exist
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  color_hex VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, organization_id),
  UNIQUE(slug, organization_id)
);

-- Create vehicle_tags junction table
CREATE TABLE IF NOT EXISTS public.vehicle_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, tag_id)
);

-- Create vehicle_tag_history table for audit trail
CREATE TABLE IF NOT EXISTS public.vehicle_tag_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('added', 'removed')),
  organization_id UUID NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON public.tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_active ON public.tags(active);
CREATE INDEX IF NOT EXISTS idx_vehicle_tags_vehicle_id ON public.vehicle_tags(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tags_tag_id ON public.vehicle_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tags_organization_id ON public.vehicle_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tag_history_vehicle_id ON public.vehicle_tag_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tag_history_tag_id ON public.vehicle_tag_history(tag_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tag_history_organization_id ON public.vehicle_tag_history(organization_id);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_tag_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
CREATE POLICY "Users can view tags in their organization" ON public.tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags in their organization" ON public.tags
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tags in their organization" ON public.tags
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags in their organization" ON public.tags
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for vehicle_tags table
CREATE POLICY "Users can view vehicle_tags in their organization" ON public.vehicle_tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vehicle_tags in their organization" ON public.vehicle_tags
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vehicle_tags in their organization" ON public.vehicle_tags
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vehicle_tags in their organization" ON public.vehicle_tags
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for vehicle_tag_history table (read-only for regular users)
CREATE POLICY "Users can view vehicle_tag_history in their organization" ON public.vehicle_tag_history
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger function for automatic history logging
CREATE OR REPLACE FUNCTION log_vehicle_tag_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vehicle_tag_history (vehicle_id, tag_id, action, organization_id, performed_by)
    VALUES (NEW.vehicle_id, NEW.tag_id, 'added', NEW.organization_id, NEW.added_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.vehicle_tag_history (vehicle_id, tag_id, action, organization_id, performed_by)
    VALUES (OLD.vehicle_id, OLD.tag_id, 'removed', OLD.organization_id, OLD.added_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vehicle_tags table
CREATE TRIGGER vehicle_tag_history_trigger
  AFTER INSERT OR DELETE ON public.vehicle_tags
  FOR EACH ROW EXECUTE FUNCTION log_vehicle_tag_changes();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tags table updated_at
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
