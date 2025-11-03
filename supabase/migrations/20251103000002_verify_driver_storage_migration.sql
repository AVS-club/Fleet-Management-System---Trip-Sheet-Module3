-- Migration: Verification query for driver storage path migration
-- Description: Verify that all driver photo paths now use UUID format
-- Date: 2025-11-03
-- Purpose: Run this AFTER the migration script to confirm success

-- =============================================================================
-- VERIFICATION: Check migration success rate
-- =============================================================================

SELECT
  COUNT(*) FILTER (WHERE driver_photo_url IS NULL) as no_photo,
  COUNT(*) FILTER (WHERE driver_photo_url LIKE 'data:%') as data_url,
  COUNT(*) FILTER (WHERE driver_photo_url LIKE 'http%') as full_url,
  COUNT(*) FILTER (WHERE driver_photo_url LIKE id::text || '/%') as uuid_correct,
  COUNT(*) FILTER (
    WHERE driver_photo_url IS NOT NULL
    AND driver_photo_url NOT LIKE 'data:%'
    AND driver_photo_url NOT LIKE 'http%'
    AND driver_photo_url NOT LIKE id::text || '/%'
  ) as needs_migration,
  COUNT(*) as total_drivers
FROM public.drivers;

-- =============================================================================
-- DETAILED CHECK: List any drivers still needing migration
-- =============================================================================

SELECT
  id,
  name,
  license_number,
  driver_photo_url,
  created_at,
  'NEEDS MIGRATION ✗' as status
FROM public.drivers
WHERE driver_photo_url IS NOT NULL
  AND driver_photo_url NOT LIKE 'data:%'
  AND driver_photo_url NOT LIKE 'http%'
  AND driver_photo_url NOT LIKE id::text || '/%'
ORDER BY created_at DESC;

-- =============================================================================
-- SUCCESS CHECK: List drivers with correct UUID paths
-- =============================================================================

SELECT
  id,
  name,
  license_number,
  driver_photo_url,
  created_at,
  'CORRECT ✓' as status
FROM public.drivers
WHERE driver_photo_url LIKE id::text || '/%'
ORDER BY created_at DESC
LIMIT 20;

-- =============================================================================
-- STORAGE CLEANUP: Identify old folders that can be deleted
-- =============================================================================

-- After verification, old storage folders can be deleted manually
-- This query shows which folders should exist based on current database state

SELECT
  DISTINCT
  SPLIT_PART(driver_photo_url, '/', 1) as storage_folder,
  COUNT(*) as file_count
FROM public.drivers
WHERE driver_photo_url IS NOT NULL
  AND driver_photo_url NOT LIKE 'data:%'
  AND driver_photo_url NOT LIKE 'http%'
GROUP BY storage_folder
ORDER BY file_count DESC;

-- =============================================================================
-- NOTES:
-- =============================================================================
-- Expected results after successful migration:
-- - uuid_correct count should equal number of drivers with storage-based photos
-- - needs_migration count should be 0
-- - All photo URLs should follow pattern: {uuid}/profile-photo/photo.{ext}
--
-- If needs_migration > 0:
-- - Re-run the migration script (scripts/migrate_driver_photos.js)
-- - Check error logs for failed migrations
-- - Manually investigate problematic drivers
--
-- After verification:
-- - Old storage folders (license numbers, temp IDs) can be deleted from Supabase Storage
-- - Keep backups for at least 30 days before deletion
