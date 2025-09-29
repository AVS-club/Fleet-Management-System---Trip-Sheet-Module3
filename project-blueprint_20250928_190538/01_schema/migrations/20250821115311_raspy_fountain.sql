/*
  # Vehicle Permanent Delete Setup
  
  1. Foreign Key Constraints Update
     - Update foreign key constraints to handle permanent vehicle deletion
     - trips: CASCADE delete (vehicle-specific data should be removed)
     - maintenance_tasks: CASCADE delete (vehicle-specific maintenance records)
     - drivers.primary_vehicle_id: SET NULL (drivers should not be deleted)
     - vehicle_activity_log: CASCADE delete (audit data can be removed)
  
  2. Security
     - Ensure only authorized users can perform permanent deletions
*/

-- Update trips foreign key to CASCADE on delete
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_vehicle_id_fkey' 
    AND table_name = 'trips'
  ) THEN
    ALTER TABLE trips DROP CONSTRAINT trips_vehicle_id_fkey;
  END IF;
  
  -- Add new constraint with CASCADE
  ALTER TABLE trips 
  ADD CONSTRAINT trips_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
END $$;

-- Update maintenance_tasks foreign key to CASCADE on delete
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'maintenance_tasks_vehicle_id_fkey' 
    AND table_name = 'maintenance_tasks'
  ) THEN
    ALTER TABLE maintenance_tasks DROP CONSTRAINT maintenance_tasks_vehicle_id_fkey;
  END IF;
  
  -- Add new constraint with CASCADE
  ALTER TABLE maintenance_tasks 
  ADD CONSTRAINT maintenance_tasks_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
END $$;

-- Update drivers primary_vehicle_id foreign key to SET NULL on delete
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_primary_vehicle_id_fkey' 
    AND table_name = 'drivers'
  ) THEN
    ALTER TABLE drivers DROP CONSTRAINT drivers_primary_vehicle_id_fkey;
  END IF;
  
  -- Add new constraint with SET NULL
  ALTER TABLE drivers 
  ADD CONSTRAINT drivers_primary_vehicle_id_fkey 
  FOREIGN KEY (primary_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
END $$;

-- Update vehicle_activity_log foreign key to CASCADE on delete (audit data)
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicle_activity_log_vehicle_id_fkey' 
    AND table_name = 'vehicle_activity_log'
  ) THEN
    ALTER TABLE vehicle_activity_log DROP CONSTRAINT vehicle_activity_log_vehicle_id_fkey;
  END IF;
  
  -- Add new constraint with CASCADE
  ALTER TABLE vehicle_activity_log 
  ADD CONSTRAINT vehicle_activity_log_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
END $$;

-- Add a function to safely count related records before deletion
CREATE OR REPLACE FUNCTION count_vehicle_dependencies(vehicle_uuid uuid)
RETURNS TABLE(
  trips_count bigint,
  maintenance_count bigint,
  drivers_assigned bigint,
  activity_logs bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM trips WHERE vehicle_id = vehicle_uuid),
    (SELECT COUNT(*) FROM maintenance_tasks WHERE vehicle_id = vehicle_uuid),
    (SELECT COUNT(*) FROM drivers WHERE primary_vehicle_id = vehicle_uuid),
    (SELECT COUNT(*) FROM vehicle_activity_log WHERE vehicle_id = vehicle_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;