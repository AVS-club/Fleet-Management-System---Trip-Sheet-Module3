/*
  # Convert trips.destinations from JSONB to TEXT[]
  
  1. Changes
    - Alter the destinations column from JSONB to TEXT[]
    - Use a PL/pgSQL function to handle the conversion
    - Add a comment explaining the column purpose
*/

-- Create a temporary function to handle the conversion
CREATE OR REPLACE FUNCTION temp_convert_jsonb_to_text_array(data jsonb)
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
BEGIN
  IF data IS NULL THEN
    RETURN '{}'::TEXT[];
  ELSIF jsonb_typeof(data) = 'array' THEN
    SELECT array_agg(value::TEXT) INTO result
    FROM jsonb_array_elements_text(data);
    RETURN result;
  ELSE
    RETURN '{}'::TEXT[];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Alter the destinations column using the function
ALTER TABLE trips 
ALTER COLUMN destinations TYPE TEXT[] 
USING temp_convert_jsonb_to_text_array(destinations);

-- Drop the temporary function
DROP FUNCTION temp_convert_jsonb_to_text_array;

-- Add comment explaining the column
COMMENT ON COLUMN trips.destinations IS 'Array of destination IDs in the order they should be visited';