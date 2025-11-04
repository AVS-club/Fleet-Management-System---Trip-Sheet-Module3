-- Migration: Fix Chronological Sorting for AI Alerts Feed
-- Date: 2025-11-04
-- Purpose: Fix event_time to use activity timestamps instead of future dates,
--          add activity tracking columns, and enable "recently viewed" features

-- ============================================================================
-- PART 1: Add Activity Tracking Columns
-- ============================================================================

-- Add tracking columns to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_viewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add tracking columns to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_viewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add tracking columns to trips table
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_viewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_last_viewed_at ON public.vehicles(last_viewed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_drivers_last_viewed_at ON public.drivers(last_viewed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_trips_last_viewed_at ON public.trips(last_viewed_at DESC NULLS LAST);

-- ============================================================================
-- PART 2: Backfill Existing Maintenance Events with Correct Timestamps
-- ============================================================================

-- Update maintenance events to use created_at from maintenance_tasks instead of start_date
UPDATE public.events_feed ef
SET event_time = mt.created_at
FROM public.maintenance_tasks mt
WHERE ef.kind = 'maintenance'
  AND ef.entity_json->>'task_id' = mt.id::text
  AND mt.created_at IS NOT NULL
  AND ef.event_time = mt.start_date; -- Only update if currently using start_date

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % maintenance events to use created_at timestamps', updated_count;
END $$;

-- ============================================================================
-- PART 3: Create Function to Track Entity Views
-- ============================================================================

CREATE OR REPLACE FUNCTION public.track_entity_view(
  entity_table TEXT,
  entity_id UUID,
  user_id UUID,
  org_id UUID,
  entity_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  current_view_count INTEGER;
BEGIN
  -- Update the entity's view tracking columns
  EXECUTE format('
    UPDATE %I
    SET last_viewed_at = NOW(),
        last_viewed_by = $1,
        view_count = COALESCE(view_count, 0) + 1
    WHERE id = $2
    RETURNING view_count
  ', entity_table)
  USING user_id, entity_id
  INTO current_view_count;

  -- Create a feed event for this view activity
  INSERT INTO public.events_feed (
    kind,
    event_time,
    priority,
    title,
    description,
    entity_json,
    status,
    metadata,
    organization_id
  ) VALUES (
    'activity',
    NOW(),
    'info',
    CASE entity_table
      WHEN 'vehicles' THEN 'Vehicle Viewed'
      WHEN 'drivers' THEN 'Driver Profile Viewed'
      WHEN 'trips' THEN 'Trip Details Viewed'
      ELSE 'Entity Viewed'
    END,
    CASE
      WHEN entity_name IS NOT NULL THEN
        format('You viewed %s', entity_name)
      ELSE
        format('You viewed a %s', REPLACE(entity_table, '_', ' '))
    END,
    jsonb_build_object(
      'entity_type', entity_table,
      'entity_id', entity_id,
      'entity_name', entity_name,
      'view_count', current_view_count,
      'viewed_by', user_id
    ),
    NULL,
    jsonb_build_object(
      'source', 'entity_view_tracking',
      'table', entity_table
    ),
    org_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Error tracking entity view: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.track_entity_view TO authenticated;

-- ============================================================================
-- PART 4: Create Helper Function for Recently Viewed Entities
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_recently_viewed_entities(
  entity_table TEXT,
  org_id UUID,
  limit_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  name TEXT,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      id,
      CASE
        WHEN %I.name IS NOT NULL THEN %I.name::TEXT
        WHEN %I.registration_number IS NOT NULL THEN %I.registration_number::TEXT
        ELSE ''Unnamed''::TEXT
      END as name,
      last_viewed_at,
      view_count
    FROM %I
    WHERE organization_id = $1
      AND last_viewed_at IS NOT NULL
    ORDER BY last_viewed_at DESC NULLS LAST
    LIMIT $2
  ',
    entity_table, entity_table,
    entity_table, entity_table,
    entity_table
  )
  USING org_id, limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_recently_viewed_entities TO authenticated;

-- ============================================================================
-- PART 5: Comments and Documentation
-- ============================================================================

COMMENT ON COLUMN public.vehicles.last_viewed_at IS 'Timestamp of when this vehicle was last viewed by any user';
COMMENT ON COLUMN public.vehicles.last_viewed_by IS 'User ID of the last person who viewed this vehicle';
COMMENT ON COLUMN public.vehicles.view_count IS 'Total number of times this vehicle has been viewed';

COMMENT ON COLUMN public.drivers.last_viewed_at IS 'Timestamp of when this driver profile was last viewed';
COMMENT ON COLUMN public.drivers.last_viewed_by IS 'User ID of the last person who viewed this driver';
COMMENT ON COLUMN public.drivers.view_count IS 'Total number of times this driver profile has been viewed';

COMMENT ON COLUMN public.trips.last_viewed_at IS 'Timestamp of when this trip was last viewed';
COMMENT ON COLUMN public.trips.last_viewed_by IS 'User ID of the last person who viewed this trip';
COMMENT ON COLUMN public.trips.view_count IS 'Total number of times this trip has been viewed';

COMMENT ON FUNCTION public.track_entity_view IS 'Tracks when a user views an entity (vehicle/driver/trip) and creates a feed event';
COMMENT ON FUNCTION public.get_recently_viewed_entities IS 'Returns the most recently viewed entities of a specific type for an organization';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Chronological sorting fixed, activity tracking enabled';
  RAISE NOTICE '📊 Added tracking columns to vehicles, drivers, and trips tables';
  RAISE NOTICE '🔄 Backfilled maintenance events with correct timestamps';
  RAISE NOTICE '🎯 Created track_entity_view() function for activity logging';
END $$;
