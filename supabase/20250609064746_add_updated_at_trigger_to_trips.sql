-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to trips table to automatically update updated_at on row modification
CREATE TRIGGER set_timestamp_trips
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Note:
-- The initial setup for the 'trips' table in '20250602071904_frosty_moon.sql'
-- defined 'updated_at timestamptz DEFAULT now()'.
-- This trigger enhances that by ensuring 'updated_at' is updated on every
-- subsequent modification, not just on creation.
