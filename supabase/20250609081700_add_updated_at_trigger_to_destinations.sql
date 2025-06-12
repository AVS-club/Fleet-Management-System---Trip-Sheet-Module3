-- Add trigger to destinations table to automatically update updated_at on row modification
CREATE TRIGGER set_timestamp_destinations
BEFORE UPDATE ON public.destinations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Note:
-- The initial setup for the 'destinations' table in '20250602071904_frosty_moon.sql'
-- defined 'updated_at timestamptz DEFAULT now()'.
-- This trigger enhances that by ensuring 'updated_at' is updated on every
-- subsequent modification, not just on creation.
-- The trigger_set_timestamp function is assumed to be created by a previous migration
-- (e.g., 20250609064746_add_updated_at_trigger_to_trips.sql).
