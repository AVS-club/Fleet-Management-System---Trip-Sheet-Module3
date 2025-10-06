-- Add organization_id column to drivers table
-- This fixes the driver creation issue where the API tries to insert organization_id
-- but the column doesn't exist in the database

-- Add organization_id column to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_drivers_organization_id ON public.drivers(organization_id);

-- Update existing drivers to have organization_id (if any exist)
-- This will set organization_id to the first organization for existing drivers
UPDATE public.drivers 
SET organization_id = (
  SELECT o.id 
  FROM public.organizations o 
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Add RLS policies for organization-based access (if not already exist)
DO $$
BEGIN
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'drivers' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "drivers_org_select" ON public.drivers;
  DROP POLICY IF EXISTS "drivers_org_insert" ON public.drivers;
  DROP POLICY IF EXISTS "drivers_org_update" ON public.drivers;
  DROP POLICY IF EXISTS "drivers_org_delete" ON public.drivers;
  
  -- Create organization-level policies
  CREATE POLICY "drivers_org_select" ON public.drivers
    FOR SELECT USING (
      organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "drivers_org_insert" ON public.drivers
    FOR INSERT WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "drivers_org_update" ON public.drivers
    FOR UPDATE USING (
      organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "drivers_org_delete" ON public.drivers
    FOR DELETE USING (
      organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    );
END $$;

-- Add comment to document the change
COMMENT ON COLUMN public.drivers.organization_id IS 'Organization ID for multi-tenant isolation. Added to fix driver creation API issues.';
