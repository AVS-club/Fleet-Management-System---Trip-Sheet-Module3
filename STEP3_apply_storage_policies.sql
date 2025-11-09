-- ================================================================
-- STEP 3: Apply Storage RLS Policies for Maintenance Buckets
-- ================================================================
-- Run this to set up proper RLS policies for file uploads
-- ================================================================

-- Drop all existing maintenance storage policies first
DROP POLICY IF EXISTS "org_users_can_view_maintenance_bills" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_upload_maintenance_bills" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_update_maintenance_bills" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_maintenance_bills" ON storage.objects;

DROP POLICY IF EXISTS "org_users_can_view_battery_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_upload_battery_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_update_battery_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_battery_warranties" ON storage.objects;

DROP POLICY IF EXISTS "org_users_can_view_tyre_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_upload_tyre_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_update_tyre_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_tyre_warranties" ON storage.objects;

DROP POLICY IF EXISTS "org_users_can_view_part_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_upload_part_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_update_part_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_part_warranties" ON storage.objects;

-- =====================================================
-- Bucket: maintenance-bills
-- Path: {org-id}/tasks/{task-id}/bills/{filename}
-- =====================================================

CREATE POLICY "org_users_can_view_maintenance_bills" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_upload_maintenance_bills" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_update_maintenance_bills" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_admins_can_delete_maintenance_bills" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

-- =====================================================
-- Bucket: battery-warranties
-- Path: {org-id}/tasks/{task-id}/batteries/{filename}
-- =====================================================

CREATE POLICY "org_users_can_view_battery_warranties" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_upload_battery_warranties" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_update_battery_warranties" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_admins_can_delete_battery_warranties" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

-- =====================================================
-- Bucket: tyre-warranties
-- Path: {org-id}/tasks/{task-id}/tyres/{filename}
-- =====================================================

CREATE POLICY "org_users_can_view_tyre_warranties" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_upload_tyre_warranties" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_update_tyre_warranties" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_admins_can_delete_tyre_warranties" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

-- =====================================================
-- Bucket: part-warranties
-- Path: {org-id}/tasks/{task-id}/parts/{filename}
-- =====================================================

CREATE POLICY "org_users_can_view_part_warranties" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_upload_part_warranties" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_users_can_update_part_warranties" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

CREATE POLICY "org_admins_can_delete_part_warranties" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (string_to_array(name, '/'))[1]::uuid
    )
  );

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%maintenance%'
  OR policyname LIKE '%warranty%'
ORDER BY policyname;
