-- Add missing columns for battery and tyre tracking to maintenance_service_tasks if they don't exist

DO $$ 
BEGIN
  -- Add battery_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'battery_data'
  ) THEN
    ALTER TABLE maintenance_service_tasks ADD COLUMN battery_data JSONB;
    COMMENT ON COLUMN maintenance_service_tasks.battery_data IS 'Battery replacement details including serial number and brand';
  END IF;

  -- Add tyre_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'tyre_data'
  ) THEN
    ALTER TABLE maintenance_service_tasks ADD COLUMN tyre_data JSONB;
    COMMENT ON COLUMN maintenance_service_tasks.tyre_data IS 'Tyre replacement details including positions, brand and serial numbers';
  END IF;
  
END $$;