/*
  # Fix Multi-Tenant RLS Policies - Switch from User-Level to Organization-Level

  This migration fixes the broken multi-tenant isolation by replacing user-level (created_by/added_by)
  policies with organization-level (organization_id) policies.

  Affected tables:
  - trips (currently uses created_by)
  - destinations (currently uses added_by)
  - warehouses (currently uses created_by)
  - drivers (needs org-level policies)
  - vehicles (needs org-level policies)

  Security Model:
  - Users can view/edit ALL data within their organization
  - Only owners/admins can delete data
*/

-- ============================================
-- 1. FIX TRIPS TABLE
-- ============================================
-- Drop old user-level policies
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_update_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON public.trips;

-- Create new organization-level policies
CREATE POLICY "trips_org_select" ON public.trips
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_org_insert" ON public.trips
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_org_update" ON public.trips
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_org_delete" ON public.trips
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 2. FIX DESTINATIONS TABLE
-- ============================================
-- Drop old user-level policies
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_delete_policy" ON public.destinations;

-- Create new organization-level policies
CREATE POLICY "destinations_org_select" ON public.destinations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_org_insert" ON public.destinations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_org_update" ON public.destinations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_org_delete" ON public.destinations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 3. FIX WAREHOUSES TABLE
-- ============================================
-- Drop old user-level policies
DROP POLICY IF EXISTS "warehouses_select_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_insert_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_update_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_delete_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses all" ON public.warehouses;

-- Create new organization-level policies
CREATE POLICY "warehouses_org_select" ON public.warehouses
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warehouses_org_insert" ON public.warehouses
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warehouses_org_update" ON public.warehouses
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warehouses_org_delete" ON public.warehouses
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 4. FIX DRIVERS TABLE
-- ============================================
-- Drop any existing policies
DROP POLICY IF EXISTS "drivers_select_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_delete_policy" ON public.drivers;
DROP POLICY IF EXISTS "drivers_org_select" ON public.drivers;
DROP POLICY IF EXISTS "drivers_org_insert" ON public.drivers;
DROP POLICY IF EXISTS "drivers_org_update" ON public.drivers;
DROP POLICY IF EXISTS "drivers_org_delete" ON public.drivers;

-- Enable RLS if not already enabled
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 5. FIX VEHICLES TABLE
-- ============================================
-- Drop any existing policies
DROP POLICY IF EXISTS "vehicles_select_policy" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_org_select" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_org_insert" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_org_update" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_org_delete" ON public.vehicles;

-- Enable RLS if not already enabled
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create organization-level policies
CREATE POLICY "vehicles_org_select" ON public.vehicles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_org_insert" ON public.vehicles
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_org_update" ON public.vehicles
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_org_delete" ON public.vehicles
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 6. FIX ORGANIZATION_USERS TABLE (prevent recursion)
-- ============================================
-- Drop any recursive policies
DROP POLICY IF EXISTS "organization_users_simple_select" ON public.organization_users;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_users;
DROP POLICY IF EXISTS "org_users_select_self" ON public.organization_users;
DROP POLICY IF EXISTS "Users can read own membership" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_select_own" ON public.organization_users;

-- Enable RLS if not already enabled
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Create simple non-recursive policy
CREATE POLICY "organization_users_select_own" ON public.organization_users
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the policies are correctly set up
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'All tables now use organization_id for multi-tenant isolation.';
  RAISE NOTICE 'Run the following query to verify policies:';
  RAISE NOTICE 'SELECT tablename, policyname FROM pg_policies WHERE tablename IN (''trips'', ''destinations'', ''warehouses'', ''drivers'', ''vehicles'', ''organization_users'') ORDER BY tablename, policyname;';
END $$;
