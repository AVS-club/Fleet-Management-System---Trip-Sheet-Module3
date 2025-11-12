-- =====================================================
-- Storage Policy Cleanup Script
-- Created: 2025-11-12
-- Purpose: Remove unused/duplicate storage policies for maintenance system
-- =====================================================

-- =====================================================
-- STEP 1: Delete Policies for Unused Buckets
-- =====================================================

-- These buckets exist but are NOT used by the frontend
-- (battery-warranties, tyre-warranties, part-warranties)

DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_part_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_update_part_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_upload_part_warranties" ON storage.objects;
DROP POLICY IF EXISTS "org_users_can_view_part_warranties" ON storage.objects;

-- =====================================================
-- STEP 2: Delete Old Maintenance Bucket Policies
-- =====================================================

-- The old "maintenance" bucket with subfolder structure is deprecated
-- Frontend now uses "maintenance-bills" bucket directly

DROP POLICY IF EXISTS "Allow authenticated users to delete maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update maintenance bills" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload maintenance bills" ON storage.objects;

-- Delete policies with typo ("maintainence" instead of "maintenance")
DROP POLICY IF EXISTS "maintainence-docs-general-policy 594c2b_0" ON storage.objects;
DROP POLICY IF EXISTS "maintainence-docs-general-policy 594c2b_1" ON storage.objects;
DROP POLICY IF EXISTS "maintainence-docs-general-policy 594c2b_2" ON storage.objects;
DROP POLICY IF EXISTS "maintainence-docs-general-policy 594c2b_3" ON storage.objects;

-- Delete generic owner-based policies for old maintenance bucket
DROP POLICY IF EXISTS "Users can delete from maintenance bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from maintenance bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update maintenance bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to maintenance bucket" ON storage.objects;

-- =====================================================
-- STEP 3: Verify Current Active Policies
-- =====================================================

-- After cleanup, you should ONLY have these 4 policies for maintenance-bills:

-- ✅ org_users_can_view_maintenance_bills (SELECT)
-- ✅ org_users_can_upload_maintenance_bills (INSERT)
-- ✅ org_users_can_update_maintenance_bills (UPDATE)
-- ✅ org_admins_can_delete_maintenance_bills (DELETE)

-- Verify they exist:
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%maintenance%'
ORDER BY policyname;

-- =====================================================
-- STEP 4: Optional - Delete Unused Buckets
-- =====================================================

-- WARNING: Only run if you're sure these buckets have no data
-- Uncomment to delete:

-- DELETE FROM storage.buckets WHERE id = 'battery-warranties';
-- DELETE FROM storage.buckets WHERE id = 'tyre-warranties';
-- DELETE FROM storage.buckets WHERE id = 'part-warranties';
-- DELETE FROM storage.buckets WHERE id = 'maintenance'; -- Old bucket

-- =====================================================
-- STEP 5: Verify Frontend Upload Mapping
-- =====================================================

-- All maintenance uploads should use: maintenance-bills bucket
--
-- Frontend Upload → Backend Storage:
-- 1. Upload Bill/Receipts → maintenance_service_tasks.bill_url[]
-- 2. Warranty Paper/Photo → maintenance_service_tasks.battery_warranty_url[] or tyre_warranty_url[]
-- 3. Odometer Photo → maintenance_tasks.odometer_image
-- 4. Supporting Documents → maintenance_tasks.attachments[]
--
-- ALL stored in: maintenance-bills bucket
-- Organization isolation via: org_users_* policies

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this to see final policy count:
SELECT
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE policyname LIKE '%maintenance%') as maintenance_policies
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Expected result after cleanup:
-- total_policies: ~35-40 (down from 56)
-- maintenance_policies: 4 (only for maintenance-bills bucket)
