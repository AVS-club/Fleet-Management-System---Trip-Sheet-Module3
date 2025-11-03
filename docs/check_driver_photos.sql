-- SQL Script to Diagnose and Fix Driver Photo Issues
-- Run this in Supabase SQL Editor

-- ===================================================================
-- STEP 1: Check if driver_photo_url column exists
-- ===================================================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'drivers'
  AND (column_name LIKE '%photo%' OR column_name LIKE '%image%');

-- ===================================================================
-- STEP 2: Check the 12 specific drivers mentioned by user
-- ===================================================================
-- Drivers WITH photos: BANAMALI SAHOO, MANOJ NAIK, SISIRA KISAN,
--                      BHARAT JANGADE, AMAN MALVIYA, SACHIN SHORI
-- Drivers WITHOUT photos: AMIT MESHRAM, LOMASH SAHU, YOGESH KUMAR NAYAK,
--                         SAGAR NISHAD, AMIT KUMAR GHOSLE, AGAR SINGH NISHAD

SELECT
  id,
  name,
  license_number,
  driver_photo_url,
  date_of_birth,
  CASE
    WHEN driver_photo_url IS NOT NULL AND driver_photo_url != '' THEN '✓ Has Photo URL'
    ELSE '✗ Missing Photo URL'
  END as photo_status,
  CASE
    WHEN date_of_birth IS NOT NULL THEN '✓ Has DOB'
    ELSE '✗ Missing DOB'
  END as dob_status
FROM public.drivers
WHERE name IN (
  'BANAMALI SAHOO', 'MANOJ NAIK', 'SISIRA KISAN',
  'BHARAT JANGADE', 'AMAN MALVIYA', 'SACHIN SHORI',
  'AMIT MESHRAM', 'LOMASH SAHU', 'YOGESH KUMAR NAYAK',
  'SAGAR NISHAD', 'AMIT KUMAR GHOSLE', 'AGAR SINGH NISHAD'
)
ORDER BY
  CASE WHEN driver_photo_url IS NOT NULL THEN 0 ELSE 1 END,
  name;

-- ===================================================================
-- STEP 3: Get complete statistics on driver photos
-- ===================================================================
SELECT
  COUNT(*) as total_drivers,
  COUNT(driver_photo_url) as drivers_with_photo_url,
  COUNT(*) - COUNT(driver_photo_url) as drivers_without_photo_url,
  ROUND(100.0 * COUNT(driver_photo_url) / COUNT(*), 2) as percentage_with_photos
FROM public.drivers;

-- ===================================================================
-- STEP 4: Check for alternative photo column (old schema)
-- ===================================================================
-- Some systems might have used 'photo_url' instead of 'driver_photo_url'
SELECT
  id,
  name,
  COALESCE(driver_photo_url, 'NULL') as driver_photo_url,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'drivers' AND column_name = 'photo_url'
    ) THEN 'photo_url column exists'
    ELSE 'photo_url column does not exist'
  END as old_column_status
FROM public.drivers
WHERE name = 'AMIT MESHRAM'
LIMIT 1;

-- ===================================================================
-- STEP 5: Check date_of_birth for the 6 drivers without photos
-- ===================================================================
SELECT
  name,
  license_number,
  date_of_birth,
  TO_CHAR(date_of_birth, 'DD Mon YYYY') as formatted_dob,
  EXTRACT(YEAR FROM AGE(date_of_birth)) as age_years
FROM public.drivers
WHERE name IN (
  'AMIT MESHRAM',
  'LOMASH SAHU',
  'YOGESH KUMAR NAYAK',
  'SAGAR NISHAD',
  'AMIT KUMAR GHOSLE',
  'AGAR SINGH NISHAD'
)
ORDER BY name;

-- ===================================================================
-- STEP 6: Optional - Fix missing photo URLs if photos exist in storage
-- ===================================================================
-- IMPORTANT: Only run this if you've confirmed photos exist in Supabase Storage
-- at paths like: drivers/<driver-id>.jpg or drivers/<driver-id>.png

-- First, check the actual driver IDs for the 6 drivers without photos:
SELECT
  id,
  name,
  license_number
FROM public.drivers
WHERE name IN (
  'AMIT MESHRAM',
  'LOMASH SAHU',
  'YOGESH KUMAR NAYAK',
  'SAGAR NISHAD',
  'AMIT KUMAR GHOSLE',
  'AGAR SINGH NISHAD'
)
ORDER BY name;

-- After checking Storage bucket 'driver-photos' for files at 'drivers/<id>.jpg',
-- you can update specific drivers like this:
--
-- UPDATE public.drivers
-- SET driver_photo_url = 'drivers/<driver-id>.jpg'
-- WHERE id = '<driver-id>';
--
-- Example:
-- UPDATE public.drivers
-- SET driver_photo_url = 'drivers/123e4567-e89b-12d3-a456-426614174000.jpg'
-- WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- ===================================================================
-- STEP 7: Check Storage bucket configuration
-- ===================================================================
-- To verify in Supabase Dashboard:
-- 1. Go to Storage → Buckets
-- 2. Find 'driver-photos' bucket
-- 3. Navigate to 'drivers/' folder
-- 4. Look for files matching the driver IDs from STEP 6
-- 5. If files exist but database column is NULL, use STEP 6 to fix
