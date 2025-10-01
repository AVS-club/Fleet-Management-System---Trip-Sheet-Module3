-- ============================================
-- COMPREHENSIVE FIX FOR SUPABASE DATA ACCESS ISSUES
-- ============================================

-- Step 1: Fix the infinite recursion in organization_users RLS policies
-- ============================================

-- Drop ALL existing policies on organization_users to eliminate recursion
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
DROP POLICY IF EXISTS "org_users_select_self" ON organization_users;
DROP POLICY IF EXISTS "Users can read own membership" ON organization_users;
DROP POLICY IF EXISTS "Users can view own organization membership" ON organization_users;

-- Temporarily disable RLS on organization_users to test
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify organization_id is properly set on all tables
-- ============================================

-- Check current state
SELECT 
  'vehicles' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id,
  COUNT(*) - COUNT(organization_id) as missing_org_id
FROM vehicles

UNION ALL

SELECT 
  'drivers',
  COUNT(*),
  COUNT(organization_id),
  COUNT(*) - COUNT(organization_id)
FROM drivers

UNION ALL

SELECT 
  'trips',
  COUNT(*),
  COUNT(organization_id),
  COUNT(*) - COUNT(organization_id)
FROM trips

UNION ALL

SELECT 
  'warehouses',
  COUNT(*),
  COUNT(organization_id),
  COUNT(*) - COUNT(organization_id)
FROM warehouses

UNION ALL

SELECT 
  'destinations',
  COUNT(*),
  COUNT(organization_id),
  COUNT(*) - COUNT(organization_id)
FROM destinations;

-- Step 3: Fix any missing organization_id values
-- ============================================

-- Remove NOT NULL constraints temporarily if they exist
DO $$
BEGIN
  -- Check if NOT NULL constraint exists and remove it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%organization_id%' 
    AND constraint_type = 'CHECK'
    AND table_name IN ('vehicles', 'drivers', 'trips')
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN organization_id DROP NOT NULL;
    ALTER TABLE drivers ALTER COLUMN organization_id DROP NOT NULL;
    ALTER TABLE trips ALTER COLUMN organization_id DROP NOT NULL;
  END IF;
END $$;

-- Clear any incorrectly populated organization_id values (user_ids instead of org_ids)
UPDATE vehicles SET organization_id = NULL WHERE organization_id IN (
  SELECT id FROM auth.users
);

UPDATE drivers SET organization_id = NULL WHERE organization_id IN (
  SELECT id FROM auth.users
);

UPDATE trips SET organization_id = NULL WHERE organization_id IN (
  SELECT id FROM auth.users
);

-- Repopulate organization_id correctly
UPDATE vehicles v
SET organization_id = (
  SELECT ou.organization_id 
  FROM organization_users ou 
  WHERE ou.user_id = COALESCE(v.added_by, v.created_by)
  LIMIT 1
)
WHERE organization_id IS NULL;

UPDATE drivers d
SET organization_id = (
  SELECT ou.organization_id 
  FROM organization_users ou 
  WHERE ou.user_id = COALESCE(d.added_by, d.created_by)
  LIMIT 1
)
WHERE organization_id IS NULL;

UPDATE trips t
SET organization_id = (
  SELECT ou.organization_id 
  FROM organization_users ou 
  WHERE ou.user_id = COALESCE(t.added_by, t.created_by)
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Fix destinations if needed
UPDATE destinations d
SET organization_id = (
  SELECT ou.organization_id 
  FROM organization_users ou 
  WHERE ou.user_id = COALESCE(d.added_by, d.created_by)
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 4: Add back NOT NULL constraints
-- ============================================

ALTER TABLE vehicles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE drivers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE trips ALTER COLUMN organization_id SET NOT NULL;

-- Step 5: Add foreign key constraints if they don't exist
-- ============================================

DO $$
BEGIN
  -- Vehicles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicles_organization_id_fkey'
  ) THEN
    ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Drivers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_organization_id_fkey'
  ) THEN
    ALTER TABLE drivers
    ADD CONSTRAINT drivers_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Trips
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_organization_id_fkey'
  ) THEN
    ALTER TABLE trips
    ADD CONSTRAINT trips_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Clean up conflicting RLS policies on main tables
-- ============================================

-- Drop all conflicting policies on vehicles
DROP POLICY IF EXISTS "Only owners can delete vehicles" ON vehicles;
DROP POLICY IF EXISTS "Org vehicles delete" ON vehicles;
DROP POLICY IF EXISTS "Org vehicles insert" ON vehicles;
DROP POLICY IF EXISTS "Org vehicles select" ON vehicles;
DROP POLICY IF EXISTS "Org vehicles update" ON vehicles;
DROP POLICY IF EXISTS "Users can insert organization vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update organization vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view organization vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "org_modify_vehicles" ON vehicles;
DROP POLICY IF EXISTS "org_read_vehicles" ON vehicles;
DROP POLICY IF EXISTS "veh delete own" ON vehicles;
DROP POLICY IF EXISTS "veh insert own" ON vehicles;
DROP POLICY IF EXISTS "veh select own" ON vehicles;
DROP POLICY IF EXISTS "veh update own" ON vehicles;
DROP POLICY IF EXISTS "vehicles_secure" ON vehicles;

