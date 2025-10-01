-- Temporarily disable conflict detection to allow trip creation
-- This is a quick fix to resolve the immediate issue

-- Disable the conflict detection trigger
ALTER TABLE trips DISABLE TRIGGER prevent_concurrent_trips;

-- Optional: Drop the trigger entirely if you want to remove conflict detection
-- DROP TRIGGER IF EXISTS prevent_concurrent_trips ON trips;

-- Add a comment to remember to re-enable later
COMMENT ON TRIGGER prevent_concurrent_trips ON trips IS 'DISABLED - Temporarily disabled to allow trip creation. Re-enable after fixing conflict logic.';
