-- Migration: Audit driver storage paths for UUID consistency
-- Description: Identifies drivers with storage folders using license numbers or temp IDs instead of UUIDs
-- Date: 2025-11-03
-- Purpose: Find which drivers need storage path migration

-- =============================================================================
-- AUDIT QUERY: Find all drivers with mismatched storage paths
-- =============================================================================

SELECT
  id,
  name,
  license_number,
  driver_photo_url,
  CASE
    WHEN driver_photo_url IS NULL THEN 'NO_PHOTO'
    WHEN driver_photo_url LIKE 'data:%' THEN 'DATA_URL'
    WHEN driver_photo_url LIKE 'http%' THEN 'FULL_URL'
    WHEN driver_photo_url LIKE id::text || '/%' THEN 'UUID_CORRECT ✓'
    WHEN driver_photo_url ~ '^[A-Z]{2}[0-9]{12,14}/' THEN 'LICENSE_NUMBER ✗'
    WHEN driver_photo_url LIKE 'temp-%' THEN 'TEMP_ID ✗'
    WHEN driver_photo_url LIKE 'drivers/%' THEN 'OLD_FORMAT ✗'
    ELSE 'UNKNOWN ✗'
  END as path_status,
  created_at
FROM public.drivers
ORDER BY
  CASE
    WHEN driver_photo_url IS NULL THEN 5
    WHEN driver_photo_url LIKE 'data:%' THEN 4
    WHEN driver_photo_url LIKE id::text || '/%' THEN 3
    ELSE 1
  END,
  name;

-- =============================================================================
-- SUMMARY: Count drivers by path status
-- =============================================================================

SELECT
  CASE
    WHEN driver_photo_url IS NULL THEN 'NO_PHOTO'
    WHEN driver_photo_url LIKE 'data:%' THEN 'DATA_URL'
    WHEN driver_photo_url LIKE 'http%' THEN 'FULL_URL'
    WHEN driver_photo_url LIKE id::text || '/%' THEN 'UUID_CORRECT ✓'
    WHEN driver_photo_url ~ '^[A-Z]{2}[0-9]{12,14}/' THEN 'LICENSE_NUMBER ✗'
    WHEN driver_photo_url LIKE 'temp-%' THEN 'TEMP_ID ✗'
    WHEN driver_photo_url LIKE 'drivers/%' THEN 'OLD_FORMAT ✗'
    ELSE 'UNKNOWN ✗'
  END as path_status,
  COUNT(*) as driver_count
FROM public.drivers
GROUP BY path_status
ORDER BY
  CASE
    WHEN driver_photo_url IS NULL THEN 5
    WHEN driver_photo_url LIKE 'data:%' THEN 4
    WHEN driver_photo_url LIKE id::text || '/%' THEN 3
    ELSE 1
  END;

-- =============================================================================
-- MIGRATION PLAN: Generate new paths for drivers needing migration
-- =============================================================================

SELECT
  id,
  name,
  driver_photo_url as old_path,
  id::text || '/profile-photo/photo.' ||
    COALESCE(
      NULLIF(SPLIT_PART(driver_photo_url, '.', -1), ''),
      'jpg'
    ) as new_path
FROM public.drivers
WHERE driver_photo_url IS NOT NULL
  AND driver_photo_url NOT LIKE 'data:%'
  AND driver_photo_url NOT LIKE 'http%'
  AND driver_photo_url NOT LIKE id::text || '/%'
ORDER BY name;

-- =============================================================================
-- NOTES:
-- =============================================================================
-- This is a read-only audit query. No data is modified.
--
-- Next steps:
-- 1. Run this query to identify affected drivers
-- 2. Run the Node.js migration script (scripts/migrate_driver_photos.js)
-- 3. Run the verification query (20251103000002_verify_driver_storage_migration.sql)
--
-- Migration script will:
-- - Copy files from old paths to new UUID-based paths in Supabase Storage
-- - Update driver_photo_url in the database
-- - Preserve old files temporarily for safety
