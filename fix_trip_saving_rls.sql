-- Fix RLS policies for trip saving issues
-- This script addresses potential RLS policy problems that prevent data entry users from saving trips

-- First, let's check the current RLS policies on trips table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'trips';

-- Ensure organization_users table has proper RLS policies
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "organization_users_simple_select" ON organization_users;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
DROP POLICY IF EXISTS "org_users_select_self" ON organization_users;
DROP POLICY IF EXISTS "Users can read own membership" ON organization_users;

-- Create a simple, non-recursive policy for organization_users
CREATE POLICY "organization_users_select_own"
ON organization_users
FOR SELECT
USING (user_id = auth.uid());

-- Ensure trips table has proper RLS policies
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Drop existing trip policies that might be causing issues
DROP POLICY IF EXISTS "trips_org_select" ON trips;
DROP POLICY IF EXISTS "trips_org_insert" ON trips;
DROP POLICY IF EXISTS "trips_org_update" ON trips;
DROP POLICY IF EXISTS "trips_org_delete" ON trips;

-- Create new trip policies that work with organization_users
CREATE POLICY "trips_org_select"
ON trips
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "trips_org_insert"
ON trips
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "trips_org_update"
ON trips
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "trips_org_delete"
ON trips
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

-- Ensure vehicles table has proper RLS policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Drop existing vehicle policies
DROP POLICY IF EXISTS "vehicles_org_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_org_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_org_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_org_delete" ON vehicles;

-- Create new vehicle policies
CREATE POLICY "vehicles_org_select"
ON vehicles
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "vehicles_org_insert"
ON vehicles
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "vehicles_org_update"
ON vehicles
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "vehicles_org_delete"
ON vehicles
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

-- Ensure drivers table has proper RLS policies
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Drop existing driver policies
DROP POLICY IF EXISTS "drivers_org_select" ON drivers;
DROP POLICY IF EXISTS "drivers_org_insert" ON drivers;
DROP POLICY IF EXISTS "drivers_org_update" ON drivers;
DROP POLICY IF EXISTS "drivers_org_delete" ON drivers;

-- Create new driver policies
CREATE POLICY "drivers_org_select"
ON drivers
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "drivers_org_insert"
ON drivers
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "drivers_org_update"
ON drivers
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "drivers_org_delete"
ON drivers
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

-- Verify the policies are working
SELECT 'RLS policies updated successfully' as status;
