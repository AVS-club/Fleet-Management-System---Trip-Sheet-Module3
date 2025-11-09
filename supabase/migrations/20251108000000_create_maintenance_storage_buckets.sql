-- Migration: Create Maintenance Storage Buckets with Organization-based RLS
-- Created: 2025-11-08
-- Description: Sets up storage buckets for maintenance-related files with organization isolation
--
-- Buckets created:
-- 1. maintenance-bills - For maintenance invoices/bills
-- 2. battery-warranties - For battery warranty documents
-- 3. tyre-warranties - For tyre warranty documents
-- 4. part-warranties - For all other parts warranty documents
--
-- Security: RLS policies ensure complete organization-level data isolation

-- =====================================================
-- STEP 1: Create Storage Buckets
-- =====================================================
-- Note: Storage buckets are created via Supabase API, not SQL DDL
-- This SQL file only sets up RLS policies for the buckets
-- Buckets must be created manually or via setup script:
--
-- Required manual steps (run in Supabase Dashboard > Storage):
-- 1. Create bucket "maintenance-bills" (Private, no file size limit)
-- 2. Create bucket "battery-warranties" (Private, no file size limit)
-- 3. Create bucket "tyre-warranties" (Private, no file size limit)
-- 4. Create bucket "part-warranties" (Private, no file size limit)

-- =====================================================
-- STEP 2: Create RLS Policies for Organization Isolation
-- =====================================================

-- ----------------------------------------------------
-- Bucket: maintenance-bills
-- Path structure: {org-id}/tasks/{task-id}/bills/{filename}
-- ----------------------------------------------------

-- Allow users to view bills from their organization
CREATE POLICY "org_users_can_view_maintenance_bills" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        -- Extract org_id from path: org-id/tasks/task-id/bills/filename
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

-- Allow users to upload bills to their organization's folder
CREATE POLICY "org_users_can_upload_maintenance_bills" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

-- Allow users to update bills from their organization
CREATE POLICY "org_users_can_update_maintenance_bills" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

-- Only org admins/owners can delete bills
CREATE POLICY "org_admins_can_delete_maintenance_bills" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'maintenance-bills' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (
              (string_to_array(name, '/'))[1]::uuid
            )
    )
  );

-- ----------------------------------------------------
-- Bucket: battery-warranties
-- Path structure: {org-id}/tasks/{task-id}/batteries/{filename}
-- ----------------------------------------------------

CREATE POLICY "org_users_can_view_battery_warranties" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_users_can_upload_battery_warranties" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_users_can_update_battery_warranties" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_admins_can_delete_battery_warranties" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'battery-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (
              (string_to_array(name, '/'))[1]::uuid
            )
    )
  );

-- ----------------------------------------------------
-- Bucket: tyre-warranties
-- Path structure: {org-id}/tasks/{task-id}/tyres/{filename}
-- ----------------------------------------------------

CREATE POLICY "org_users_can_view_tyre_warranties" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_users_can_upload_tyre_warranties" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_users_can_update_tyre_warranties" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_admins_can_delete_tyre_warranties" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tyre-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (
              (string_to_array(name, '/'))[1]::uuid
            )
    )
  );

-- ----------------------------------------------------
-- Bucket: part-warranties
-- Path structure: {org-id}/tasks/{task-id}/parts/{filename}
-- ----------------------------------------------------

CREATE POLICY "org_users_can_view_part_warranties" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_users_can_upload_part_warranties" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_users_can_update_part_warranties" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE organization_id = (
        (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

CREATE POLICY "org_admins_can_delete_part_warranties" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'part-warranties' AND
    auth.uid() IN (
      SELECT user_id FROM organization_users
      WHERE role IN ('owner', 'admin') AND
            organization_id = (
              (string_to_array(name, '/'))[1]::uuid
            )
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration:
-- 1. Verify buckets exist in Supabase Dashboard > Storage
-- 2. Check that RLS is enabled on all 4 buckets
-- 3. Test file upload with organization-based path structure
-- 4. Verify cross-organization isolation (users can't access other orgs' files)
