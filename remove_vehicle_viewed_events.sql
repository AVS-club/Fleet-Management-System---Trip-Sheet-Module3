-- ============================================================================
-- Quick Fix: Remove "Vehicle Viewed" Events from AI Alerts Feed
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Delete all "viewed" activity events
DELETE FROM public.events_feed
WHERE kind = 'activity'
  AND (
    title = 'Vehicle Viewed'
    OR title = 'Driver Profile Viewed'
    OR title = 'Trip Details Viewed'
    OR title LIKE '%Viewed'
  );

-- Step 2: Modify the track_entity_view function to NOT create feed events
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
  -- This function now only updates tracking columns without creating alerts

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Error tracking entity view: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Refresh your AI Alerts page to see the changes.
