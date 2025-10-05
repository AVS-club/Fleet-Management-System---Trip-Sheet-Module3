-- Add parts_replaced column to maintenance_tasks table
-- This column will store JSONB data for explicit part tracking

ALTER TABLE maintenance_tasks 
ADD COLUMN IF NOT EXISTS parts_replaced JSONB DEFAULT '[]'::jsonb;

-- Create an index for better query performance on parts_replaced
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_parts_replaced 
ON maintenance_tasks USING GIN (parts_replaced);

-- Add a comment to document the column
COMMENT ON COLUMN maintenance_tasks.parts_replaced IS 'JSONB array of replaced parts with details like part name, cost, brand, odometer reading, etc.';

-- Example of the JSONB structure:
-- [
--   {
--     "id": "unique_id",
--     "partName": "Brake Pads",
--     "category": "Brakes & Safety",
--     "quantity": 1,
--     "cost": 3000,
--     "brand": "MRF",
--     "odometerAtReplacement": 45000,
--     "replacementDate": "2024-01-15"
--   }
-- ]
