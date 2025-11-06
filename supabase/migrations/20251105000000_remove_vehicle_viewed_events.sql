-- Migration: Remove Vehicle Viewed Events from AI Alerts Feed
-- Date: 2025-11-05
-- Purpose: Remove "Vehicle Viewed", "Driver Profile Viewed", and "Trip Details Viewed" activity events

-- ============================================================================
-- PART 1: Delete existing "viewed" activity events
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all activity events with "Viewed" in the title
  DELETE FROM public.events_feed
  WHERE kind = 'activity'
    AND (
      title = 'Vehicle Viewed'
      OR title = 'Driver Profile Viewed'
      OR title = 'Trip Details Viewed'
      OR title LIKE '%Viewed'
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % "viewed" activity events from events_feed', deleted_count;
END $$;

-- ============================================================================
-- PART 2: Modify track_entity_view function to NOT create events
-- ============================================================================

-- Replace the function to only update tracking columns, without creating feed events
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
  -- Update the entity's view tracking columns only
  -- DO NOT create feed events
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

  -- Note: Removed the INSERT INTO events_feed section
  -- This function now only updates tracking columns

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Error tracking entity view: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION public.track_entity_view IS 'Tracks when a user views an entity (vehicle/driver/trip) by updating tracking columns only - does NOT create feed events';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Vehicle Viewed events removed';
  RAISE NOTICE '🗑️  Deleted all existing "viewed" activity events';
  RAISE NOTICE '🔧 Modified track_entity_view() to not create feed events';
  RAISE NOTICE '📊 View tracking columns (last_viewed_at, view_count) still work normally';
END $$;
