-- ============================================
-- FIX DESTINATIONS RLS POLICIES
-- ============================================
-- Restore working policies for destinations table

-- First, let's see what policies currently exist
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'destinations';

-- Drop the current policies that aren't working
DROP POLICY IF EXISTS "destinations_delete_policy" ON destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON destinations;
DROP POLICY IF EXISTS "destinations_select_policy" ON destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON destinations;

-- Create working organization-based policies
CREATE POLICY "destinations_org_select" ON destinations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_org_insert" ON destinations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_org_update" ON destinations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_org_delete" ON destinations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Verify the new policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'destinations';
