-- =====================================================
-- ZOMBIE CODE REMOVAL: Battery & Tyre Tracking System
-- Created: 2025-11-14
-- Description:
--   Removes ALL old battery/tyre specific tracking code
--   Migrates any existing data to unified parts_data system
--   Drops zombie columns that cause 400 errors
-- =====================================================

-- STEP 1: Migrate existing battery_data to parts_data
-- =====================================================
DO $$
DECLARE
  service_group RECORD;
  existing_parts JSONB;
  battery_part JSONB;
BEGIN
  -- Loop through all service groups that have battery_data
  FOR service_group IN
    SELECT id, battery_data, parts_data
    FROM maintenance_service_tasks
    WHERE battery_data IS NOT NULL
      AND battery_data::text != '{}'
      AND battery_data::text != 'null'
  LOOP
    -- Get existing parts_data or initialize empty array
    existing_parts := COALESCE(service_group.parts_data, '[]'::jsonb);

    -- Create battery part from battery_data
    battery_part := jsonb_build_object(
      'partType', 'battery',
      'partName', 'Battery',
      'brand', COALESCE(service_group.battery_data->>'brand', 'Unknown'),
      'serialNumber', COALESCE(service_group.battery_data->>'serialNumber', ''),
      'quantity', 1,
      'warrantyPeriod', NULL,
      'warrantyDocumentUrl', NULL
    );

    -- Append battery to parts_data array
    UPDATE maintenance_service_tasks
    SET parts_data = existing_parts || jsonb_build_array(battery_part)
    WHERE id = service_group.id;

    RAISE NOTICE 'Migrated battery_data to parts_data for service group: %', service_group.id;
  END LOOP;
END $$;

-- STEP 2: Migrate existing tyre_data to parts_data
-- =====================================================
DO $$
DECLARE
  service_group RECORD;
  existing_parts JSONB;
  tyre_part JSONB;
  position TEXT;
  positions_array TEXT[];
BEGIN
  -- Loop through all service groups that have tyre_data
  FOR service_group IN
    SELECT id, tyre_data, parts_data
    FROM maintenance_service_tasks
    WHERE tyre_data IS NOT NULL
      AND tyre_data::text != '{}'
      AND tyre_data::text != 'null'
      AND tyre_data->'positions' IS NOT NULL
  LOOP
    -- Get existing parts_data or initialize empty array
    existing_parts := COALESCE(service_group.parts_data, '[]'::jsonb);

    -- Extract positions array
    SELECT ARRAY(SELECT jsonb_array_elements_text(service_group.tyre_data->'positions'))
    INTO positions_array;

    -- Create tyre part from tyre_data
    tyre_part := jsonb_build_object(
      'partType', 'tyre',
      'partName', 'Tyre',
      'brand', COALESCE(service_group.tyre_data->>'brand', 'Unknown'),
      'serialNumber', COALESCE(service_group.tyre_data->>'serialNumbers', ''),
      'quantity', array_length(positions_array, 1),
      'warrantyPeriod', NULL,
      'warrantyDocumentUrl', NULL,
      'tyrePositions', positions_array  -- Keep position info
    );

    -- Append tyre to parts_data array
    UPDATE maintenance_service_tasks
    SET parts_data = existing_parts || jsonb_build_array(tyre_part)
    WHERE id = service_group.id;

    RAISE NOTICE 'Migrated tyre_data to parts_data for service group: %', service_group.id;
  END LOOP;
END $$;

-- STEP 3: Drop zombie columns
-- =====================================================

-- Drop battery_data column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    AND column_name = 'battery_data'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN battery_data;
    RAISE NOTICE '✅ Dropped battery_data column';
  ELSE
    RAISE NOTICE 'ℹ️  battery_data column already removed';
  END IF;
END $$;

-- Drop tyre_data column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    AND column_name = 'tyre_data'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN tyre_data;
    RAISE NOTICE '✅ Dropped tyre_data column';
  ELSE
    RAISE NOTICE 'ℹ️  tyre_data column already removed';
  END IF;
