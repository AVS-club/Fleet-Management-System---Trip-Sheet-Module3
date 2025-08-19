/*
  # Create set_created_by trigger function

  1. Functions
    - `set_created_by()` - Trigger function that sets created_by to auth.uid() when null
    - `backfill_created_by()` - Helper function to backfill existing rows

  2. Security
    - Grant execute permissions to authenticated users
*/

-- Create the function to set created_by
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.set_created_by() TO authenticated;

-- Function to backfill created_by for a given table and user
CREATE OR REPLACE FUNCTION public.backfill_created_by(
    table_name TEXT,
    user_id UUID
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE public.%I SET created_by = %L WHERE created_by IS NULL', table_name, user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.backfill_created_by(TEXT, UUID) TO authenticated;