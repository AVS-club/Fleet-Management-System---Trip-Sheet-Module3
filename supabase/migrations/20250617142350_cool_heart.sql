/*
  # Vehicle Management Enhancements

  1. New Features
    - Add 'archived' value to vehicle_status enum for soft-delete functionality
    - Create vehicle_activity_log table to track vehicle actions
    - Add proper indexes and RLS policies for the new table

  2. Security
    - Enable RLS on vehicle_activity_log table
    - Add policies for authenticated users to insert and view logs
*/

-- Step 1: Add 'archived' to vehicle_status enum if it doesn't exist
DO $$
BEGIN
  -- Check if the enum already has the 'archived' value
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'archived' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vehicle_status')
  ) THEN
    -- Add 'archived' to the enum
    ALTER TYPE vehicle_status ADD VALUE 'archived';
  END IF;
END$$;

-- Step 2: Create vehicle_activity_log table
CREATE TABLE IF NOT EXISTS vehicle_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  action_type text NOT NULL,
  action_by text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_vehicle_id ON vehicle_activity_log(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_action_type ON vehicle_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_timestamp ON vehicle_activity_log(timestamp);

-- Step 4: Enable RLS on vehicle_activity_log
ALTER TABLE vehicle_activity_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for authenticated users
-- Allow authenticated users to insert records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_activity_log' 
    AND policyname = 'Allow authenticated users to insert vehicle activity logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert vehicle activity logs" 
    ON vehicle_activity_log
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
  END IF;
END$$;

-- Allow authenticated users to view records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_activity_log' 
    AND policyname = 'Allow authenticated users to view vehicle activity logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to view vehicle activity logs" 
    ON vehicle_activity_log
    FOR SELECT 
    TO authenticated
    USING (true);
  END IF;
END$$;