END $$;

-- Drop battery_warranty_url column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    AND column_name = 'battery_warranty_url'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN battery_warranty_url;
    RAISE NOTICE '✅ Dropped battery_warranty_url column';
  ELSE
    RAISE NOTICE 'ℹ️  battery_warranty_url column already removed';
  END IF;
END $$;

-- Drop tyre_warranty_url column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    AND column_name = 'tyre_warranty_url'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN tyre_warranty_url;
    RAISE NOTICE '✅ Dropped tyre_warranty_url column';
  ELSE
    RAISE NOTICE 'ℹ️  tyre_warranty_url column already removed';
  END IF;
END $$;

-- Drop battery_warranty_expiry_date column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    AND column_name = 'battery_warranty_expiry_date'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN battery_warranty_expiry_date;
    RAISE NOTICE '✅ Dropped battery_warranty_expiry_date column';
  ELSE
    RAISE NOTICE 'ℹ️  battery_warranty_expiry_date column already removed';
  END IF;
END $$;

-- Drop tyre_warranty_expiry_date column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    AND column_name = 'tyre_warranty_expiry_date'
  ) THEN
    ALTER TABLE maintenance_service_tasks DROP COLUMN tyre_warranty_expiry_date;
    RAISE NOTICE '✅ Dropped tyre_warranty_expiry_date column';
  ELSE
    RAISE NOTICE 'ℹ️  tyre_warranty_expiry_date column already removed';
  END IF;
END $$;

-- STEP 4: Remove storage policies for old buckets
-- =====================================================
DO $$
BEGIN
  -- Drop battery-warranties bucket policies
  DROP POLICY IF EXISTS "Allow authenticated uploads to battery-warranties" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read from battery-warranties" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete from battery-warranties" ON storage.objects;

  -- Drop tyre-warranties bucket policies
  DROP POLICY IF EXISTS "Allow authenticated uploads to tyre-warranties" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read from tyre-warranties" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete from tyre-warranties" ON storage.objects;

  RAISE NOTICE '✅ Removed storage policies for battery/tyre warranty buckets';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️  Storage policies may not exist or already removed';
END $$;

-- STEP 5: Verification
-- =====================================================
DO $$
DECLARE
  zombie_columns TEXT[];
  zombie_count INTEGER;
BEGIN
  -- Check for any remaining zombie columns
  SELECT ARRAY_AGG(column_name)
  INTO zombie_columns
  FROM information_schema.columns
  WHERE table_name = 'maintenance_service_tasks'
    AND (column_name LIKE '%battery%' OR column_name LIKE '%tyre%');

  zombie_count := COALESCE(array_length(zombie_columns, 1), 0);

  IF zombie_count > 0 THEN
    RAISE WARNING '⚠️  Found % zombie columns still remaining: %', zombie_count, zombie_columns;
  ELSE
    RAISE NOTICE '🎉 SUCCESS! All zombie columns removed!';
  END IF;

  -- Show what columns remain
  RAISE NOTICE '📋 Remaining columns in maintenance_service_tasks:';
  FOR column_rec IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '   - % (%)', column_rec.column_name, column_rec.data_type;
  END LOOP;
END $$;

-- =====================================================
-- MANUAL STEPS (DO IN SUPABASE DASHBOARD):
-- =====================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Delete bucket: "battery-warranties" (if exists)
-- 3. Delete bucket: "tyre-warranties" (if exists)
-- 4. Keep ONLY: "maintenance-bills" bucket
-- =====================================================

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after migration to verify:
/*
SELECT
  id,
  parts_data,
  bill_url,
  notes,
  created_at
FROM maintenance_service_tasks
ORDER BY created_at DESC
LIMIT 5;

-- Should show:
-- ✅ parts_data contains all parts (including migrated batteries/tyres)
-- ✅ No battery_data column
-- ✅ No tyre_data column
-- ✅ No battery_warranty_url column
-- ✅ No tyre_warranty_url column
*/
