-- Add estimated_toll_cost column to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS estimated_toll_cost numeric(10,2);

-- Add comment explaining the purpose of this field
COMMENT ON COLUMN trips.estimated_toll_cost IS 'Estimated FASTag toll cost for the trip route';