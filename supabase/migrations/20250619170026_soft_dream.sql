-- Add is_return_trip column to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS is_return_trip boolean DEFAULT false;

-- Add comment explaining the purpose of this field
COMMENT ON COLUMN trips.is_return_trip IS 'Indicates if this is a return trip where the vehicle returns to the origin warehouse';