-- Drop all conflicting policies on drivers
DROP POLICY IF EXISTS "Only owners can delete drivers" ON drivers;
DROP POLICY IF EXISTS "Org drivers delete" ON drivers;
DROP POLICY IF EXISTS "Org drivers insert" ON drivers;
DROP POLICY IF EXISTS "Org drivers select" ON drivers;
DROP POLICY IF EXISTS "Org drivers update" ON drivers;
DROP POLICY IF EXISTS "Users can insert organization drivers" ON drivers;
DROP POLICY IF EXISTS "Users can update organization drivers" ON drivers;
DROP POLICY IF EXISTS "Users can view organization drivers" ON drivers;
DROP POLICY IF EXISTS "drivers_delete" ON drivers;
DROP POLICY IF EXISTS "drivers_insert" ON drivers;
DROP POLICY IF EXISTS "drivers_select" ON drivers;
DROP POLICY IF EXISTS "drivers_update" ON drivers;

-- Drop all conflicting policies on trips
DROP POLICY IF EXISTS "Only owners can delete trips" ON trips;
DROP POLICY IF EXISTS "Org trips delete" ON trips;
DROP POLICY IF EXISTS "Org trips insert" ON trips;
DROP POLICY IF EXISTS "Org trips select" ON trips;
DROP POLICY IF EXISTS "Org trips update" ON trips;
DROP POLICY IF EXISTS "Users can insert organization trips" ON trips;
DROP POLICY IF EXISTS "Users can update organization trips" ON trips;
DROP POLICY IF EXISTS "Users can view organization trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips for their vehicles" ON trips;
DROP POLICY IF EXISTS "trips_delete_secure" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_select_secure" ON trips;
DROP POLICY IF EXISTS "trips_update_secure" ON trips;

-- Drop all conflicting policies on warehouses
DROP POLICY IF EXISTS "Only owners can delete warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can insert organization warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can update organization warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can view organization warehouses" ON warehouses;

-- Step 7: Create clean, simple RLS policies
-- ============================================

-- VEHICLES: Simple organization-based access
CREATE POLICY "vehicles_org_select" ON vehicles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_org_insert" ON vehicles
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_org_update" ON vehicles
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_org_delete" ON vehicles
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- DRIVERS: Simple organization-based access
CREATE POLICY "drivers_org_select" ON drivers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_org_insert" ON drivers
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_org_update" ON drivers
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "drivers_org_delete" ON drivers
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- TRIPS: Simple organization-based access
CREATE POLICY "trips_org_select" ON trips
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_org_insert" ON trips
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_org_update" ON trips
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_org_delete" ON trips
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- WAREHOUSES: Simple organization-based access
CREATE POLICY "warehouses_org_select" ON warehouses
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warehouses_org_insert" ON warehouses
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warehouses_org_update" ON warehouses
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warehouses_org_delete" ON warehouses
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Step 8: Re-enable RLS on main tables
-- ============================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Step 9: Create simple policy for organization_users (NO RECURSION)
-- ============================================

-- Re-enable RLS on organization_users
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Create simple non-recursive policy
CREATE POLICY "organization_users_simple_select"
ON organization_users
FOR SELECT
USING (user_id = auth.uid());

-- Step 10: Verify the fix
-- ============================================

-- Test the exact query the frontend makes
SELECT 
  organization_id,
  role,
  organizations.id,
  organizations.name
FROM organization_users
LEFT JOIN organizations ON organizations.id = organization_users.organization_id
WHERE user_id = '216a04c7-9d95-411e-b986-b7a17038bbc3';

-- Check what data the owner should see
SELECT 
  'Vehicles' as type,
  COUNT(*) as count
FROM vehicles 
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'

UNION ALL

SELECT 'Drivers', COUNT(*) 
FROM drivers
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'

UNION ALL

SELECT 'Trips', COUNT(*)
FROM trips
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'

UNION ALL

SELECT 'Warehouses', COUNT(*)
FROM warehouses
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';

-- Final verification
SELECT 
  'vehicles' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as records_with_org_id,
  COUNT(*) - COUNT(organization_id) as missing_org_id
FROM vehicles

UNION ALL

SELECT 
  'drivers',
  COUNT(*),
  COUNT(organization_id),
  COUNT(*) - COUNT(organization_id)
FROM drivers

UNION ALL

SELECT 
  'trips',
  COUNT(*),
  COUNT(organization_id),
  COUNT(*) - COUNT(organization_id)
FROM trips;
