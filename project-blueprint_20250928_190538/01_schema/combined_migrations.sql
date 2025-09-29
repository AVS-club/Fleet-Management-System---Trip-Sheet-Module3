-- Migration: 20250117000000_fix_total_fuel_cost_column.sql
-- Fix: Ensure total_fuel_cost column exists and refresh schema cache
-- This migration addresses the PGRST204 error where total_fuel_cost column is not found in schema cache

-- Add total_fuel_cost column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'trips' 
    AND column_name = 'total_fuel_cost'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN total_fuel_cost DECIMAL(10,2);
  END IF;
END $$;

-- Ensure the column has the correct data type and constraints
ALTER TABLE public.trips 
ALTER COLUMN total_fuel_cost TYPE DECIMAL(10,2);

-- Add comment for documentation
COMMENT ON COLUMN public.trips.total_fuel_cost IS 'Total cost of fuel for this trip';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Also try to refresh the schema cache with a different approach
SELECT pg_notify('pgrst', 'reload schema');


--================================================================================

-- Migration: 20250120000000_create_maintenance_service_tasks.sql
/*
  # Create maintenance_service_tasks table
  
  This table stores the service groups for each maintenance task,
  allowing multiple vendors and tasks per maintenance record.
  
  1. Schema Changes
    - Create maintenance_service_tasks table
    - Add foreign key constraints
    - Add indexes for performance
    
  2. Security
    - Enable RLS
    - Add policies for CRUD operations
*/

-- Create maintenance_service_tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_service_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_task_id UUID NOT NULL REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
  vendor_id VARCHAR(255) NOT NULL,
  tasks TEXT[] NOT NULL DEFAULT '{}',
  cost DECIMAL(10,2) DEFAULT 0,
  bill_url TEXT[],
  battery_tracking BOOLEAN DEFAULT false,
  battery_serial VARCHAR(255),
  battery_brand VARCHAR(255),
  tyre_tracking BOOLEAN DEFAULT false,
  tyre_positions TEXT[],
  tyre_brand VARCHAR(255),
  tyre_serials TEXT,
  battery_warranty_url TEXT[],
  tyre_warranty_url TEXT[],
  battery_warranty_expiry_date DATE,
  tyre_warranty_expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_task_id ON public.maintenance_service_tasks (maintenance_task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_vendor_id ON public.maintenance_service_tasks (vendor_id);

-- Enable RLS
ALTER TABLE public.maintenance_service_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "maintenance_service_tasks_select_policy"
ON public.maintenance_service_tasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = maintenance_task_id 
    AND added_by = auth.uid()
  )
);

CREATE POLICY "maintenance_service_tasks_insert_policy"
ON public.maintenance_service_tasks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = maintenance_task_id 
    AND added_by = auth.uid()
  )
);

CREATE POLICY "maintenance_service_tasks_update_policy"
ON public.maintenance_service_tasks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = maintenance_task_id 
    AND added_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = maintenance_task_id 
    AND added_by = auth.uid()
  )
);

CREATE POLICY "maintenance_service_tasks_delete_policy"
ON public.maintenance_service_tasks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = maintenance_task_id 
    AND added_by = auth.uid()
  )
);

-- Create audit logs table for maintenance tasks
CREATE TABLE IF NOT EXISTS public.maintenance_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
  admin_user VARCHAR(255),
  changes JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_maintenance_audit_logs_task_id ON public.maintenance_audit_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_audit_logs_timestamp ON public.maintenance_audit_logs (timestamp);

-- Enable RLS for audit logs
ALTER TABLE public.maintenance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit logs
CREATE POLICY "maintenance_audit_logs_select_policy"
ON public.maintenance_audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = task_id 
    AND added_by = auth.uid()
  )
);

CREATE POLICY "maintenance_audit_logs_insert_policy"
ON public.maintenance_audit_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_tasks 
    WHERE id = task_id 
    AND added_by = auth.uid()
  )
);

-- Add missing columns to maintenance_tasks table
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS title TEXT[],
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS complaint_description TEXT,
ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
ADD COLUMN IF NOT EXISTS warranty_expiry DATE,
ADD COLUMN IF NOT EXISTS warranty_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS warranty_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parts_required JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS downtime_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS odometer_reading INTEGER,
ADD COLUMN IF NOT EXISTS garage_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON public.maintenance_tasks (priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_start_date ON public.maintenance_tasks (start_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_odometer_reading ON public.maintenance_tasks (odometer_reading);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_garage_id ON public.maintenance_tasks (garage_id);

-- Update the maintenance_tasks table to use 'added_by' instead of 'created_by' for consistency
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);

-- Add index for added_by
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_added_by ON public.maintenance_tasks (added_by);

-- Update RLS policies for maintenance_tasks to use added_by
DROP POLICY IF EXISTS "Users can view their own maintenance tasks" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "Users can insert their own maintenance tasks" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "Users can update their own maintenance tasks" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "Users can delete their own maintenance tasks" ON public.maintenance_tasks;

CREATE POLICY "maintenance_tasks_select_policy"
ON public.maintenance_tasks
FOR SELECT USING (auth.uid() = added_by);

CREATE POLICY "maintenance_tasks_insert_policy"
ON public.maintenance_tasks
FOR INSERT WITH CHECK (auth.uid() = added_by);

CREATE POLICY "maintenance_tasks_update_policy"
ON public.maintenance_tasks
FOR UPDATE USING (auth.uid() = added_by) WITH CHECK (auth.uid() = added_by);

CREATE POLICY "maintenance_tasks_delete_policy"
ON public.maintenance_tasks
FOR DELETE USING (auth.uid() = added_by);

-- Create trigger to automatically set added_by
CREATE OR REPLACE FUNCTION public.set_maintenance_added_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.added_by IS NULL THEN
    NEW.added_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
DROP TRIGGER IF EXISTS trg_set_maintenance_added_by ON public.maintenance_tasks;
CREATE TRIGGER trg_set_maintenance_added_by
  BEFORE INSERT ON public.maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_added_by();


--================================================================================

-- Migration: 20250120000001_create_reminder_tracking.sql
/*
  # Create reminder_tracking table
  
  This table tracks reminder states and acknowledgments,
  allowing users to mark reminders as seen, dismissed, or snoozed.
  
  1. Schema Changes
    - Create reminder_tracking table
    - Add foreign key constraints
    - Add indexes for performance
    
  2. Security
    - Enable RLS
    - Add policies for CRUD operations
*/

-- Create reminder_tracking table
CREATE TABLE IF NOT EXISTS public.reminder_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id VARCHAR(255) NOT NULL, -- Unique identifier for the reminder
  reminder_type VARCHAR(100) NOT NULL, -- Type of reminder (rc_expiry, service_due, etc.)
  entity_id VARCHAR(255) NOT NULL, -- ID of the entity (vehicle, driver, etc.)
  entity_type VARCHAR(50) NOT NULL, -- Type of entity (vehicle, driver, maintenance, etc.)
  module VARCHAR(50) NOT NULL, -- Module (vehicles, drivers, maintenance, trips, ai_alerts)
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, dismissed, snoozed
  priority VARCHAR(20) NOT NULL, -- critical, warning, normal
  title TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  days_left INTEGER,
  link TEXT,
  metadata JSONB DEFAULT '{}', -- Additional reminder data
  snoozed_until TIMESTAMP WITH TIME ZONE, -- When to show again if snoozed
  dismissed_at TIMESTAMP WITH TIME ZONE, -- When it was dismissed
  acknowledged_at TIMESTAMP WITH TIME ZONE, -- When it was first seen
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_reminder_id ON public.reminder_tracking(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_entity ON public.reminder_tracking(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_module ON public.reminder_tracking(module);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_status ON public.reminder_tracking(status);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_added_by ON public.reminder_tracking(added_by);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_due_date ON public.reminder_tracking(due_date);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_snoozed_until ON public.reminder_tracking(snoozed_until);

-- Enable RLS
ALTER TABLE public.reminder_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reminders" ON public.reminder_tracking
  FOR SELECT USING (auth.uid() = added_by);

CREATE POLICY "Users can insert their own reminders" ON public.reminder_tracking
  FOR INSERT WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update their own reminders" ON public.reminder_tracking
  FOR UPDATE USING (auth.uid() = added_by);

CREATE POLICY "Users can delete their own reminders" ON public.reminder_tracking
  FOR DELETE USING (auth.uid() = added_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminder_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_reminder_tracking_updated_at
  BEFORE UPDATE ON public.reminder_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_tracking_updated_at();

-- Create function to clean up old dismissed reminders (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.reminder_tracking 
  WHERE status = 'dismissed' 
    AND dismissed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old reminders (this would need to be set up in your cron system)
-- For now, we'll create a function that can be called manually


--================================================================================

-- Migration: 20250120000002_create_alert_thresholds.sql
/*
  # Create alert_thresholds table
  
  This table stores configurable alert thresholds for different types of reminders,
  allowing users to customize when they receive alerts.
  
  1. Schema Changes
    - Create alert_thresholds table
    - Add foreign key constraints
    - Add indexes for performance
    
  2. Security
    - Enable RLS
    - Add policies for CRUD operations
*/

-- Create alert_thresholds table
CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL, -- Type of alert (rc_expiry, service_due, etc.)
  entity_type VARCHAR(50) NOT NULL, -- Type of entity (vehicle, driver, maintenance, etc.)
  threshold_days INTEGER NOT NULL DEFAULT 30, -- Days before expiry to alert
  threshold_km INTEGER, -- Kilometers before service to alert (for maintenance)
  is_enabled BOOLEAN NOT NULL DEFAULT true, -- Whether this threshold is active
  priority VARCHAR(20) NOT NULL DEFAULT 'warning', -- Priority level (critical, warning, normal)
  notification_methods TEXT[] DEFAULT '{"in_app"}', -- How to notify (in_app, email, sms)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of user, alert_type, and entity_type
  UNIQUE(user_id, alert_type, entity_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_user_id ON public.alert_thresholds(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_alert_type ON public.alert_thresholds(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_entity_type ON public.alert_thresholds(entity_type);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_enabled ON public.alert_thresholds(is_enabled);

-- Enable RLS
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own alert thresholds" ON public.alert_thresholds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert thresholds" ON public.alert_thresholds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert thresholds" ON public.alert_thresholds
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert thresholds" ON public.alert_thresholds
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_thresholds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_alert_thresholds_updated_at
  BEFORE UPDATE ON public.alert_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_thresholds_updated_at();

-- Insert default alert thresholds for new users
CREATE OR REPLACE FUNCTION create_default_alert_thresholds()
RETURNS TRIGGER AS $$
BEGIN
  -- Vehicle document expiry thresholds
  INSERT INTO public.alert_thresholds (user_id, alert_type, entity_type, threshold_days, priority)
  VALUES 
    (NEW.id, 'rc_expiry', 'vehicle', 30, 'warning'),
    (NEW.id, 'insurance_expiry', 'vehicle', 30, 'warning'),
    (NEW.id, 'puc_expiry', 'vehicle', 15, 'critical'),
    (NEW.id, 'fitness_expiry', 'vehicle', 30, 'warning'),
    (NEW.id, 'permit_expiry', 'vehicle', 30, 'warning'),
    
    -- Driver document expiry thresholds
    (NEW.id, 'license_expiry', 'driver', 30, 'critical'),
    
    -- Maintenance thresholds
    (NEW.id, 'service_due_date', 'maintenance', 7, 'warning'),
    (NEW.id, 'service_due_km', 'maintenance', 1000, 'warning'),
    (NEW.id, 'task_open_too_long', 'maintenance', 7, 'warning'),
    (NEW.id, 'no_recent_maintenance', 'maintenance', 90, 'warning'),
    
    -- Trip thresholds
    (NEW.id, 'missing_fuel_bill', 'trip', 3, 'warning'),
    (NEW.id, 'missing_end_km', 'trip', 1, 'warning'),
    (NEW.id, 'missing_fuel_data', 'trip', 1, 'warning'),
    (NEW.id, 'high_route_deviation', 'trip', 20, 'warning');
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default thresholds for new users
CREATE TRIGGER trigger_create_default_alert_thresholds
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_alert_thresholds();


--================================================================================

-- Migration: 20250120000003_enhanced_downtime_schema.sql
-- Enhanced downtime schema migration
-- This migration ensures proper downtime handling across web, mobile, and app platforms
-- Supports both days and hours with proper validation and indexing

-- First, ensure the basic downtime columns exist
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS downtime_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downtime_hours INTEGER DEFAULT 0;

-- Add comprehensive downtime tracking columns
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS downtime_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS downtime_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS downtime_reason TEXT,
ADD COLUMN IF NOT EXISTS downtime_category VARCHAR(50) DEFAULT 'maintenance',
ADD COLUMN IF NOT EXISTS downtime_impact_level VARCHAR(20) DEFAULT 'medium';

-- Update existing downtime_days to split into days and hours properly
-- Handle fractional days conversion
UPDATE public.maintenance_tasks 
SET 
  downtime_days = CASE 
    WHEN downtime_days >= 1 THEN FLOOR(downtime_days)
    ELSE 0 
  END,
  downtime_hours = CASE 
    WHEN downtime_days >= 1 THEN ROUND((downtime_days - FLOOR(downtime_days)) * 24)
    ELSE ROUND(downtime_days * 24)
  END
WHERE downtime_days IS NOT NULL;

-- Add comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_days ON public.maintenance_tasks (downtime_days);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_hours ON public.maintenance_tasks (downtime_hours);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_start_time ON public.maintenance_tasks (downtime_start_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_end_time ON public.maintenance_tasks (downtime_end_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_category ON public.maintenance_tasks (downtime_category);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_impact ON public.maintenance_tasks (downtime_impact_level);

-- Add check constraints for data integrity (only if they don't exist)
DO $$ 
BEGIN
    -- Add constraint only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_downtime_days_positive' 
        AND conrelid = 'public.maintenance_tasks'::regclass
    ) THEN
        ALTER TABLE public.maintenance_tasks 
        ADD CONSTRAINT check_downtime_days_positive CHECK (downtime_days >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_downtime_hours_valid' 
        AND conrelid = 'public.maintenance_tasks'::regclass
    ) THEN
        ALTER TABLE public.maintenance_tasks 
        ADD CONSTRAINT check_downtime_hours_valid CHECK (downtime_hours >= 0 AND downtime_hours < 24);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_downtime_category_valid' 
        AND conrelid = 'public.maintenance_tasks'::regclass
    ) THEN
        ALTER TABLE public.maintenance_tasks 
        ADD CONSTRAINT check_downtime_category_valid CHECK (downtime_category IN ('maintenance', 'repair', 'inspection', 'accident', 'breakdown', 'scheduled', 'emergency'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_downtime_impact_valid' 
        AND conrelid = 'public.maintenance_tasks'::regclass
    ) THEN
        ALTER TABLE public.maintenance_tasks 
        ADD CONSTRAINT check_downtime_impact_valid CHECK (downtime_impact_level IN ('low', 'medium', 'high', 'critical'));
    END IF;
END $$;

-- Add computed column for total downtime in hours (for easier calculations)
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS total_downtime_hours INTEGER GENERATED ALWAYS AS (
  (downtime_days * 24) + downtime_hours
) STORED;

-- Create index on computed column
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_total_downtime_hours ON public.maintenance_tasks (total_downtime_hours);

-- Add function to calculate downtime duration
CREATE OR REPLACE FUNCTION calculate_downtime_duration(
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE
) RETURNS TABLE(days INTEGER, hours INTEGER) AS $$
BEGIN
  IF start_time IS NULL OR end_time IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;
  
  DECLARE
    duration_interval INTERVAL;
    total_hours INTEGER;
    days_part INTEGER;
    hours_part INTEGER;
  BEGIN
    duration_interval := end_time - start_time;
    total_hours := EXTRACT(EPOCH FROM duration_interval) / 3600;
    days_part := total_hours / 24;
    hours_part := total_hours % 24;
    
    RETURN QUERY SELECT days_part::INTEGER, hours_part::INTEGER;
  END;
END;
$$ LANGUAGE plpgsql;

-- Add function to get downtime statistics
CREATE OR REPLACE FUNCTION get_downtime_statistics(
  vehicle_id_param VARCHAR(255) DEFAULT NULL,
  start_date_param DATE DEFAULT NULL,
  end_date_param DATE DEFAULT NULL
) RETURNS TABLE(
  total_downtime_days INTEGER,
  total_downtime_hours INTEGER,
  average_downtime_hours NUMERIC,
  max_downtime_hours INTEGER,
  min_downtime_hours INTEGER,
  downtime_incidents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(mt.downtime_days), 0)::INTEGER as total_downtime_days,
    COALESCE(SUM(mt.downtime_hours), 0)::INTEGER as total_downtime_hours,
    COALESCE(AVG(mt.total_downtime_hours), 0)::NUMERIC as average_downtime_hours,
    COALESCE(MAX(mt.total_downtime_hours), 0)::INTEGER as max_downtime_hours,
    COALESCE(MIN(mt.total_downtime_hours), 0)::INTEGER as min_downtime_hours,
    COUNT(*)::INTEGER as downtime_incidents
  FROM public.maintenance_tasks mt
  WHERE 
    (vehicle_id_param IS NULL OR mt.vehicle_id = vehicle_id_param)
    AND (start_date_param IS NULL OR mt.start_date >= start_date_param)
    AND (end_date_param IS NULL OR mt.start_date <= end_date_param)
    AND mt.total_downtime_hours > 0;
END;
$$ LANGUAGE plpgsql;

-- Add function to get downtime trends
CREATE OR REPLACE FUNCTION get_downtime_trends(
  vehicle_id_param VARCHAR(255) DEFAULT NULL,
  months_back INTEGER DEFAULT 12
) RETURNS TABLE(
  month_year TEXT,
  total_downtime_hours INTEGER,
  incident_count INTEGER,
  average_downtime_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', mt.start_date), 'YYYY-MM') as month_year,
    COALESCE(SUM(mt.total_downtime_hours), 0)::INTEGER as total_downtime_hours,
    COUNT(*)::INTEGER as incident_count,
    COALESCE(AVG(mt.total_downtime_hours), 0)::NUMERIC as average_downtime_hours
  FROM public.maintenance_tasks mt
  WHERE 
    (vehicle_id_param IS NULL OR mt.vehicle_id = vehicle_id_param)
    AND mt.start_date >= CURRENT_DATE - INTERVAL '1 month' * months_back
    AND mt.total_downtime_hours > 0
  GROUP BY DATE_TRUNC('month', mt.start_date)
  ORDER BY month_year DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for downtime data
CREATE POLICY "Users can view downtime data for their vehicles" ON public.maintenance_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_id 
      AND v.added_by = auth.uid()
    )
  );

CREATE POLICY "Users can update downtime data for their vehicles" ON public.maintenance_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v 
      WHERE v.id = vehicle_id 
      AND v.added_by = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN public.maintenance_tasks.downtime_days IS 'Number of full days of downtime (0 or positive integer)';
COMMENT ON COLUMN public.maintenance_tasks.downtime_hours IS 'Number of hours of downtime (0-23)';
COMMENT ON COLUMN public.maintenance_tasks.downtime_start_time IS 'Exact start time of downtime period';
COMMENT ON COLUMN public.maintenance_tasks.downtime_end_time IS 'Exact end time of downtime period';
COMMENT ON COLUMN public.maintenance_tasks.downtime_reason IS 'Reason for downtime (free text)';
COMMENT ON COLUMN public.maintenance_tasks.downtime_category IS 'Category of downtime (maintenance, repair, inspection, accident, breakdown, scheduled, emergency)';
COMMENT ON COLUMN public.maintenance_tasks.downtime_impact_level IS 'Impact level of downtime (low, medium, high, critical)';
COMMENT ON COLUMN public.maintenance_tasks.total_downtime_hours IS 'Computed total downtime in hours (days * 24 + hours)';

-- Add sample data for testing (optional - remove in production)
-- INSERT INTO public.maintenance_tasks (
--   vehicle_id, task_type, title, description, status, priority,
--   downtime_days, downtime_hours, downtime_category, downtime_impact_level,
--   start_date, added_by
-- ) VALUES (
--   'sample-vehicle-1', 'general_scheduled_service', ARRAY['Oil Change'], 'Regular oil change', 'resolved', 'medium',
--   0, 2, 'maintenance', 'low', CURRENT_DATE, auth.uid()
-- );

-- Create view for easy downtime reporting
CREATE OR REPLACE VIEW downtime_summary AS
SELECT 
  mt.id,
  mt.vehicle_id,
  v.registration_number,
  v.make,
  v.model,
  mt.downtime_days,
  mt.downtime_hours,
  mt.total_downtime_hours,
  mt.downtime_category,
  mt.downtime_impact_level,
  mt.downtime_reason,
  mt.downtime_start_time,
  mt.downtime_end_time,
  mt.start_date,
  mt.end_date,
  mt.status,
  mt.priority
FROM public.maintenance_tasks mt
JOIN public.vehicles v ON mt.vehicle_id = v.id
WHERE mt.total_downtime_hours > 0;

-- Grant permissions on the view
GRANT SELECT ON downtime_summary TO authenticated;

-- Add trigger to automatically calculate downtime when start/end times are provided
CREATE OR REPLACE FUNCTION calculate_downtime_from_times()
RETURNS TRIGGER AS $$
BEGIN
  -- If both start and end times are provided, calculate days and hours
  IF NEW.downtime_start_time IS NOT NULL AND NEW.downtime_end_time IS NOT NULL THEN
    DECLARE
      duration_interval INTERVAL;
      total_hours INTEGER;
      days_part INTEGER;
      hours_part INTEGER;
    BEGIN
      duration_interval := NEW.downtime_end_time - NEW.downtime_start_time;
      total_hours := EXTRACT(EPOCH FROM duration_interval) / 3600;
      days_part := total_hours / 24;
      hours_part := total_hours % 24;
      
      NEW.downtime_days := days_part;
      NEW.downtime_hours := hours_part;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_calculate_downtime ON public.maintenance_tasks;
CREATE TRIGGER trigger_calculate_downtime
  BEFORE INSERT OR UPDATE ON public.maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_downtime_from_times();

-- Add mobile-optimized indexes for better performance on mobile devices
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_mobile_downtime ON public.maintenance_tasks (vehicle_id, start_date, total_downtime_hours) WHERE total_downtime_hours > 0;

-- Add web app optimized indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_web_downtime ON public.maintenance_tasks (downtime_category, downtime_impact_level, start_date) WHERE total_downtime_hours > 0;

-- Add app-optimized indexes for offline sync
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_app_downtime ON public.maintenance_tasks (updated_at, total_downtime_hours) WHERE total_downtime_hours > 0;


--================================================================================

-- Migration: 20250120000004_document_summary_materialized_view.sql
-- Create materialized view for document summary optimization
-- This view pre-calculates document statuses and expiry dates for better performance

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS document_summary;

-- Create materialized view for document summary
CREATE MATERIALIZED VIEW document_summary AS
SELECT 
  v.id,
  v.registration_number,
  v.registration_date,
  v.registration_date + INTERVAL '15 years' as rc_expiry_calculated,
  v.insurance_expiry_date,
  v.fitness_expiry_date,
  v.permit_expiry_date,
  v.puc_expiry_date,
  v.tax_paid_upto as tax_expiry_date,
  v.rc_expiry_date,
  v.vahan_last_fetched_at,
  -- Calculate status for each document
  CASE 
    WHEN v.insurance_expiry_date IS NULL THEN 'missing'
    WHEN v.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as insurance_status,
  CASE 
    WHEN v.fitness_expiry_date IS NULL THEN 'missing'
    WHEN v.fitness_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.fitness_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as fitness_status,
  CASE 
    WHEN v.permit_expiry_date IS NULL THEN 'missing'
    WHEN v.permit_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.permit_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as permit_status,
  CASE 
    WHEN v.puc_expiry_date IS NULL THEN 'missing'
    WHEN v.puc_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN v.puc_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as puc_status,
  CASE 
    WHEN v.tax_paid_upto IS NULL THEN 'missing'
    WHEN v.tax_paid_upto < CURRENT_DATE THEN 'expired'
    WHEN v.tax_paid_upto < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as tax_status,
  CASE 
    WHEN (v.registration_date + INTERVAL '15 years') IS NULL THEN 'missing'
    WHEN (v.registration_date + INTERVAL '15 years') < CURRENT_DATE THEN 'expired'
    WHEN (v.registration_date + INTERVAL '15 years') < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as rc_status,
  -- Count expired/expiring documents
  (
    CASE WHEN v.insurance_expiry_date IS NULL OR v.insurance_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.fitness_expiry_date IS NULL OR v.fitness_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.permit_expiry_date IS NULL OR v.permit_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.puc_expiry_date IS NULL OR v.puc_expiry_date < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN v.tax_paid_upto IS NULL OR v.tax_paid_upto < CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN (v.registration_date + INTERVAL '15 years') IS NULL OR (v.registration_date + INTERVAL '15 years') < CURRENT_DATE THEN 1 ELSE 0 END
  ) as expired_docs_count,
  -- Count expiring documents (within 30 days)
  (
    CASE WHEN v.insurance_expiry_date >= CURRENT_DATE AND v.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.fitness_expiry_date >= CURRENT_DATE AND v.fitness_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.permit_expiry_date >= CURRENT_DATE AND v.permit_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.puc_expiry_date >= CURRENT_DATE AND v.puc_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN v.tax_paid_upto >= CURRENT_DATE AND v.tax_paid_upto < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END +
    CASE WHEN (v.registration_date + INTERVAL '15 years') >= CURRENT_DATE AND (v.registration_date + INTERVAL '15 years') < CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END
  ) as expiring_docs_count,
  v.created_at,
  v.updated_at
FROM vehicles v
WHERE v.status != 'archived';

-- Create indexes on the materialized view for better performance
CREATE INDEX idx_document_summary_registration ON document_summary(registration_number);
CREATE INDEX idx_document_summary_insurance_status ON document_summary(insurance_status);
CREATE INDEX idx_document_summary_fitness_status ON document_summary(fitness_status);
CREATE INDEX idx_document_summary_permit_status ON document_summary(permit_status);
CREATE INDEX idx_document_summary_puc_status ON document_summary(puc_status);
CREATE INDEX idx_document_summary_tax_status ON document_summary(tax_status);
CREATE INDEX idx_document_summary_rc_status ON document_summary(rc_status);
CREATE INDEX idx_document_summary_expired_count ON document_summary(expired_docs_count);
CREATE INDEX idx_document_summary_expiring_count ON document_summary(expiring_docs_count);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_document_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW document_summary;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get document summary for a specific vehicle
CREATE OR REPLACE FUNCTION get_vehicle_document_summary(vehicle_id UUID)
RETURNS TABLE (
  id UUID,
  registration_number VARCHAR,
  registration_date DATE,
  rc_expiry_calculated DATE,
  insurance_expiry_date DATE,
  fitness_expiry_date DATE,
  permit_expiry_date DATE,
  puc_expiry_date DATE,
  tax_expiry_date DATE,
  rc_expiry_date DATE,
  vahan_last_fetched_at TIMESTAMPTZ,
  insurance_status TEXT,
  fitness_status TEXT,
  permit_status TEXT,
  puc_status TEXT,
  tax_status TEXT,
  rc_status TEXT,
  expired_docs_count INTEGER,
  expiring_docs_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.registration_number,
    ds.registration_date,
    ds.rc_expiry_calculated,
    ds.insurance_expiry_date,
    ds.fitness_expiry_date,
    ds.permit_expiry_date,
    ds.puc_expiry_date,
    ds.tax_expiry_date,
    ds.rc_expiry_date,
    ds.vahan_last_fetched_at,
    ds.insurance_status,
    ds.fitness_status,
    ds.permit_status,
    ds.puc_status,
    ds.tax_status,
    ds.rc_status,
    ds.expired_docs_count,
    ds.expiring_docs_count
  FROM document_summary ds
  WHERE ds.id = vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get fleet document summary statistics
CREATE OR REPLACE FUNCTION get_fleet_document_summary_stats()
RETURNS TABLE (
  total_vehicles INTEGER,
  total_expired_docs INTEGER,
  total_expiring_docs INTEGER,
  vehicles_with_expired_docs INTEGER,
  vehicles_with_expiring_docs INTEGER,
  avg_docs_per_vehicle NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_vehicles,
    SUM(expired_docs_count)::INTEGER as total_expired_docs,
    SUM(expiring_docs_count)::INTEGER as total_expiring_docs,
    COUNT(CASE WHEN expired_docs_count > 0 THEN 1 END)::INTEGER as vehicles_with_expired_docs,
    COUNT(CASE WHEN expiring_docs_count > 0 THEN 1 END)::INTEGER as vehicles_with_expiring_docs,
    ROUND(AVG(expired_docs_count + expiring_docs_count), 2) as avg_docs_per_vehicle
  FROM document_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON document_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_document_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vehicle_document_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fleet_document_summary_stats() TO authenticated;

-- Add comment
COMMENT ON MATERIALIZED VIEW document_summary IS 'Pre-calculated document statuses and expiry information for better performance';
COMMENT ON FUNCTION refresh_document_summary() IS 'Refreshes the document_summary materialized view';
COMMENT ON FUNCTION get_vehicle_document_summary(UUID) IS 'Gets document summary for a specific vehicle';
COMMENT ON FUNCTION get_fleet_document_summary_stats() IS 'Gets fleet-wide document summary statistics';


--================================================================================

-- Migration: 20250703171029_square_fountain.sql
/*
  # Add Trip P&L Fields

  1. New Tables
    - None
  2. Security
    - No changes to RLS
  3. Changes
    - Add new ENUM types for billing_type and profit_status
    - Add P&L related columns to trips table
    - Create trip_pnl_report_view for aggregated P&L data
*/

-- Create ENUM types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
    CREATE TYPE public.billing_type AS ENUM ('per_km', 'per_ton', 'manual');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profit_status') THEN
    CREATE TYPE public.profit_status AS ENUM ('profit', 'loss', 'neutral');
  END IF;
END $$;

-- Add new columns to trips table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'freight_rate') THEN
    ALTER TABLE public.trips ADD COLUMN freight_rate numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'billing_type') THEN
    ALTER TABLE public.trips ADD COLUMN billing_type billing_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'income_amount') THEN
    ALTER TABLE public.trips ADD COLUMN income_amount numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'total_expense') THEN
    ALTER TABLE public.trips ADD COLUMN total_expense numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'net_profit') THEN
    ALTER TABLE public.trips ADD COLUMN net_profit numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'cost_per_km') THEN
    ALTER TABLE public.trips ADD COLUMN cost_per_km numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'profit_status') THEN
    ALTER TABLE public.trips ADD COLUMN profit_status profit_status;
  END IF;
END $$;

-- Create trip_pnl_report_view
CREATE OR REPLACE VIEW public.trip_pnl_report_view AS
SELECT
    to_char(trip_start_date::date, 'YYYY-MM') AS month,
    SUM(income_amount) AS total_income,
    SUM(total_expense) AS total_expense,
    SUM(net_profit) AS net_profit,
    COUNT(id) AS trip_count,
    AVG(cost_per_km) AS avg_cost_per_km
FROM
    public.trips
WHERE
    income_amount IS NOT NULL
    AND total_expense IS NOT NULL
GROUP BY
    1
ORDER BY
    1;

--================================================================================

-- Migration: 20250703172751_black_dune.sql
/*
  # Add advance_amount field to trips table

  1. Changes
    - Adds advance_amount column to trips table with default value of 0
*/

-- Add advance_amount column to trips table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'advance_amount') THEN
    ALTER TABLE public.trips ADD COLUMN advance_amount numeric DEFAULT 0;
  END IF;
END $$;

--================================================================================

-- Migration: 20250704175336_shy_oasis.sql
/*
  # Add Trip Summary Metrics Function
  
  1. New Functions
    - Creates a new function get_trip_summary_metrics for calculating trip statistics
  2. Security
    - Function is available to all authenticated users
  3. Changes
    - Adds a new SQL function for retrieving trip summary metrics with filtering
*/

-- Create or replace the function to get trip summary metrics
CREATE OR REPLACE FUNCTION get_trip_summary_metrics(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL,
  p_vehicle_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_trip_type text DEFAULT NULL
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_expenses numeric;
  avg_distance numeric;
  trip_count integer;
  mean_mileage numeric;
  top_driver json;
  top_vehicle json;
BEGIN
  -- Filter conditions for all queries
  WITH filtered_trips AS (
    SELECT *
    FROM trips t
    WHERE 
      (start_date IS NULL OR t.trip_start_date >= start_date) AND
      (end_date IS NULL OR t.trip_end_date <= end_date) AND
      (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id) AND
      (p_driver_id IS NULL OR t.driver_id = p_driver_id) AND
      (p_warehouse_id IS NULL OR t.warehouse_id = p_warehouse_id) AND
      (
        p_trip_type IS NULL OR 
        (p_trip_type = 'local' AND t.short_trip = true) OR
        (p_trip_type = 'two_way' AND array_length(t.destinations, 1) > 1) OR
        (p_trip_type = 'one_way' AND t.short_trip = false AND array_length(t.destinations, 1) = 1)
      )
  )
  -- Calculate total expenses
  SELECT COALESCE(SUM(total_road_expenses) + SUM(COALESCE(total_fuel_cost, 0)), 0)
  INTO total_expenses
  FROM filtered_trips;
  
  -- Calculate average distance and trip count
  SELECT 
    COALESCE(AVG(end_km - start_km), 0),
    COUNT(*)
  INTO avg_distance, trip_count
  FROM filtered_trips;
  
  -- Calculate mean mileage for trips with calculated_kmpl
  SELECT COALESCE(AVG(calculated_kmpl), 0)
  INTO mean_mileage
  FROM filtered_trips
  WHERE calculated_kmpl IS NOT NULL AND short_trip = false;
  
  -- Get top driver by total distance
  WITH driver_stats AS (
    SELECT 
      d.id,
      d.name,
      COUNT(t.id) as trip_count,
      SUM(t.end_km - t.start_km) as total_distance
    FROM 
      filtered_trips t
      JOIN drivers d ON t.driver_id = d.id
    GROUP BY d.id, d.name
    ORDER BY total_distance DESC
    LIMIT 1
  )
  SELECT 
    json_build_object(
      'id', ds.id,
      'name', ds.name,
      'totalDistance', ds.total_distance,
      'tripCount', ds.trip_count
    )
  INTO top_driver
  FROM driver_stats ds
  LIMIT 1;
  
  -- Get top vehicle by trip count
  WITH vehicle_stats AS (
    SELECT 
      v.id,
      v.registration_number,
      COUNT(t.id) as trip_count
    FROM 
      filtered_trips t
      JOIN vehicles v ON t.vehicle_id = v.id
    GROUP BY v.id, v.registration_number
    ORDER BY trip_count DESC
    LIMIT 1
  )
  SELECT 
    json_build_object(
      'id', vs.id,
      'registrationNumber', vs.registration_number,
      'tripCount', vs.trip_count
    )
  INTO top_vehicle
  FROM vehicle_stats vs
  LIMIT 1;
  
  -- Build and return the result
  result := json_build_object(
    'totalExpenses', total_expenses,
    'avgDistance', avg_distance,
    'tripCount', trip_count,
    'meanMileage', mean_mileage,
    'topDriver', top_driver,
    'topVehicle', top_vehicle
  );
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_trip_summary_metrics TO authenticated;

--================================================================================

-- Migration: 20250705114320_bronze_moon.sql
/*
  # Create Trip Summary Metrics RPC Function

  1. New Functions
    - `get_trip_summary_metrics` - Returns aggregated metrics for trips based on filters
      - Parameters: start_date, end_date, vehicle_id, driver_id, warehouse_id, trip_type
      - Returns: total_expenses, avg_distance, trip_count, mean_mileage, top_driver, top_vehicle

  2. Security
    - Function accessible to authenticated users
    - Uses existing RLS policies on underlying tables
*/

CREATE OR REPLACE FUNCTION public.get_trip_summary_metrics(
    start_date timestamp with time zone DEFAULT NULL,
    end_date timestamp with time zone DEFAULT NULL,
    p_vehicle_id uuid DEFAULT NULL,
    p_driver_id uuid DEFAULT NULL,
    p_warehouse_id uuid DEFAULT NULL,
    p_trip_type text DEFAULT NULL
)
RETURNS TABLE(
    total_expenses numeric,
    avg_distance numeric,
    trip_count bigint,
    mean_mileage numeric,
    top_driver jsonb,
    top_vehicle jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_expenses numeric;
    v_avg_distance numeric;
    v_trip_count bigint;
    v_mean_mileage numeric;
    v_top_driver jsonb;
    v_top_vehicle jsonb;
BEGIN
    -- Calculate metrics using filtered trips
    WITH filtered_trips AS (
        SELECT
            t.id,
            t.vehicle_id,
            t.driver_id,
            t.warehouse_id,
            COALESCE(t.total_fuel_cost, 0) + COALESCE(t.total_road_expenses, 0) + 
            COALESCE(t.unloading_expense, 0) + COALESCE(t.driver_expense, 0) + 
            COALESCE(t.road_rto_expense, 0) + COALESCE(t.breakdown_expense, 0) + 
            COALESCE(t.miscellaneous_expense, 0) AS total_trip_cost,
            (t.end_km - t.start_km) AS distance_km,
            t.calculated_kmpl,
            t.short_trip,
            t.destinations,
            d.name AS driver_name,
            v.registration_number AS vehicle_registration_number
        FROM
            trips t
        LEFT JOIN
            drivers d ON t.driver_id = d.id
        LEFT JOIN
            vehicles v ON t.vehicle_id = v.id
        WHERE
            (start_date IS NULL OR t.trip_start_date >= start_date) AND
            (end_date IS NULL OR t.trip_end_date <= end_date) AND
            (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id) AND
            (p_driver_id IS NULL OR t.driver_id = p_driver_id) AND
            (p_warehouse_id IS NULL OR t.warehouse_id = p_warehouse_id) AND
            (p_trip_type IS NULL OR
                (p_trip_type = 'local' AND t.short_trip = TRUE) OR
                (p_trip_type = 'one_way' AND t.short_trip = FALSE AND array_length(t.destinations, 1) = 1) OR
                (p_trip_type = 'two_way' AND t.short_trip = FALSE AND array_length(t.destinations, 1) > 1)
            )
    ),
    driver_performance AS (
        SELECT
            driver_id,
            driver_name,
            SUM(distance_km) AS total_distance,
            COUNT(id) AS trip_count
        FROM
            filtered_trips
        WHERE driver_id IS NOT NULL AND driver_name IS NOT NULL
        GROUP BY
            driver_id, driver_name
        ORDER BY
            total_distance DESC
        LIMIT 1
    ),
    vehicle_performance AS (
        SELECT
            vehicle_id,
            vehicle_registration_number,
            COUNT(id) AS trip_count
        FROM
            filtered_trips
        WHERE vehicle_id IS NOT NULL AND vehicle_registration_number IS NOT NULL
        GROUP BY
            vehicle_id, vehicle_registration_number
        ORDER BY
            COUNT(id) DESC
        LIMIT 1
    )
    SELECT
        COALESCE(SUM(ft.total_trip_cost), 0),
        COALESCE(AVG(ft.distance_km), 0),
        COUNT(ft.id),
        COALESCE(AVG(ft.calculated_kmpl) FILTER (WHERE ft.calculated_kmpl IS NOT NULL AND ft.calculated_kmpl > 0), 0),
        (SELECT jsonb_build_object(
            'id', dp.driver_id,
            'name', dp.driver_name,
            'totalDistance', dp.total_distance,
            'tripCount', dp.trip_count
        ) FROM driver_performance dp),
        (SELECT jsonb_build_object(
            'id', vp.vehicle_id,
            'registrationNumber', vp.vehicle_registration_number,
            'tripCount', vp.trip_count
        ) FROM vehicle_performance vp)
    INTO
        v_total_expenses,
        v_avg_distance,
        v_trip_count,
        v_mean_mileage,
        v_top_driver,
        v_top_vehicle
    FROM
        filtered_trips ft;

    RETURN QUERY SELECT
        v_total_expenses,
        v_avg_distance,
        v_trip_count,
        v_mean_mileage,
        v_top_driver,
        v_top_vehicle;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trip_summary_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trip_summary_metrics TO anon;

--================================================================================

-- Migration: 20250705114645_small_field.sql
/*
# Fix Trip Summary Metrics Function

1. Changes
   - Drop existing function first to avoid return type conflict
   - Create function to calculate trip metrics with proper return type
   - Grant execution permissions to authenticated and anon users

2. Purpose
   - Provides summary metrics for trips with filtering capabilities
   - Supports the trip analytics dashboard
*/

-- First drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_trip_summary_metrics(timestamp with time zone, timestamp with time zone, uuid, uuid, uuid, text);

-- Create the function with the correct return type
CREATE OR REPLACE FUNCTION public.get_trip_summary_metrics(
    start_date timestamp with time zone DEFAULT NULL,
    end_date timestamp with time zone DEFAULT NULL,
    p_vehicle_id uuid DEFAULT NULL,
    p_driver_id uuid DEFAULT NULL,
    p_warehouse_id uuid DEFAULT NULL,
    p_trip_type text DEFAULT NULL
)
RETURNS TABLE(
    total_expenses numeric,
    avg_distance numeric,
    trip_count bigint,
    mean_mileage numeric,
    top_driver jsonb,
    top_vehicle jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_expenses numeric;
    v_avg_distance numeric;
    v_trip_count bigint;
    v_mean_mileage numeric;
    v_top_driver jsonb;
    v_top_vehicle jsonb;
BEGIN
    -- Calculate metrics using filtered trips
    WITH filtered_trips AS (
        SELECT
            t.id,
            t.vehicle_id,
            t.driver_id,
            t.warehouse_id,
            COALESCE(t.total_fuel_cost, 0) + COALESCE(t.total_road_expenses, 0) + 
            COALESCE(t.unloading_expense, 0) + COALESCE(t.driver_expense, 0) + 
            COALESCE(t.road_rto_expense, 0) + COALESCE(t.breakdown_expense, 0) + 
            COALESCE(t.miscellaneous_expense, 0) AS total_trip_cost,
            (t.end_km - t.start_km) AS distance_km,
            t.calculated_kmpl,
            t.short_trip,
            t.destinations,
            d.name AS driver_name,
            v.registration_number AS vehicle_registration_number
        FROM
            trips t
        LEFT JOIN
            drivers d ON t.driver_id = d.id
        LEFT JOIN
            vehicles v ON t.vehicle_id = v.id
        WHERE
            (start_date IS NULL OR t.trip_start_date >= start_date) AND
            (end_date IS NULL OR t.trip_end_date <= end_date) AND
            (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id) AND
            (p_driver_id IS NULL OR t.driver_id = p_driver_id) AND
            (p_warehouse_id IS NULL OR t.warehouse_id = p_warehouse_id) AND
            (p_trip_type IS NULL OR
                (p_trip_type = 'local' AND t.short_trip = TRUE) OR
                (p_trip_type = 'one_way' AND t.short_trip = FALSE AND array_length(t.destinations, 1) = 1) OR
                (p_trip_type = 'two_way' AND t.short_trip = FALSE AND array_length(t.destinations, 1) > 1)
            )
    ),
    driver_performance AS (
        SELECT
            driver_id,
            driver_name,
            SUM(distance_km) AS total_distance,
            COUNT(id) AS trip_count
        FROM
            filtered_trips
        WHERE driver_id IS NOT NULL AND driver_name IS NOT NULL
        GROUP BY
            driver_id, driver_name
        ORDER BY
            total_distance DESC
        LIMIT 1
    ),
    vehicle_performance AS (
        SELECT
            vehicle_id,
            vehicle_registration_number,
            COUNT(id) AS trip_count
        FROM
            filtered_trips
        WHERE vehicle_id IS NOT NULL AND vehicle_registration_number IS NOT NULL
        GROUP BY
            vehicle_id, vehicle_registration_number
        ORDER BY
            COUNT(id) DESC
        LIMIT 1
    )
    SELECT
        COALESCE(SUM(ft.total_trip_cost), 0),
        COALESCE(AVG(ft.distance_km), 0),
        COUNT(ft.id),
        COALESCE(AVG(ft.calculated_kmpl) FILTER (WHERE ft.calculated_kmpl IS NOT NULL AND ft.calculated_kmpl > 0), 0),
        (SELECT jsonb_build_object(
            'id', dp.driver_id,
            'name', dp.driver_name,
            'totalDistance', dp.total_distance,
            'tripCount', dp.trip_count
        ) FROM driver_performance dp),
        (SELECT jsonb_build_object(
            'id', vp.vehicle_id,
            'registrationNumber', vp.vehicle_registration_number,
            'tripCount', vp.trip_count
        ) FROM vehicle_performance vp)
    INTO
        v_total_expenses,
        v_avg_distance,
        v_trip_count,
        v_mean_mileage,
        v_top_driver,
        v_top_vehicle
    FROM
        filtered_trips ft;

    RETURN QUERY SELECT
        v_total_expenses,
        v_avg_distance,
        v_trip_count,
        v_mean_mileage,
        v_top_driver,
        v_top_vehicle;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trip_summary_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trip_summary_metrics TO anon;

--================================================================================

-- Migration: 20250723230402_lingering_summit.sql
/*
  # Add Trip Expense Fields

  1. New Columns
    - `breakdown_expense` (numeric) - Breakdown expense for the trip
    - `miscellaneous_expense` (numeric) - Miscellaneous expense for the trip
  
  2. Changes
    - Add breakdown_expense column to trips table with default 0
    - Add miscellaneous_expense column to trips table with default 0
*/

-- Add breakdown_expense column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'breakdown_expense'
  ) THEN
    ALTER TABLE trips ADD COLUMN breakdown_expense numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add miscellaneous_expense column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'miscellaneous_expense'
  ) THEN
    ALTER TABLE trips ADD COLUMN miscellaneous_expense numeric(10,2) DEFAULT 0;
  END IF;
END $$;

--================================================================================

-- Migration: 20250724120000_drop_profiles_role.sql
/*
  # Drop role column from profiles

  1. Changes
    - Remove role column if it exists
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN role;
  END IF;
END $$;


--================================================================================

-- Migration: 20250818113704_weathered_limit.sql
/*
  # Update warehouse RLS policies

  1. Security
    - Enable RLS on warehouses table
    - Add policy for authenticated users to perform all operations
*/

-- Enable RLS on warehouses table
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "warehouses all" ON public.warehouses;

-- Create comprehensive policy for authenticated users
CREATE POLICY "warehouses all" 
  ON public.warehouses 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

--================================================================================

-- Migration: 20250819063327_super_cherry.sql
/*
  # Add is_active column and created_by safety trigger for warehouses

  1. New Columns
    - `is_active` (boolean, default true) - For soft delete functionality
    - Safety trigger for `created_by` to auto-fill from auth.uid() if missing

  2. Indexes
    - Index on `is_active` for filtering queries
    - Index on `created_by` for performance

  3. Functions & Triggers
    - `set_created_by()` function to default created_by from auth.uid()
    - Trigger to automatically set created_by on insert
*/

-- Add is_active if missing
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill any nulls (paranoia)
UPDATE public.warehouses SET is_active = true WHERE is_active IS NULL;

-- Default created_by from auth.uid() if client forgets it
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_created_by ON public.warehouses;
CREATE TRIGGER trg_set_created_by
BEFORE INSERT ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_by ON public.warehouses(created_by);

--================================================================================

-- Migration: 20250819100603_spring_snowflake.sql
-- Add service interval settings to the vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS service_interval_km INTEGER NULL,
ADD COLUMN IF NOT EXISTS service_interval_days INTEGER NULL;

-- Add computed "next due" targets on maintenance tasks
ALTER TABLE public.maintenance_tasks
ADD COLUMN IF NOT EXISTS next_due_odometer INTEGER NULL,
ADD COLUMN IF NOT EXISTS next_due_date DATE NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_service_interval_km ON public.vehicles (service_interval_km);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_interval_days ON public.vehicles (service_interval_days);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_next_due_odo ON public.maintenance_tasks (next_due_odometer);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_next_due_date ON public.maintenance_tasks (next_due_date);

--================================================================================

-- Migration: 20250819173507_turquoise_rain.sql
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

--================================================================================

-- Migration: 20250819173512_black_spark.sql
/*
  # Add created_by to warehouses table

  1. Schema Changes
    - Add `created_by` uuid column
    - Add foreign key constraint to auth.users
    - Add index for performance

  2. Triggers
    - Apply set_created_by trigger

  3. Security
    - Enable RLS
    - Add policies for CRUD operations based on created_by
*/

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouses' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.warehouses ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'warehouses_created_by_fkey'
  ) THEN
    ALTER TABLE public.warehouses
    ADD CONSTRAINT warehouses_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_warehouses_created_by'
  ) THEN
    CREATE INDEX idx_warehouses_created_by ON public.warehouses USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_warehouses'
  ) THEN
    CREATE TRIGGER trg_set_created_by_warehouses
    BEFORE INSERT ON public.warehouses
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "warehouses_select_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_insert_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_update_policy" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_delete_policy" ON public.warehouses;

-- RLS Policies
CREATE POLICY "warehouses_select_policy"
ON public.warehouses
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "warehouses_insert_policy"
ON public.warehouses
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "warehouses_update_policy"
ON public.warehouses
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "warehouses_delete_policy"
ON public.warehouses
FOR DELETE USING (auth.uid() = created_by);

--================================================================================

-- Migration: 20250819173522_dark_lab.sql
/*
  # Add created_by to destinations table

  1. Schema Changes
    - Add `created_by` uuid column
    - Add foreign key constraint to auth.users
    - Add index for performance

  2. Triggers
    - Apply set_created_by trigger

  3. Security
    - Enable RLS
    - Add policies for CRUD operations based on created_by
*/

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.destinations ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'destinations_created_by_fkey'
  ) THEN
    ALTER TABLE public.destinations
    ADD CONSTRAINT destinations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_destinations_created_by'
  ) THEN
    CREATE INDEX idx_destinations_created_by ON public.destinations USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_destinations'
  ) THEN
    CREATE TRIGGER trg_set_created_by_destinations
    BEFORE INSERT ON public.destinations
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_delete_policy" ON public.destinations;

-- RLS Policies
CREATE POLICY "destinations_select_policy"
ON public.destinations
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "destinations_insert_policy"
ON public.destinations
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "destinations_update_policy"
ON public.destinations
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "destinations_delete_policy"
ON public.destinations
FOR DELETE USING (auth.uid() = created_by);

--================================================================================

-- Migration: 20250819173529_damp_voice.sql
/*
  # Add created_by to trips table

  1. Schema Changes
    - Add `created_by` uuid column
    - Add foreign key constraint to auth.users
    - Add index for performance

  2. Triggers
    - Apply set_created_by trigger

  3. Security
    - Enable RLS
    - Add policies for CRUD operations based on created_by
*/

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'trips_created_by_fkey'
  ) THEN
    ALTER TABLE public.trips
    ADD CONSTRAINT trips_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_trips_created_by'
  ) THEN
    CREATE INDEX idx_trips_created_by ON public.trips USING btree (created_by);
  END IF;
END $$;

-- Apply the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_set_created_by_trips'
  ) THEN
    CREATE TRIGGER trg_set_created_by_trips
    BEFORE INSERT ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_update_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON public.trips;

-- RLS Policies
CREATE POLICY "trips_select_policy"
ON public.trips
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "trips_insert_policy"
ON public.trips
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_update_policy"
ON public.trips
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_delete_policy"
ON public.trips
FOR DELETE USING (auth.uid() = created_by);

--================================================================================

-- Migration: 20250821115311_raspy_fountain.sql
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

--================================================================================

-- Migration: 20250821125004_cold_shape.sql
/*
  # Add primary_driver_id column to vehicles table

  1. Schema Changes
    - Add `primary_driver_id` column to `vehicles` table
    - Set up foreign key relationship to `drivers` table
    - Add index for performance

  2. Security
    - Column inherits existing RLS policies from vehicles table

  This resolves the frontend error: "Could not find the 'primary_driver_id' column of 'vehicles' in the schema cache"
*/

-- Add primary_driver_id column to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'primary_driver_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN primary_driver_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehicles_primary_driver_id_fkey'
  ) THEN
    ALTER TABLE vehicles 
    ADD CONSTRAINT vehicles_primary_driver_id_fkey 
    FOREIGN KEY (primary_driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_vehicles_primary_driver_id'
  ) THEN
    CREATE INDEX idx_vehicles_primary_driver_id ON vehicles(primary_driver_id);
  END IF;
END $$;

--================================================================================

-- Migration: 20250829070316_maroon_shadow.sql
/*
  # Add place_name column to destinations table

  1. Changes
     - Add `place_name` column to `destinations` table
     - Column type: text (nullable)
     - This column will store the full place name from Google Places API

  2. Notes
     - The `place_name` column is used to store the complete place name from Google Places
     - This is separate from the `name` field which may be shortened for display
     - Column is nullable to maintain compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'place_name'
  ) THEN
    ALTER TABLE destinations ADD COLUMN place_name text;
  END IF;
END $$;

--================================================================================

-- Migration: 20250911070000_add_refuelings_column.sql
/*
  # Add refuelings column to trips table

  1. Changes
     - Add `refuelings` JSONB column to `trips` table
     - Column stores array of refueling records with location, quantity, rate, and cost
     - Default to empty array for backward compatibility

  2. Notes
     - This supports the Multiple Refuelings Feature implemented in the frontend
     - JSONB allows efficient storage and querying of refueling data
     - Nullable column maintains compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'refuelings'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN refuelings jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

--================================================================================

-- Migration: 20250912161700_add_correction_cascade.sql
-- Fix 5: Data Correction Cascade Management
-- Create audit table for tracking corrections

-- Create trip_corrections table for audit tracking
CREATE TABLE IF NOT EXISTS trip_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    correction_reason TEXT,
    affects_subsequent_trips BOOLEAN DEFAULT false,
    corrected_by UUID REFERENCES auth.users(id),
    corrected_at TIMESTAMP DEFAULT NOW()
);

-- Add soft delete columns to trips table if they don't exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for correction lookups
CREATE INDEX IF NOT EXISTS idx_trip_corrections_trip_id ON trip_corrections(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_corrections_corrected_at ON trip_corrections(corrected_at);

-- Function to handle trip deletion with chain validation (for mileage chain integrity)
CREATE OR REPLACE FUNCTION handle_trip_deletion()
RETURNS TRIGGER AS $$
DECLARE
    dependent_trips_count INTEGER;
BEGIN
    -- Check if this is a refueling trip
    IF OLD.refueling_done = true THEN
        -- Count trips that depend on this refueling
        SELECT COUNT(*) INTO dependent_trips_count
        FROM trips
        WHERE vehicle_id = OLD.vehicle_id
            AND trip_start_date > OLD.trip_end_date
            AND deleted_at IS NULL
            AND refueling_done = false;
        
        IF dependent_trips_count > 0 THEN
            -- Soft delete instead of hard delete
            UPDATE trips 
            SET deleted_at = NOW(),
                deletion_reason = 'Soft deleted - has dependent non-refueling trips'
            WHERE id = OLD.id;
            
            -- Prevent the actual deletion
            RETURN NULL;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion protection
DROP TRIGGER IF EXISTS preserve_mileage_chain ON trips;
CREATE TRIGGER preserve_mileage_chain
BEFORE DELETE ON trips
FOR EACH ROW
EXECUTE FUNCTION handle_trip_deletion();

-- Function to recalculate trip mileage for chain integrity
CREATE OR REPLACE FUNCTION recalculate_trip_mileage(
    p_trip_id UUID
) RETURNS VOID AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
BEGIN
    -- Get the trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id AND deleted_at IS NULL;
    
    IF NOT FOUND OR NOT trip_record.refueling_done THEN
        RETURN;
    END IF;
    
    -- Find previous refueling trip
    SELECT * INTO prev_refueling
    FROM trips
    WHERE vehicle_id = trip_record.vehicle_id
        AND trip_end_date < trip_record.trip_end_date
        AND refueling_done = true
        AND deleted_at IS NULL
    ORDER BY trip_end_date DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Tank-to-tank calculation
        UPDATE trips
        SET calculated_kmpl = (trip_record.end_km - prev_refueling.end_km) / 
                              NULLIF(trip_record.fuel_quantity, 0)
        WHERE id = p_trip_id;
    ELSE
        -- Simple calculation for first refueling
        UPDATE trips
        SET calculated_kmpl = (trip_record.end_km - trip_record.start_km) / 
                              NULLIF(trip_record.fuel_quantity, 0)
        WHERE id = p_trip_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for trip_corrections
ALTER TABLE trip_corrections ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own corrections
CREATE POLICY "Users can view own trip corrections" ON trip_corrections
FOR SELECT USING (corrected_by = auth.uid());

-- Policy for users to insert corrections for their own trips
CREATE POLICY "Users can insert trip corrections" ON trip_corrections
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM trips 
        WHERE trips.id = trip_corrections.trip_id 
        AND trips.created_by = auth.uid()
    )
);

-- Create atomic cascade function for proper transaction handling
CREATE OR REPLACE FUNCTION cascade_odometer_correction_atomic(
    p_trip_id UUID,
    p_new_end_km INTEGER,
    p_correction_reason TEXT
) RETURNS TABLE(
    affected_trip_id UUID,
    trip_serial_number TEXT,
    old_start_km INTEGER,
    new_start_km INTEGER,
    old_end_km INTEGER,
    new_end_km INTEGER
) AS $$
DECLARE
    current_trip RECORD;
    km_difference INTEGER;
    trip_record RECORD;
BEGIN
    -- Get current trip data with security check
    SELECT * INTO current_trip
    FROM trips
    WHERE id = p_trip_id AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip not found or access denied';
    END IF;
    
    km_difference := p_new_end_km - current_trip.end_km;
    
    -- Update current trip
    UPDATE trips
    SET end_km = p_new_end_km
    WHERE id = p_trip_id;
    
    -- Recalculate current trip's mileage if it's a refueling trip
    IF current_trip.refueling_done = true THEN
        PERFORM recalculate_trip_mileage(p_trip_id);
    END IF;
    
    -- Log current trip correction
    INSERT INTO trip_corrections (
        trip_id, field_name, old_value, new_value, 
        correction_reason, affects_subsequent_trips, corrected_by
    ) VALUES (
        p_trip_id, 'end_km', 
        current_trip.end_km::TEXT, 
        p_new_end_km::TEXT,
        p_correction_reason, true, auth.uid()
    );
    
    -- If no difference, return empty
    IF km_difference = 0 THEN
        RETURN;
    END IF;
    
    -- Update all subsequent trips for the same vehicle (same user only)
    FOR trip_record IN
        SELECT id, trip_serial_number, start_km, end_km
        FROM trips
        WHERE vehicle_id = current_trip.vehicle_id
            AND trip_start_date > current_trip.trip_end_date
            AND deleted_at IS NULL
            AND created_by = auth.uid()
        ORDER BY trip_start_date
    LOOP
        -- Update the trip's odometer readings
        UPDATE trips
        SET start_km = start_km + km_difference,
            end_km = end_km + km_difference
        WHERE id = trip_record.id;
        
        -- Recalculate mileage using proper tank-to-tank logic for refueling trips
        IF EXISTS (SELECT 1 FROM trips WHERE id = trip_record.id AND refueling_done = true) THEN
            PERFORM recalculate_trip_mileage(trip_record.id);
        END IF;
        
        -- Log the cascade correction
        INSERT INTO trip_corrections (
            trip_id, field_name, old_value, new_value, 
            correction_reason, affects_subsequent_trips, corrected_by
        ) VALUES (
            trip_record.id, 'odometer_cascade', 
            format('%s-%s', trip_record.start_km, trip_record.end_km), 
            format('%s-%s', trip_record.start_km + km_difference, trip_record.end_km + km_difference),
            p_correction_reason, true, auth.uid()
        );
        
        -- Return affected trip info
        RETURN QUERY SELECT 
            trip_record.id,
            trip_record.trip_serial_number,
            trip_record.start_km,
            trip_record.start_km + km_difference,
            trip_record.end_km,
            trip_record.end_km + km_difference;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create preview function (read-only)
CREATE OR REPLACE FUNCTION preview_cascade_impact(
    p_trip_id UUID,
    p_new_end_km INTEGER
) RETURNS TABLE(
    trip_serial_number TEXT,
    current_start_km INTEGER,
    new_start_km INTEGER
) AS $$
DECLARE
    current_trip RECORD;
    km_difference INTEGER;
BEGIN
    -- Get current trip data with security check
    SELECT vehicle_id, end_km, trip_end_date INTO current_trip
    FROM trips
    WHERE id = p_trip_id AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    km_difference := p_new_end_km - current_trip.end_km;
    
    -- Return preview of affected trips
    RETURN QUERY
    SELECT 
        t.trip_serial_number,
        t.start_km,
        t.start_km + km_difference
    FROM trips t
    WHERE t.vehicle_id = current_trip.vehicle_id
        AND t.trip_start_date > current_trip.trip_end_date
        AND t.deleted_at IS NULL
        AND t.created_by = auth.uid()
    ORDER BY t.trip_start_date
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON trip_corrections TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION cascade_odometer_correction_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION preview_cascade_impact TO authenticated;

--================================================================================

-- Migration: 20250912162000_add_odometer_continuity_check.sql
-- Fix 1: Odometer Continuity Validation
-- Ensures odometer readings are continuous across trips for the same vehicle

-- Function to validate odometer continuity
CREATE OR REPLACE FUNCTION validate_odometer_continuity()
RETURNS TRIGGER AS $$
DECLARE
    prev_trip RECORD;
    gap_km INTEGER;
    warning_message TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Find the previous trip for this vehicle
    SELECT * INTO prev_trip
    FROM trips
    WHERE vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND trip_end_date < NEW.trip_start_date
        AND deleted_at IS NULL
        AND created_by = NEW.created_by
    ORDER BY trip_end_date DESC
    LIMIT 1;

    -- If no previous trip exists, this is the first trip for this vehicle - allow it
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Calculate the gap between trips
    gap_km := NEW.start_km - prev_trip.end_km;

    -- Check for negative gap (odometer went backwards)
    IF gap_km < 0 THEN
        RAISE EXCEPTION 'Odometer continuity violation: Start KM (%) cannot be less than previous trip end KM (%). Previous trip: % ended on %',
            NEW.start_km, 
            prev_trip.end_km, 
            prev_trip.trip_serial_number, 
            TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI');
    END IF;

    -- Check for large gap (>50km) - warning but allow
    IF gap_km > 50 THEN
        warning_message := format(
            'Large odometer gap detected: %s km between trips. Previous trip %s ended at %s km on %s. Current trip starts at %s km.',
            gap_km,
            prev_trip.trip_serial_number,
            prev_trip.end_km,
            TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            NEW.start_km
        );
        
        -- Log the warning to audit trail if the function exists
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'odometer_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                'validated_with_warning',
                jsonb_build_object(
                    'gap_km', gap_km,
                    'previous_trip_id', prev_trip.id,
                    'previous_trip_serial', prev_trip.trip_serial_number,
                    'previous_end_km', prev_trip.end_km,
                    'current_start_km', NEW.start_km
                ),
                jsonb_build_object('warning', warning_message),
                'warning',
                NULL,
                ARRAY['odometer_gap', 'large_gap'],
                warning_message
            );
        END IF;
        
        -- Raise notice but allow the operation
        RAISE NOTICE '%', warning_message;
    END IF;

    -- Also validate that end_km > start_km for the current trip
    IF NEW.end_km <= NEW.start_km THEN
        RAISE EXCEPTION 'Invalid odometer reading: End KM (%) must be greater than Start KM (%)',
            NEW.end_km, NEW.start_km;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for odometer continuity validation
DROP TRIGGER IF EXISTS check_odometer_continuity ON trips;
CREATE TRIGGER check_odometer_continuity
    BEFORE INSERT OR UPDATE OF start_km, end_km, trip_start_date, trip_end_date, vehicle_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_odometer_continuity();

-- Function to check and report odometer gaps for a vehicle
CREATE OR REPLACE FUNCTION check_vehicle_odometer_gaps(
    p_vehicle_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip_serial_number TEXT,
    trip_date DATE,
    start_km INTEGER,
    previous_trip_serial TEXT,
    previous_end_km INTEGER,
    gap_km INTEGER,
    gap_severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH ordered_trips AS (
        SELECT 
            t.trip_serial_number,
            t.trip_start_date::DATE as trip_date,
            t.start_km,
            t.end_km,
            LAG(t.trip_serial_number) OVER (ORDER BY t.trip_start_date) as prev_serial,
            LAG(t.end_km) OVER (ORDER BY t.trip_start_date) as prev_end_km
        FROM trips t
        WHERE t.vehicle_id = p_vehicle_id
            AND t.deleted_at IS NULL
            AND (p_date_from IS NULL OR t.trip_start_date >= p_date_from)
            AND (p_date_to IS NULL OR t.trip_start_date <= p_date_to)
            AND t.created_by = auth.uid()
        ORDER BY t.trip_start_date
    )
    SELECT 
        ot.trip_serial_number,
        ot.trip_date,
        ot.start_km,
        ot.prev_serial as previous_trip_serial,
        ot.prev_end_km as previous_end_km,
        (ot.start_km - ot.prev_end_km) as gap_km,
        CASE 
            WHEN ot.prev_end_km IS NULL THEN 'first_trip'
            WHEN (ot.start_km - ot.prev_end_km) < 0 THEN 'error_negative'
            WHEN (ot.start_km - ot.prev_end_km) = 0 THEN 'perfect'
            WHEN (ot.start_km - ot.prev_end_km) <= 10 THEN 'normal'
            WHEN (ot.start_km - ot.prev_end_km) <= 50 THEN 'moderate'
            ELSE 'large'
        END as gap_severity
    FROM ordered_trips ot
    WHERE ot.prev_end_km IS NULL OR (ot.start_km - ot.prev_end_km) != 0
    ORDER BY ot.trip_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_odometer_continuity() TO authenticated;
GRANT EXECUTE ON FUNCTION check_vehicle_odometer_gaps(UUID, DATE, DATE) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_odometer_continuity() IS 'Validates odometer continuity between trips for the same vehicle';
COMMENT ON FUNCTION check_vehicle_odometer_gaps(UUID, DATE, DATE) IS 'Reports odometer gaps between trips for a specific vehicle';

--================================================================================

-- Migration: 20250912163000_add_concurrent_trip_prevention.sql
-- Fix 2: Concurrent Trip Prevention
-- Prevents overlapping trips for the same vehicle or driver

-- Function to check for trip overlaps
CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    vehicle_conflict RECORD;
    driver_conflict RECORD;
    error_message TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Skip if dates are not set
    IF NEW.trip_start_date IS NULL OR NEW.trip_end_date IS NULL THEN
        RETURN NEW;
    END IF;

    -- Validate that end date is after start date
    IF NEW.trip_end_date <= NEW.trip_start_date THEN
        RAISE EXCEPTION 'Trip end date (%) must be after start date (%)',
            TO_CHAR(NEW.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(NEW.trip_start_date, 'DD-MM-YYYY HH24:MI');
    END IF;

    -- Check for vehicle conflicts (same vehicle on multiple trips)
    SELECT 
        t.id,
        t.trip_serial_number,
        t.trip_start_date,
        t.trip_end_date,
        t.driver_name
    INTO vehicle_conflict
    FROM trips t
    WHERE t.vehicle_id = NEW.vehicle_id
        AND t.id != COALESCE(NEW.id, gen_random_uuid())
        AND t.deleted_at IS NULL
        AND t.created_by = NEW.created_by
        AND (
            -- Check if new trip overlaps with existing trip
            (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
            OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
            OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
        )
    LIMIT 1;

    IF FOUND THEN
        error_message := format(
            'Vehicle conflict: %s is already on trip %s from %s to %s with driver %s',
            NEW.vehicle_registration,
            vehicle_conflict.trip_serial_number,
            TO_CHAR(vehicle_conflict.trip_start_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(vehicle_conflict.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            vehicle_conflict.driver_name
        );
        RAISE EXCEPTION '%', error_message;
    END IF;

    -- Check for driver conflicts (same driver on multiple trips)
    -- Only check if driver_id is provided
    IF NEW.driver_id IS NOT NULL THEN
        SELECT 
            t.id,
            t.trip_serial_number,
            t.trip_start_date,
            t.trip_end_date,
            t.vehicle_registration
        INTO driver_conflict
        FROM trips t
        WHERE t.driver_id = NEW.driver_id
            AND t.id != COALESCE(NEW.id, gen_random_uuid())
            AND t.deleted_at IS NULL
            AND t.created_by = NEW.created_by
            AND (
                -- Check if new trip overlaps with existing trip
                (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
                OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
                OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
            )
        LIMIT 1;

        IF FOUND THEN
            error_message := format(
                'Driver conflict: %s is already on trip %s with vehicle %s from %s to %s',
                NEW.driver_name,
                driver_conflict.trip_serial_number,
                driver_conflict.vehicle_registration,
                TO_CHAR(driver_conflict.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(driver_conflict.trip_end_date, 'DD-MM-YYYY HH24:MI')
            );
            RAISE EXCEPTION '%', error_message;
        END IF;
    END IF;

    -- Log successful validation to audit trail if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        PERFORM log_audit_trail(
            'overlap_validation',
            'trip_data',
            'trip',
            NEW.id::TEXT,
            format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
            'validated',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'driver_id', NEW.driver_id,
                'trip_start', NEW.trip_start_date,
                'trip_end', NEW.trip_end_date
            ),
            jsonb_build_object('validation', 'no_conflicts_found'),
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent concurrent trips
DROP TRIGGER IF EXISTS prevent_concurrent_trips ON trips;
CREATE TRIGGER prevent_concurrent_trips
    BEFORE INSERT OR UPDATE OF trip_start_date, trip_end_date, vehicle_id, driver_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_overlap();

-- Function to find overlapping trips for a vehicle
CREATE OR REPLACE FUNCTION find_overlapping_trips(
    p_vehicle_id UUID DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip1_id UUID,
    trip1_serial TEXT,
    trip1_start TIMESTAMP,
    trip1_end TIMESTAMP,
    trip2_id UUID,
    trip2_serial TEXT,
    trip2_start TIMESTAMP,
    trip2_end TIMESTAMP,
    overlap_type TEXT,
    vehicle_registration TEXT,
    driver_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t1.id as trip1_id,
        t1.trip_serial_number as trip1_serial,
        t1.trip_start_date as trip1_start,
        t1.trip_end_date as trip1_end,
        t2.id as trip2_id,
        t2.trip_serial_number as trip2_serial,
        t2.trip_start_date as trip2_start,
        t2.trip_end_date as trip2_end,
        CASE 
            WHEN t1.trip_start_date = t2.trip_start_date AND t1.trip_end_date = t2.trip_end_date THEN 'exact_duplicate'
            WHEN t1.trip_start_date >= t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date THEN 'contained_within'
            WHEN t2.trip_start_date >= t1.trip_start_date AND t2.trip_end_date <= t1.trip_end_date THEN 'contains'
            WHEN t1.trip_start_date < t2.trip_end_date AND t1.trip_end_date > t2.trip_start_date THEN 'partial_overlap'
            ELSE 'unknown'
        END as overlap_type,
        t1.vehicle_registration,
        t1.driver_name
    FROM trips t1
    INNER JOIN trips t2 ON (
        (p_vehicle_id IS NULL OR (t1.vehicle_id = p_vehicle_id AND t2.vehicle_id = p_vehicle_id))
        AND (p_driver_id IS NULL OR (t1.driver_id = p_driver_id AND t2.driver_id = p_driver_id))
        AND t1.id < t2.id -- Avoid duplicate pairs
        AND t1.deleted_at IS NULL
        AND t2.deleted_at IS NULL
        AND t1.created_by = auth.uid()
        AND t2.created_by = auth.uid()
        AND (
            -- Check for overlaps
            (t1.trip_start_date >= t2.trip_start_date AND t1.trip_start_date < t2.trip_end_date)
            OR (t1.trip_end_date > t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date)
            OR (t1.trip_start_date <= t2.trip_start_date AND t1.trip_end_date >= t2.trip_end_date)
        )
    )
    WHERE (p_date_from IS NULL OR t1.trip_start_date >= p_date_from)
        AND (p_date_to IS NULL OR t1.trip_start_date <= p_date_to)
    ORDER BY t1.trip_start_date, t2.trip_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a time slot is available for a vehicle
CREATE OR REPLACE FUNCTION is_vehicle_available(
    p_vehicle_id UUID,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_exclude_trip_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM trips t
    WHERE t.vehicle_id = p_vehicle_id
        AND t.id != COALESCE(p_exclude_trip_id, gen_random_uuid())
        AND t.deleted_at IS NULL
        AND t.created_by = auth.uid()
        AND (
            (p_start_date >= t.trip_start_date AND p_start_date < t.trip_end_date)
            OR (p_end_date > t.trip_start_date AND p_end_date <= t.trip_end_date)
            OR (p_start_date <= t.trip_start_date AND p_end_date >= t.trip_end_date)
        );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_trip_overlap() TO authenticated;
GRANT EXECUTE ON FUNCTION find_overlapping_trips(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION is_vehicle_available(UUID, TIMESTAMP, TIMESTAMP, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION check_trip_overlap() IS 'Validates that trips do not overlap for the same vehicle or driver';
COMMENT ON FUNCTION find_overlapping_trips(UUID, UUID, DATE, DATE) IS 'Finds all overlapping trips for a given vehicle or driver';
COMMENT ON FUNCTION is_vehicle_available(UUID, TIMESTAMP, TIMESTAMP, UUID) IS 'Checks if a vehicle is available for a given time period';

--================================================================================

-- Migration: 20250912164100_add_fuel_efficiency_baselines.sql
-- Create fuel efficiency baselines table for vehicle performance tracking
CREATE TABLE IF NOT EXISTS fuel_efficiency_baselines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vehicle reference
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_registration TEXT NOT NULL,
  
  -- Baseline metrics
  baseline_kmpl DECIMAL(6,2) NOT NULL CHECK (baseline_kmpl > 0),
  baseline_calculated_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sample_size INTEGER NOT NULL CHECK (sample_size >= 10),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Tolerance settings
  tolerance_upper_percent DECIMAL(5,2) DEFAULT 15.00 CHECK (tolerance_upper_percent >= 0),
  tolerance_lower_percent DECIMAL(5,2) DEFAULT 15.00 CHECK (tolerance_lower_percent >= 0),
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_range JSONB NOT NULL DEFAULT '{}',
  
  -- Constraints
  UNIQUE(vehicle_id),
  
  -- Indexes for performance
  CONSTRAINT valid_confidence_score CHECK (confidence_score BETWEEN 0 AND 100),
  CONSTRAINT valid_sample_size CHECK (sample_size >= 10),
  CONSTRAINT valid_baseline_kmpl CHECK (baseline_kmpl > 0 AND baseline_kmpl < 100)
);

-- Create indexes for efficient querying
CREATE INDEX idx_fuel_baselines_vehicle_id ON fuel_efficiency_baselines(vehicle_id);
CREATE INDEX idx_fuel_baselines_confidence ON fuel_efficiency_baselines(confidence_score);
CREATE INDEX idx_fuel_baselines_updated ON fuel_efficiency_baselines(last_updated);

-- Enable RLS
ALTER TABLE fuel_efficiency_baselines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR SELECT USING (
    created_by IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'organization_id' = 
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    vehicle_id IN (
      SELECT id FROM vehicles 
      WHERE created_by IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'organization_id' = 
          (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'organization_id' = 
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR DELETE USING (
    created_by IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'organization_id' = 
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fuel_baseline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fuel_baseline_updated_at_trigger
  BEFORE UPDATE ON fuel_efficiency_baselines
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_baseline_updated_at();

-- Add comments for documentation
COMMENT ON TABLE fuel_efficiency_baselines IS 'Vehicle-specific fuel efficiency baselines for performance monitoring';
COMMENT ON COLUMN fuel_efficiency_baselines.baseline_kmpl IS 'Calculated baseline fuel efficiency in km per liter';
COMMENT ON COLUMN fuel_efficiency_baselines.confidence_score IS 'Confidence level of baseline accuracy (0-100)';
COMMENT ON COLUMN fuel_efficiency_baselines.sample_size IS 'Number of trips used to calculate baseline';
COMMENT ON COLUMN fuel_efficiency_baselines.data_range IS 'JSON object containing calculation metadata and date ranges';

--================================================================================

-- Migration: 20250912165000_add_mileage_chain_integrity.sql
-- Fix 3: Mileage Calculation Chain Integrity
-- Additional functions for comprehensive mileage chain integrity beyond correction cascade

-- Ensure deleted_at column exists for soft deletion (may already exist from correction cascade)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Function to validate mileage calculation chain
CREATE OR REPLACE FUNCTION validate_mileage_chain(
    p_vehicle_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip_id UUID,
    trip_serial TEXT,
    trip_date DATE,
    is_refueling BOOLEAN,
    fuel_quantity DECIMAL,
    distance_km INTEGER,
    calculated_kmpl DECIMAL,
    expected_kmpl DECIMAL,
    chain_valid BOOLEAN,
    validation_message TEXT
) AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
    expected_mileage DECIMAL;
    total_distance INTEGER;
    total_fuel DECIMAL;
BEGIN
    -- Initialize previous refueling as NULL
    prev_refueling := NULL;
    
    FOR trip_record IN
        SELECT 
            t.id,
            t.trip_serial_number,
            t.trip_start_date::DATE as trip_date,
            t.refueling_done,
            t.fuel_quantity,
            t.start_km,
            t.end_km,
            t.calculated_kmpl
        FROM trips t
        WHERE t.vehicle_id = p_vehicle_id
            AND t.deleted_at IS NULL
            AND t.created_by = auth.uid()
            AND (p_date_from IS NULL OR t.trip_start_date >= p_date_from)
            AND (p_date_to IS NULL OR t.trip_start_date <= p_date_to)
        ORDER BY t.trip_start_date
    LOOP
        IF trip_record.refueling_done THEN
            -- This is a refueling trip
            IF prev_refueling IS NOT NULL THEN
                -- Calculate expected mileage based on tank-to-tank method
                total_distance := trip_record.end_km - prev_refueling.end_km;
                total_fuel := trip_record.fuel_quantity;
                
                IF total_fuel > 0 THEN
                    expected_mileage := total_distance::DECIMAL / total_fuel;
                ELSE
                    expected_mileage := NULL;
                END IF;
                
                -- Return validation result
                RETURN QUERY SELECT
                    trip_record.id,
                    trip_record.trip_serial_number,
                    trip_record.trip_date,
                    trip_record.refueling_done,
                    trip_record.fuel_quantity,
                    total_distance,
                    trip_record.calculated_kmpl,
                    expected_mileage,
                    COALESCE(ABS(trip_record.calculated_kmpl - expected_mileage) < 0.5, FALSE) as chain_valid,
                    CASE 
                        WHEN expected_mileage IS NULL THEN 'No fuel quantity recorded'
                        WHEN ABS(COALESCE(trip_record.calculated_kmpl, 0) - expected_mileage) < 0.5 THEN 'Chain valid'
                        ELSE format('Mismatch: calculated=%s, expected=%s', 
                                   COALESCE(trip_record.calculated_kmpl::TEXT, 'NULL'), 
                                   expected_mileage::TEXT)
                    END as validation_message;
            ELSE
                -- First refueling trip
                RETURN QUERY SELECT
                    trip_record.id,
                    trip_record.trip_serial_number,
                    trip_record.trip_date,
                    trip_record.refueling_done,
                    trip_record.fuel_quantity,
                    trip_record.end_km - trip_record.start_km,
                    trip_record.calculated_kmpl,
                    NULL::DECIMAL,
                    TRUE,
                    'First refueling trip - no previous reference' as validation_message;
            END IF;
            
            -- Update previous refueling reference
            prev_refueling := trip_record;
        ELSE
            -- Non-refueling trip
            RETURN QUERY SELECT
                trip_record.id,
                trip_record.trip_serial_number,
                trip_record.trip_date,
                trip_record.refueling_done,
                trip_record.fuel_quantity,
                trip_record.end_km - trip_record.start_km,
                trip_record.calculated_kmpl,
                NULL::DECIMAL,
                TRUE,
                'Non-refueling trip - not part of chain calculation' as validation_message;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rebuild mileage chain for a vehicle
CREATE OR REPLACE FUNCTION rebuild_mileage_chain(
    p_vehicle_id UUID,
    p_recalculate_all BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    trips_processed INTEGER,
    refueling_trips_updated INTEGER,
    chain_status TEXT
) AS $$
DECLARE
    trip_count INTEGER := 0;
    refueling_count INTEGER := 0;
    trip_record RECORD;
    prev_refueling RECORD;
    new_kmpl DECIMAL;
BEGIN
    -- Initialize
    prev_refueling := NULL;
    
    -- Process all trips in chronological order
    FOR trip_record IN
        SELECT 
            id,
            trip_serial_number,
            start_km,
            end_km,
            refueling_done,
            fuel_quantity,
            calculated_kmpl
        FROM trips
        WHERE vehicle_id = p_vehicle_id
            AND deleted_at IS NULL
            AND created_by = auth.uid()
        ORDER BY trip_start_date
    LOOP
        trip_count := trip_count + 1;
        
        IF trip_record.refueling_done AND trip_record.fuel_quantity > 0 THEN
            IF prev_refueling IS NOT NULL THEN
                -- Calculate tank-to-tank mileage
                new_kmpl := (trip_record.end_km - prev_refueling.end_km)::DECIMAL / trip_record.fuel_quantity;
                
                -- Update if different or if recalculate_all is true
                IF p_recalculate_all OR 
                   trip_record.calculated_kmpl IS NULL OR 
                   ABS(COALESCE(trip_record.calculated_kmpl, 0) - new_kmpl) > 0.01 THEN
                    
                    UPDATE trips
                    SET calculated_kmpl = new_kmpl
                    WHERE id = trip_record.id;
                    
                    refueling_count := refueling_count + 1;
                    
                    -- Log to audit trail if function exists
                    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                        PERFORM log_audit_trail(
                            'mileage_recalculation',
                            'trip_data',
                            'trip',
                            trip_record.id::TEXT,
                            format('Trip %s', trip_record.trip_serial_number),
                            'recalculated',
                            jsonb_build_object(
                                'old_kmpl', trip_record.calculated_kmpl,
                                'new_kmpl', new_kmpl,
                                'distance', trip_record.end_km - prev_refueling.end_km,
                                'fuel', trip_record.fuel_quantity
                            ),
                            NULL,
                            'info'
                        );
                    END IF;
                END IF;
            END IF;
            
            -- Update reference to previous refueling
            prev_refueling := trip_record;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        trip_count as trips_processed,
        refueling_count as refueling_trips_updated,
        format('Processed %s trips, updated %s refueling calculations', trip_count, refueling_count) as chain_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect and fix mileage chain breaks
CREATE OR REPLACE FUNCTION detect_mileage_chain_breaks(
    p_vehicle_id UUID
) RETURNS TABLE (
    break_location TEXT,
    trip_before_id UUID,
    trip_before_serial TEXT,
    trip_after_id UUID,
    trip_after_serial TEXT,
    gap_km INTEGER,
    gap_type TEXT,
    suggested_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH trip_pairs AS (
        SELECT 
            t1.id as before_id,
            t1.trip_serial_number as before_serial,
            t1.end_km as before_end_km,
            t1.trip_end_date as before_end_date,
            t2.id as after_id,
            t2.trip_serial_number as after_serial,
            t2.start_km as after_start_km,
            t2.trip_start_date as after_start_date
        FROM trips t1
        INNER JOIN trips t2 ON (
            t1.vehicle_id = t2.vehicle_id
            AND t1.trip_end_date < t2.trip_start_date
            AND t1.deleted_at IS NULL
            AND t2.deleted_at IS NULL
            AND t1.created_by = auth.uid()
            AND t2.created_by = auth.uid()
        )
        WHERE t1.vehicle_id = p_vehicle_id
            AND NOT EXISTS (
                -- No trip between t1 and t2
                SELECT 1 FROM trips t3
                WHERE t3.vehicle_id = p_vehicle_id
                    AND t3.trip_start_date > t1.trip_end_date
                    AND t3.trip_end_date < t2.trip_start_date
                    AND t3.deleted_at IS NULL
                    AND t3.created_by = auth.uid()
            )
    )
    SELECT 
        format('Between %s and %s', 
               TO_CHAR(before_end_date, 'DD-MM-YYYY'), 
               TO_CHAR(after_start_date, 'DD-MM-YYYY')) as break_location,
        before_id,
        before_serial,
        after_id,
        after_serial,
        (after_start_km - before_end_km) as gap_km,
        CASE 
            WHEN (after_start_km - before_end_km) < 0 THEN 'negative_gap'
            WHEN (after_start_km - before_end_km) = 0 THEN 'continuous'
            WHEN (after_start_km - before_end_km) > 100 THEN 'large_gap'
            ELSE 'small_gap'
        END as gap_type,
        CASE 
            WHEN (after_start_km - before_end_km) < 0 THEN 
                format('Fix odometer: Trip %s should start at %s km or higher', after_serial, before_end_km)
            WHEN (after_start_km - before_end_km) > 100 THEN 
                'Check for missing trips or validate large gap is legitimate'
            WHEN (after_start_km - before_end_km) > 0 THEN 
                'Small gap - likely legitimate vehicle movement without trip logging'
            ELSE 'Chain is continuous'
        END as suggested_action
    FROM trip_pairs
    WHERE (after_start_km - before_end_km) != 0
    ORDER BY before_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_mileage_chain(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_mileage_chain(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_mileage_chain_breaks(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_mileage_chain IS 'Validates the mileage calculation chain for a vehicle';
COMMENT ON FUNCTION rebuild_mileage_chain IS 'Rebuilds the mileage calculation chain for a vehicle';
COMMENT ON FUNCTION detect_mileage_chain_breaks IS 'Detects breaks in the odometer continuity chain';

--================================================================================

-- Migration: 20250912166000_add_value_range_validation.sql
-- Fix 4: Unrealistic Value Detection
-- Validates trip values are within realistic ranges

-- Add CHECK constraints for basic positive value validation
-- These will be added only if they don't already exist
DO $$
BEGIN
    -- Check if distance constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_positive_distance' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_positive_distance 
            CHECK ((end_km - start_km) >= 0);
    END IF;
    
    -- Check if fuel constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_positive_fuel' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_positive_fuel 
            CHECK (fuel_quantity IS NULL OR fuel_quantity >= 0);
    END IF;
    
    -- Check if expense constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_positive_expenses' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_positive_expenses 
            CHECK (
                (fuel_expense IS NULL OR fuel_expense >= 0) AND
                (driver_expense IS NULL OR driver_expense >= 0) AND
                (toll_expense IS NULL OR toll_expense >= 0) AND
                (other_expense IS NULL OR other_expense >= 0)
            );
    END IF;
END $$;

-- Function to validate trip values for realistic ranges
CREATE OR REPLACE FUNCTION validate_trip_values()
RETURNS TRIGGER AS $$
DECLARE
    distance_km INTEGER;
    trip_duration_hours NUMERIC;
    kmpl NUMERIC;
    validation_errors TEXT[];
    edge_case_reason TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Initialize validation errors array
    validation_errors := ARRAY[]::TEXT[];

    -- Calculate distance
    distance_km := NEW.end_km - NEW.start_km;

    -- Calculate trip duration in hours
    IF NEW.trip_start_date IS NOT NULL AND NEW.trip_end_date IS NOT NULL THEN
        trip_duration_hours := EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600.0;
    ELSE
        trip_duration_hours := NULL;
    END IF;

    -- Check for edge cases first
    edge_case_reason := NULL;

    -- Edge case: Maintenance trip (zero distance allowed)
    IF distance_km = 0 AND NEW.trip_type = 'maintenance' THEN
        edge_case_reason := 'Maintenance trip with zero distance';
    -- Edge case: Test trip (short distance allowed)
    ELSIF distance_km < 5 AND NEW.trip_type = 'test' THEN
        edge_case_reason := 'Test trip with minimal distance';
    -- Edge case: Refueling only trip
    ELSIF distance_km < 10 AND NEW.refueling_done = true THEN
        edge_case_reason := 'Refueling trip with short distance';
    END IF;

    -- If not an edge case, perform standard validations
    IF edge_case_reason IS NULL THEN
        -- Check for impossible distances
        IF distance_km < 0 THEN
            validation_errors := array_append(validation_errors, 
                format('Negative distance not allowed: %s km', distance_km));
        ELSIF distance_km > 2000 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic single trip distance: %s km (max 2000 km)', distance_km));
        END IF;

        -- Check for excessive trip duration (>48 hours)
        IF trip_duration_hours IS NOT NULL AND trip_duration_hours > 48 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive trip duration: %.1f hours (max 48 hours)', trip_duration_hours));
        END IF;

        -- Check for unrealistic speed (if duration is available)
        IF distance_km > 0 AND trip_duration_hours > 0 THEN
            IF (distance_km / trip_duration_hours) > 120 THEN
                validation_errors := array_append(validation_errors, 
                    format('Unrealistic average speed: %.1f km/h (max 120 km/h)', 
                           distance_km / trip_duration_hours));
            END IF;
        END IF;
    END IF;

    -- Check fuel efficiency if fuel was consumed
    IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 AND distance_km > 0 THEN
        kmpl := distance_km::NUMERIC / NEW.fuel_quantity;
        
        -- Check for unrealistic fuel consumption
        IF kmpl < 2 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic fuel consumption: %.2f km/L (min 2 km/L)', kmpl));
        ELSIF kmpl > 50 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic fuel efficiency: %.2f km/L (max 50 km/L)', kmpl));
        END IF;
    END IF;

    -- Check for excessive fuel quantity
    IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 500 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive fuel quantity: %.2f L (max 500 L)', NEW.fuel_quantity));
    END IF;

    -- Check for excessive expenses
    IF NEW.fuel_expense IS NOT NULL AND NEW.fuel_expense > 50000 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive fuel expense: %.2f (max 50000)', NEW.fuel_expense));
    END IF;

    IF NEW.driver_expense IS NOT NULL AND NEW.driver_expense > 10000 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive driver expense: %.2f (max 10000)', NEW.driver_expense));
    END IF;

    IF NEW.toll_expense IS NOT NULL AND NEW.toll_expense > 5000 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive toll expense: %.2f (max 5000)', NEW.toll_expense));
    END IF;

    -- If there are validation errors, raise exception
    IF array_length(validation_errors, 1) > 0 THEN
        RAISE EXCEPTION 'Value validation failed: %', array_to_string(validation_errors, '; ');
    END IF;

    -- Log edge cases and warnings to audit trail if function exists
    IF edge_case_reason IS NOT NULL OR array_length(validation_errors, 1) > 0 THEN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'value_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                'validated_with_edge_case',
                jsonb_build_object(
                    'distance_km', distance_km,
                    'duration_hours', trip_duration_hours,
                    'fuel_quantity', NEW.fuel_quantity,
                    'trip_type', NEW.trip_type
                ),
                jsonb_build_object(
                    'edge_case_reason', edge_case_reason,
                    'validation_warnings', validation_errors
                ),
                CASE 
                    WHEN array_length(validation_errors, 1) > 0 THEN 'warning'
                    ELSE 'info'
                END
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for value range validation
DROP TRIGGER IF EXISTS validate_trip_value_ranges ON trips;
CREATE TRIGGER validate_trip_value_ranges
    BEFORE INSERT OR UPDATE OF start_km, end_km, fuel_quantity, fuel_expense, 
                              driver_expense, toll_expense, other_expense,
                              trip_start_date, trip_end_date, trip_type
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_values();

-- Function to detect trips with edge case patterns
CREATE OR REPLACE FUNCTION detect_edge_case_trips(
    p_vehicle_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip_id UUID,
    trip_serial TEXT,
    trip_date DATE,
    edge_case_type TEXT,
    edge_case_details JSONB,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.trip_serial_number,
        t.trip_start_date::DATE,
        CASE 
            WHEN (t.end_km - t.start_km) = 0 AND t.trip_type = 'maintenance' THEN 'maintenance_zero_km'
            WHEN (t.end_km - t.start_km) = 0 AND t.trip_type != 'maintenance' THEN 'zero_km_non_maintenance'
            WHEN (t.end_km - t.start_km) < 5 THEN 'very_short_trip'
            WHEN (t.end_km - t.start_km) > 1500 THEN 'very_long_trip'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 3 THEN 'low_fuel_efficiency'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40 THEN 'high_fuel_efficiency'
            WHEN EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 36 THEN 'long_duration'
            WHEN t.fuel_expense > 30000 THEN 'high_fuel_expense'
            WHEN t.driver_expense > 5000 THEN 'high_driver_expense'
            ELSE 'other'
        END as edge_case_type,
        jsonb_build_object(
            'distance_km', t.end_km - t.start_km,
            'duration_hours', ROUND(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0, 2),
            'fuel_quantity', t.fuel_quantity,
            'fuel_efficiency', CASE 
                WHEN t.fuel_quantity > 0 THEN ROUND((t.end_km - t.start_km)::NUMERIC / t.fuel_quantity, 2)
                ELSE NULL 
            END,
            'fuel_expense', t.fuel_expense,
            'driver_expense', t.driver_expense,
            'trip_type', t.trip_type
        ) as edge_case_details,
        CASE 
            WHEN (t.end_km - t.start_km) = 0 AND t.trip_type != 'maintenance' THEN 
                'Verify if this should be marked as maintenance trip'
            WHEN (t.end_km - t.start_km) < 5 THEN 
                'Verify odometer readings are correct'
            WHEN (t.end_km - t.start_km) > 1500 THEN 
                'Verify this long-distance trip or check for missing intermediate stops'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 3 THEN 
                'Check fuel quantity entry - unusually low efficiency'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40 THEN 
                'Verify fuel quantity - unusually high efficiency'
            WHEN EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 36 THEN 
                'Check if this should be split into multiple trips'
            WHEN t.fuel_expense > 30000 THEN 
                'Verify fuel expense amount'
            WHEN t.driver_expense > 5000 THEN 
                'Verify driver expense amount'
            ELSE 'Review trip details for accuracy'
        END as recommendation
    FROM trips t
    WHERE t.deleted_at IS NULL
        AND t.created_by = auth.uid()
        AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
        AND (p_date_from IS NULL OR t.trip_start_date >= p_date_from)
        AND (p_date_to IS NULL OR t.trip_start_date <= p_date_to)
        AND (
            (t.end_km - t.start_km) = 0 OR
            (t.end_km - t.start_km) < 5 OR
            (t.end_km - t.start_km) > 1500 OR
            (t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
             ((t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 3 OR
              (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40)) OR
            EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 36 OR
            t.fuel_expense > 30000 OR
            t.driver_expense > 5000
        )
    ORDER BY t.trip_start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate a batch of trips
CREATE OR REPLACE FUNCTION validate_trip_batch(
    p_trip_ids UUID[]
) RETURNS TABLE (
    trip_id UUID,
    trip_serial TEXT,
    validation_status TEXT,
    validation_errors TEXT[],
    edge_cases TEXT[]
) AS $$
DECLARE
    trip_record RECORD;
    errors TEXT[];
    edge_cases_found TEXT[];
    distance_km INTEGER;
    kmpl NUMERIC;
BEGIN
    FOREACH trip_id IN ARRAY p_trip_ids LOOP
        SELECT * INTO trip_record
        FROM trips
        WHERE id = trip_id
            AND created_by = auth.uid();
        
        IF NOT FOUND THEN
            CONTINUE;
        END IF;
        
        errors := ARRAY[]::TEXT[];
        edge_cases_found := ARRAY[]::TEXT[];
        distance_km := trip_record.end_km - trip_record.start_km;
        
        -- Check various validation rules
        IF distance_km < 0 THEN
            errors := array_append(errors, 'Negative distance');
        END IF;
        
        IF distance_km > 2000 THEN
            errors := array_append(errors, 'Distance exceeds 2000km');
        END IF;
        
        IF trip_record.fuel_quantity IS NOT NULL AND trip_record.fuel_quantity > 0 THEN
            kmpl := distance_km::NUMERIC / trip_record.fuel_quantity;
            IF kmpl < 2 THEN
                errors := array_append(errors, format('Very low efficiency: %.2f km/L', kmpl));
            ELSIF kmpl > 50 THEN
                errors := array_append(errors, format('Unrealistic efficiency: %.2f km/L', kmpl));
            END IF;
        END IF;
        
        -- Check for edge cases
        IF distance_km = 0 AND trip_record.trip_type = 'maintenance' THEN
            edge_cases_found := array_append(edge_cases_found, 'Maintenance trip with zero km');
        ELSIF distance_km < 5 THEN
            edge_cases_found := array_append(edge_cases_found, 'Very short trip');
        END IF;
        
        RETURN QUERY SELECT
            trip_record.id,
            trip_record.trip_serial_number,
            CASE 
                WHEN array_length(errors, 1) > 0 THEN 'failed'
                WHEN array_length(edge_cases_found, 1) > 0 THEN 'warning'
                ELSE 'passed'
            END as validation_status,
            errors as validation_errors,
            edge_cases_found as edge_cases;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_trip_values() TO authenticated;
GRANT EXECUTE ON FUNCTION detect_edge_case_trips(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_trip_batch(UUID[]) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_trip_values() IS 'Validates trip values are within realistic ranges';
COMMENT ON FUNCTION detect_edge_case_trips IS 'Detects trips with edge case patterns that may need review';
COMMENT ON FUNCTION validate_trip_batch IS 'Validates multiple trips and returns their validation status';

--================================================================================

-- Migration: 20250912180000_add_odometer_continuity_check.sql
-- Enhanced Odometer Continuity Validation (Phase 1 - Critical)
-- Ensures strict odometer continuity across trips for the same vehicle

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS enhanced_odometer_continuity_check ON trips;

-- Enhanced function to validate odometer continuity with better error handling
CREATE OR REPLACE FUNCTION validate_odometer_continuity_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    prev_trip RECORD;
    next_trip RECORD;
    gap_km INTEGER;
    warning_message TEXT;
    validation_data JSONB;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Skip if odometer readings are not set
    IF NEW.start_km IS NULL OR NEW.end_km IS NULL THEN
        RETURN NEW;
    END IF;

    -- First validate that end_km > start_km for the current trip
    IF NEW.end_km <= NEW.start_km THEN
        RAISE EXCEPTION 'Invalid odometer reading for trip %: End KM (%) must be greater than Start KM (%). Distance cannot be zero or negative.',
            NEW.trip_serial_number, NEW.end_km, NEW.start_km;
    END IF;

    -- Find the previous trip for this vehicle (most recent trip before this one)
    SELECT * INTO prev_trip
    FROM trips
    WHERE vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND trip_end_date < NEW.trip_start_date
        AND deleted_at IS NULL
        AND created_by = NEW.created_by
    ORDER BY trip_end_date DESC
    LIMIT 1;

    -- If a previous trip exists, validate continuity
    IF FOUND THEN
        gap_km := NEW.start_km - prev_trip.end_km;

        -- Check for negative gap (odometer went backwards) - CRITICAL ERROR
        IF gap_km < 0 THEN
            RAISE EXCEPTION E'ODOMETER CONTINUITY VIOLATION!\n'
                'Trip: %\n'
                'Start KM: % cannot be less than previous trip end KM: %\n'
                'Previous trip: % ended on %\n'
                'Gap: % km (negative - odometer went backwards)\n'
                'Action required: Correct the odometer readings to maintain continuity',
                NEW.trip_serial_number,
                NEW.start_km, 
                prev_trip.end_km, 
                prev_trip.trip_serial_number, 
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                gap_km;
        END IF;

        -- Check for exact continuity (gap = 0) - IDEAL
        IF gap_km = 0 THEN
            -- Log perfect continuity
            validation_data := jsonb_build_object(
                'status', 'perfect_continuity',
                'gap_km', 0,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', 'Perfect odometer continuity maintained'
            );
        -- Check for small acceptable gap (1-10 km) - ACCEPTABLE
        ELSIF gap_km <= 10 THEN
            validation_data := jsonb_build_object(
                'status', 'small_gap_acceptable',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', format('Small gap of %s km - likely vehicle movement without trip logging', gap_km)
            );
        -- Check for moderate gap (11-50 km) - WARNING
        ELSIF gap_km <= 50 THEN
            warning_message := format(
                'Moderate odometer gap detected: %s km between trips. '
                'Previous trip %s ended at %s km on %s. '
                'Current trip %s starts at %s km. '
                'Please verify if any trips are missing.',
                gap_km,
                prev_trip.trip_serial_number,
                prev_trip.end_km,
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                NEW.trip_serial_number,
                NEW.start_km
            );
            
            RAISE NOTICE '%', warning_message;
            
            validation_data := jsonb_build_object(
                'status', 'moderate_gap_warning',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', warning_message
            );
        -- Check for large gap (>50 km) - STRONG WARNING
        ELSE
            warning_message := format(
                'LARGE ODOMETER GAP ALERT: %s km gap detected! '
                'Previous trip %s ended at %s km on %s. '
                'Current trip %s starts at %s km. '
                'This large gap suggests missing trips or data entry error. '
                'Please investigate and add any missing trips.',
                gap_km,
                prev_trip.trip_serial_number,
                prev_trip.end_km,
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                NEW.trip_serial_number,
                NEW.start_km
            );
            
            RAISE WARNING '%', warning_message;
            
            validation_data := jsonb_build_object(
                'status', 'large_gap_alert',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', warning_message,
                'action_required', 'Investigate missing trips or validate gap'
            );
        END IF;

        -- Log to audit trail if the function exists
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'odometer_continuity_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                CASE 
                    WHEN gap_km = 0 THEN 'validated_perfect'
                    WHEN gap_km <= 10 THEN 'validated_acceptable'
                    WHEN gap_km <= 50 THEN 'validated_with_warning'
                    ELSE 'validated_with_alert'
                END,
                jsonb_build_object(
                    'gap_km', gap_km,
                    'previous_trip_id', prev_trip.id,
                    'previous_trip_serial', prev_trip.trip_serial_number,
                    'previous_end_km', prev_trip.end_km,
                    'current_start_km', NEW.start_km,
                    'current_end_km', NEW.end_km
                ),
                validation_data,
                CASE 
                    WHEN gap_km <= 10 THEN 'info'
                    WHEN gap_km <= 50 THEN 'warning'
                    ELSE 'error'
                END,
                NULL,
                ARRAY['odometer_validation', 'continuity_check', format('gap_%s_km', gap_km)],
                CASE 
                    WHEN gap_km > 50 THEN 'Large gap requires investigation'
                    ELSE NULL
                END
            );
        END IF;
    END IF;

    -- Also check if this trip would break continuity for any future trips (on UPDATE)
    IF TG_OP = 'UPDATE' AND (OLD.end_km != NEW.end_km) THEN
        SELECT * INTO next_trip
        FROM trips
        WHERE vehicle_id = NEW.vehicle_id
            AND id != NEW.id
            AND trip_start_date > NEW.trip_end_date
            AND deleted_at IS NULL
            AND created_by = NEW.created_by
        ORDER BY trip_start_date
        LIMIT 1;

        IF FOUND AND next_trip.start_km < NEW.end_km THEN
            RAISE EXCEPTION E'ODOMETER CONTINUITY VIOLATION!\n'
                'Updating trip % end KM to % would break continuity.\n'
                'Next trip % starts at % km.\n'
                'Action required: Use cascade correction to update all subsequent trips.',
                NEW.trip_serial_number,
                NEW.end_km,
                next_trip.trip_serial_number,
                next_trip.start_km;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger for odometer continuity validation
CREATE TRIGGER enhanced_odometer_continuity_check
    BEFORE INSERT OR UPDATE OF start_km, end_km, trip_start_date, trip_end_date, vehicle_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_odometer_continuity_enhanced();

-- Function to analyze odometer continuity for a vehicle over time
CREATE OR REPLACE FUNCTION analyze_vehicle_odometer_continuity(
    p_vehicle_id UUID,
    p_date_from DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_date_to DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    analysis_date DATE,
    total_trips INTEGER,
    perfect_continuity_count INTEGER,
    small_gaps_count INTEGER,
    moderate_gaps_count INTEGER,
    large_gaps_count INTEGER,
    negative_gaps_count INTEGER,
    total_gap_km INTEGER,
    avg_gap_km NUMERIC,
    max_gap_km INTEGER,
    continuity_score INTEGER,
    recommendations TEXT[]
) AS $$
DECLARE
    rec RECORD;
    v_perfect_count INTEGER := 0;
    v_small_gaps INTEGER := 0;
    v_moderate_gaps INTEGER := 0;
    v_large_gaps INTEGER := 0;
    v_negative_gaps INTEGER := 0;
    v_total_gap_km INTEGER := 0;
    v_max_gap_km INTEGER := 0;
    v_trip_count INTEGER := 0;
    v_recommendations TEXT[] := ARRAY[]::TEXT[];
    v_continuity_score INTEGER;
BEGIN
    -- Analyze all trips in the date range
    FOR rec IN
        WITH ordered_trips AS (
            SELECT 
                trip_serial_number,
                trip_start_date,
                start_km,
                end_km,
                LAG(end_km) OVER (ORDER BY trip_start_date) as prev_end_km
            FROM trips
            WHERE vehicle_id = p_vehicle_id
                AND deleted_at IS NULL
                AND trip_start_date >= p_date_from
                AND trip_start_date <= p_date_to
                AND created_by = auth.uid()
            ORDER BY trip_start_date
        )
        SELECT 
            trip_serial_number,
            start_km,
            prev_end_km,
            CASE WHEN prev_end_km IS NOT NULL THEN start_km - prev_end_km ELSE 0 END as gap_km
        FROM ordered_trips
    LOOP
        v_trip_count := v_trip_count + 1;
        
        IF rec.prev_end_km IS NOT NULL THEN
            IF rec.gap_km < 0 THEN
                v_negative_gaps := v_negative_gaps + 1;
            ELSIF rec.gap_km = 0 THEN
                v_perfect_count := v_perfect_count + 1;
            ELSIF rec.gap_km <= 10 THEN
                v_small_gaps := v_small_gaps + 1;
            ELSIF rec.gap_km <= 50 THEN
                v_moderate_gaps := v_moderate_gaps + 1;
            ELSE
                v_large_gaps := v_large_gaps + 1;
            END IF;
            
            v_total_gap_km := v_total_gap_km + ABS(rec.gap_km);
            v_max_gap_km := GREATEST(v_max_gap_km, ABS(rec.gap_km));
        END IF;
    END LOOP;

    -- Calculate continuity score (0-100)
    IF v_trip_count > 0 THEN
        v_continuity_score := CASE
            WHEN v_negative_gaps > 0 THEN 0  -- Critical issues
            WHEN v_large_gaps > 0 THEN LEAST(50 - (v_large_gaps * 10), 0)
            WHEN v_moderate_gaps > 0 THEN 70 - (v_moderate_gaps * 5)
            WHEN v_small_gaps > 0 THEN 90 - (v_small_gaps * 2)
            ELSE 100  -- Perfect continuity
        END;
    ELSE
        v_continuity_score := NULL;
    END IF;

    -- Generate recommendations
    IF v_negative_gaps > 0 THEN
        v_recommendations := array_append(v_recommendations, 
            format('CRITICAL: %s trips have negative odometer gaps. Immediate correction required.', v_negative_gaps));
    END IF;
    
    IF v_large_gaps > 0 THEN
        v_recommendations := array_append(v_recommendations, 
            format('WARNING: %s trips have large gaps (>50km). Check for missing trips.', v_large_gaps));
    END IF;
    
    IF v_moderate_gaps > 3 THEN
        v_recommendations := array_append(v_recommendations, 
            'Multiple moderate gaps detected. Consider reviewing trip logging practices.');
    END IF;
    
    IF v_continuity_score >= 90 THEN
        v_recommendations := array_append(v_recommendations, 
            'Excellent odometer continuity maintained!');
    END IF;

    RETURN QUERY SELECT
        p_date_to as analysis_date,
        v_trip_count as total_trips,
        v_perfect_count as perfect_continuity_count,
        v_small_gaps as small_gaps_count,
        v_moderate_gaps as moderate_gaps_count,
        v_large_gaps as large_gaps_count,
        v_negative_gaps as negative_gaps_count,
        v_total_gap_km as total_gap_km,
        CASE WHEN v_trip_count > 0 THEN v_total_gap_km::NUMERIC / v_trip_count ELSE 0 END as avg_gap_km,
        v_max_gap_km as max_gap_km,
        v_continuity_score as continuity_score,
        v_recommendations as recommendations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_odometer_continuity_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_vehicle_odometer_continuity(UUID, DATE, DATE) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_odometer_continuity_enhanced() IS 'Enhanced validation of odometer continuity with comprehensive gap analysis and audit logging';
COMMENT ON FUNCTION analyze_vehicle_odometer_continuity(UUID, DATE, DATE) IS 'Analyzes odometer continuity patterns for a vehicle and provides recommendations';

--================================================================================

-- Migration: 20250912182000_add_mileage_chain_integrity.sql
-- Enhanced Mileage Chain Integrity (Phase 1 - Critical)
-- Comprehensive mileage calculation chain integrity with enhanced deletion handling

-- Ensure soft delete columns exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for soft delete queries if not exists
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON trips(deleted_at) WHERE deleted_at IS NOT NULL;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enhanced_mileage_chain_protection ON trips;

-- Enhanced function to handle trip deletion with comprehensive chain validation
CREATE OR REPLACE FUNCTION handle_trip_deletion_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    dependent_trips_count INTEGER;
    dependent_trips_list TEXT[];
    next_refueling RECORD;
    deletion_impact JSONB;
    total_affected_trips INTEGER;
    mileage_recalc_needed BOOLEAN := FALSE;
BEGIN
    -- Only process actual deletions (not soft deletes)
    IF TG_OP = 'DELETE' THEN
        -- Check if this is a refueling trip
        IF OLD.refueling_done = true THEN
            -- Count trips that depend on this refueling for mileage calculation
            SELECT COUNT(*), array_agg(trip_serial_number ORDER BY trip_start_date)
            INTO dependent_trips_count, dependent_trips_list
            FROM trips
            WHERE vehicle_id = OLD.vehicle_id
                AND trip_start_date > OLD.trip_end_date
                AND deleted_at IS NULL
                AND refueling_done = false
                AND created_by = OLD.created_by;
            
            -- Find the next refueling trip after this one
            SELECT * INTO next_refueling
            FROM trips
            WHERE vehicle_id = OLD.vehicle_id
                AND trip_start_date > OLD.trip_end_date
                AND refueling_done = true
                AND deleted_at IS NULL
                AND created_by = OLD.created_by
            ORDER BY trip_start_date
            LIMIT 1;
            
            -- Determine impact of deletion
            IF FOUND THEN
                -- There's another refueling trip, so mileage can be recalculated
                mileage_recalc_needed := TRUE;
                deletion_impact := jsonb_build_object(
                    'impact_level', 'moderate',
                    'dependent_trips', dependent_trips_count,
                    'next_refueling_id', next_refueling.id,
                    'next_refueling_serial', next_refueling.trip_serial_number,
                    'recalculation_possible', true,
                    'message', format('Mileage will be recalculated using next refueling trip %s', next_refueling.trip_serial_number)
                );
            ELSIF dependent_trips_count > 0 THEN
                -- No next refueling, dependent trips will lose mileage calculation
                deletion_impact := jsonb_build_object(
                    'impact_level', 'high',
                    'dependent_trips', dependent_trips_count,
                    'affected_trips', dependent_trips_list,
                    'recalculation_possible', false,
                    'message', 'Warning: Dependent trips will lose tank-to-tank mileage calculation'
                );
                
                -- Soft delete with warning instead of hard delete
                UPDATE trips 
                SET 
                    deleted_at = NOW(),
                    deletion_reason = format('Soft deleted - has %s dependent non-refueling trips that would lose mileage calculation', dependent_trips_count),
                    deleted_by = auth.uid()
                WHERE id = OLD.id;
                
                -- Log to audit trail
                IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                    PERFORM log_audit_trail(
                        'trip_deletion_prevented',
                        'trip_data',
                        'trip',
                        OLD.id::TEXT,
                        format('Refueling trip %s for vehicle %s', OLD.trip_serial_number, OLD.vehicle_registration),
                        'soft_deleted',
                        jsonb_build_object(
                            'trip_serial', OLD.trip_serial_number,
                            'vehicle_id', OLD.vehicle_id,
                            'refueling_done', OLD.refueling_done,
                            'fuel_quantity', OLD.fuel_quantity
                        ),
                        deletion_impact,
                        'warning',
                        NULL,
                        ARRAY['mileage_chain', 'soft_delete', 'dependency_protection'],
                        'Soft deleted to preserve mileage chain integrity'
                    );
                END IF;
                
                -- Prevent the actual deletion
                RETURN NULL;
            END IF;
        END IF;
        
        -- Check for odometer continuity impact
        SELECT COUNT(*) INTO total_affected_trips
        FROM trips
        WHERE vehicle_id = OLD.vehicle_id
            AND trip_start_date > OLD.trip_end_date
            AND deleted_at IS NULL
            AND created_by = OLD.created_by;
        
        IF total_affected_trips > 0 THEN
            -- Log deletion with impact analysis
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                PERFORM log_audit_trail(
                    'trip_deletion',
                    'trip_data',
                    'trip',
                    OLD.id::TEXT,
                    format('Trip %s for vehicle %s', OLD.trip_serial_number, OLD.vehicle_registration),
                    'deleted',
                    jsonb_build_object(
                        'trip_serial', OLD.trip_serial_number,
                        'vehicle_id', OLD.vehicle_id,
                        'start_km', OLD.start_km,
                        'end_km', OLD.end_km,
                        'refueling_done', OLD.refueling_done
                    ),
                    jsonb_build_object(
                        'affected_trips', total_affected_trips,
                        'mileage_recalc_needed', mileage_recalc_needed,
                        'deletion_impact', deletion_impact
                    ),
                    CASE 
                        WHEN OLD.refueling_done THEN 'warning'
                        ELSE 'info'
                    END,
                    NULL,
                    ARRAY['trip_deletion', 'mileage_chain'],
                    format('%s subsequent trips may need odometer adjustment', total_affected_trips)
                );
            END IF;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger for deletion protection
CREATE TRIGGER enhanced_mileage_chain_protection
BEFORE DELETE ON trips
FOR EACH ROW
EXECUTE FUNCTION handle_trip_deletion_enhanced();

-- Enhanced function to recalculate trip mileage with comprehensive chain handling
CREATE OR REPLACE FUNCTION recalculate_trip_mileage_enhanced(
    p_trip_id UUID,
    p_force_recalc BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    success BOOLEAN,
    old_kmpl DECIMAL,
    new_kmpl DECIMAL,
    calculation_method TEXT,
    message TEXT
) AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
    calculated_kmpl DECIMAL;
    calc_method TEXT;
BEGIN
    -- Get the trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id 
        AND deleted_at IS NULL
        AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::DECIMAL,
            NULL::DECIMAL,
            'error'::TEXT,
            'Trip not found or access denied'::TEXT;
        RETURN;
    END IF;
    
    IF NOT trip_record.refueling_done THEN
        RETURN QUERY SELECT 
            FALSE,
            trip_record.calculated_kmpl,
            trip_record.calculated_kmpl,
            'not_applicable'::TEXT,
            'Trip is not a refueling trip'::TEXT;
        RETURN;
    END IF;
    
    IF trip_record.fuel_quantity IS NULL OR trip_record.fuel_quantity <= 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            trip_record.calculated_kmpl,
            NULL::DECIMAL,
            'error'::TEXT,
            'Invalid or missing fuel quantity'::TEXT;
        RETURN;
    END IF;
    
    -- Find previous refueling trip for tank-to-tank calculation
    SELECT * INTO prev_refueling
    FROM trips
    WHERE vehicle_id = trip_record.vehicle_id
        AND trip_end_date < trip_record.trip_end_date
        AND refueling_done = true
        AND deleted_at IS NULL
        AND created_by = auth.uid()
    ORDER BY trip_end_date DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Tank-to-tank calculation (most accurate)
        calculated_kmpl := (trip_record.end_km - prev_refueling.end_km)::DECIMAL / trip_record.fuel_quantity;
        calc_method := format('tank_to_tank (from trip %s)', prev_refueling.trip_serial_number);
    ELSE
        -- Simple calculation for first refueling
        calculated_kmpl := (trip_record.end_km - trip_record.start_km)::DECIMAL / trip_record.fuel_quantity;
        calc_method := 'simple (first refueling)';
    END IF;
    
    -- Update if different or forced
    IF p_force_recalc OR 
       trip_record.calculated_kmpl IS NULL OR 
       ABS(COALESCE(trip_record.calculated_kmpl, 0) - calculated_kmpl) > 0.01 THEN
        
        UPDATE trips
        SET calculated_kmpl = calculated_kmpl
        WHERE id = p_trip_id;
        
        -- Log the recalculation
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'mileage_recalculation',
                'trip_data',
                'trip',
                p_trip_id::TEXT,
                format('Trip %s', trip_record.trip_serial_number),
                'recalculated',
                jsonb_build_object(
                    'old_kmpl', trip_record.calculated_kmpl,
                    'new_kmpl', calculated_kmpl,
                    'calculation_method', calc_method,
                    'forced', p_force_recalc
                ),
                jsonb_build_object(
                    'distance_km', CASE 
                        WHEN prev_refueling.id IS NOT NULL THEN trip_record.end_km - prev_refueling.end_km
                        ELSE trip_record.end_km - trip_record.start_km
                    END,
                    'fuel_quantity', trip_record.fuel_quantity
                ),
                'info'
            );
        END IF;
        
        RETURN QUERY SELECT 
            TRUE,
            trip_record.calculated_kmpl,
            calculated_kmpl,
            calc_method,
            format('Mileage recalculated: %.2f km/L using %s', calculated_kmpl, calc_method)::TEXT;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            trip_record.calculated_kmpl,
            trip_record.calculated_kmpl,
            calc_method,
            'No recalculation needed - mileage is already correct'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and repair mileage chain for a vehicle
CREATE OR REPLACE FUNCTION validate_and_repair_mileage_chain(
    p_vehicle_id UUID,
    p_auto_fix BOOLEAN DEFAULT FALSE,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    issue_type TEXT,
    severity TEXT,
    trip_id UUID,
    trip_serial TEXT,
    issue_description TEXT,
    suggested_fix TEXT,
    auto_fixed BOOLEAN,
    fix_result TEXT
) AS $$
DECLARE
    rec RECORD;
    prev_trip RECORD;
    issue_count INTEGER := 0;
    fix_applied BOOLEAN;
    fix_message TEXT;
BEGIN
    -- Initialize previous trip
    prev_trip := NULL;
    
    -- Check each trip in chronological order
    FOR rec IN
        SELECT 
            id,
            trip_serial_number,
            trip_start_date,
            trip_end_date,
            start_km,
            end_km,
            refueling_done,
            fuel_quantity,
            calculated_kmpl
        FROM trips
        WHERE vehicle_id = p_vehicle_id
            AND deleted_at IS NULL
            AND created_by = auth.uid()
            AND (p_date_from IS NULL OR trip_start_date >= p_date_from)
            AND (p_date_to IS NULL OR trip_start_date <= p_date_to)
        ORDER BY trip_start_date
    LOOP
        fix_applied := FALSE;
        fix_message := NULL;
        
        -- Check for negative distance
        IF rec.end_km < rec.start_km THEN
            issue_count := issue_count + 1;
            RETURN QUERY SELECT
                'negative_distance'::TEXT,
                'critical'::TEXT,
                rec.id,
                rec.trip_serial_number,
                format('End KM (%s) is less than Start KM (%s)', rec.end_km, rec.start_km)::TEXT,
                format('Swap start and end KM values')::TEXT,
                FALSE,
                'Manual intervention required'::TEXT;
        END IF;
        
        -- Check odometer continuity with previous trip
        IF prev_trip IS NOT NULL THEN
            IF rec.start_km < prev_trip.end_km THEN
                issue_count := issue_count + 1;
                
                IF p_auto_fix THEN
                    -- Auto-fix by adjusting start_km
                    UPDATE trips 
                    SET start_km = prev_trip.end_km
                    WHERE id = rec.id;
                    
                    fix_applied := TRUE;
                    fix_message := format('Auto-fixed: Adjusted start KM from %s to %s', rec.start_km, prev_trip.end_km);
                END IF;
                
                RETURN QUERY SELECT
                    'odometer_regression'::TEXT,
                    'high'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    format('Start KM (%s) is less than previous trip end KM (%s)', rec.start_km, prev_trip.end_km)::TEXT,
                    format('Adjust start KM to %s', prev_trip.end_km)::TEXT,
                    fix_applied,
                    fix_message::TEXT;
                    
            ELSIF rec.start_km > prev_trip.end_km + 100 THEN
                issue_count := issue_count + 1;
                RETURN QUERY SELECT
                    'large_odometer_gap'::TEXT,
                    'medium'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    format('Large gap of %s km from previous trip', rec.start_km - prev_trip.end_km)::TEXT,
                    'Check for missing trips'::TEXT,
                    FALSE,
                    'Manual verification required'::TEXT;
            END IF;
        END IF;
        
        -- Check mileage calculation for refueling trips
        IF rec.refueling_done AND rec.fuel_quantity > 0 THEN
            IF rec.calculated_kmpl IS NULL THEN
                issue_count := issue_count + 1;
                
                IF p_auto_fix THEN
                    -- Recalculate mileage
                    PERFORM recalculate_trip_mileage_enhanced(rec.id, true);
                    fix_applied := TRUE;
                    fix_message := 'Auto-fixed: Recalculated mileage';
                END IF;
                
                RETURN QUERY SELECT
                    'missing_mileage_calculation'::TEXT,
                    'low'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    'Mileage not calculated for refueling trip'::TEXT,
                    'Recalculate mileage'::TEXT,
                    fix_applied,
                    fix_message::TEXT;
                    
            ELSIF rec.calculated_kmpl < 2 OR rec.calculated_kmpl > 50 THEN
                issue_count := issue_count + 1;
                RETURN QUERY SELECT
                    'unrealistic_mileage'::TEXT,
                    'medium'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    format('Unrealistic mileage: %.2f km/L', rec.calculated_kmpl)::TEXT,
                    'Verify fuel quantity and odometer readings'::TEXT,
                    FALSE,
                    'Manual verification required'::TEXT;
            END IF;
        END IF;
        
        -- Update previous trip reference
        prev_trip := rec;
    END LOOP;
    
    -- If no issues found, return success message
    IF issue_count = 0 THEN
        RETURN QUERY SELECT
            'no_issues'::TEXT,
            'info'::TEXT,
            NULL::UUID,
            NULL::TEXT,
            'Mileage chain validation complete - no issues found'::TEXT,
            NULL::TEXT,
            FALSE,
            'All checks passed'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recover soft-deleted trips
CREATE OR REPLACE FUNCTION recover_deleted_trip(
    p_trip_id UUID,
    p_recovery_reason TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    trip_record RECORD;
BEGIN
    -- Get the deleted trip
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id
        AND deleted_at IS NOT NULL
        AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'Trip not found or not deleted'::TEXT;
        RETURN;
    END IF;
    
    -- Recover the trip
    UPDATE trips
    SET 
        deleted_at = NULL,
        deletion_reason = NULL,
        deleted_by = NULL
    WHERE id = p_trip_id;
    
    -- Log the recovery
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        PERFORM log_audit_trail(
            'trip_recovery',
            'trip_data',
            'trip',
            p_trip_id::TEXT,
            format('Trip %s for vehicle %s', trip_record.trip_serial_number, trip_record.vehicle_registration),
            'recovered',
            jsonb_build_object(
                'deleted_at', trip_record.deleted_at,
                'deletion_reason', trip_record.deletion_reason,
                'recovery_reason', p_recovery_reason
            ),
            NULL,
            'info',
            NULL,
            ARRAY['trip_recovery', 'soft_delete_reversal'],
            p_recovery_reason
        );
    END IF;
    
    RETURN QUERY SELECT 
        TRUE,
        format('Trip %s successfully recovered', trip_record.trip_serial_number)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_trip_deletion_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_trip_mileage_enhanced(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_and_repair_mileage_chain(UUID, BOOLEAN, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION recover_deleted_trip(UUID, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION handle_trip_deletion_enhanced() IS 'Enhanced trip deletion handler that protects mileage chain integrity';
COMMENT ON FUNCTION recalculate_trip_mileage_enhanced(UUID, BOOLEAN) IS 'Enhanced mileage recalculation with tank-to-tank method and audit logging';
COMMENT ON FUNCTION validate_and_repair_mileage_chain(UUID, BOOLEAN, DATE, DATE) IS 'Validates and optionally repairs mileage chain issues for a vehicle';
COMMENT ON FUNCTION recover_deleted_trip(UUID, TEXT) IS 'Recovers a soft-deleted trip with audit logging';

--================================================================================

-- Migration: 20250912183000_add_value_range_validation.sql
-- Enhanced Value Range Validation (Phase 1 - Critical)
-- Comprehensive validation of trip values for realistic ranges with edge case handling

-- Add CHECK constraints for basic positive value validation (idempotent)
DO $$
BEGIN
    -- Check if distance constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_enhanced_positive_distance' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_enhanced_positive_distance 
            CHECK ((end_km - start_km) >= 0);
    END IF;
    
    -- Check if fuel constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_enhanced_positive_fuel' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_enhanced_positive_fuel 
            CHECK (fuel_quantity IS NULL OR fuel_quantity >= 0);
    END IF;
    
    -- Check if expense constraints exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_enhanced_positive_expenses' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_enhanced_positive_expenses 
            CHECK (
                (fuel_expense IS NULL OR fuel_expense >= 0) AND
                (driver_expense IS NULL OR driver_expense >= 0) AND
                (toll_expense IS NULL OR toll_expense >= 0) AND
                (other_expense IS NULL OR other_expense >= 0) AND
                (breakdown_expense IS NULL OR breakdown_expense >= 0) AND
                (miscellaneous_expense IS NULL OR miscellaneous_expense >= 0)
            );
    END IF;
    
    -- Check if realistic fuel quantity constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_realistic_fuel_quantity' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_realistic_fuel_quantity 
            CHECK (fuel_quantity IS NULL OR fuel_quantity <= 500);
    END IF;
    
    -- Check if realistic distance constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_realistic_distance' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_realistic_distance 
            CHECK ((end_km - start_km) <= 3000);
    END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enhanced_trip_value_validation ON trips;

-- Enhanced function to validate trip values with comprehensive range checking
CREATE OR REPLACE FUNCTION validate_trip_values_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    distance_km INTEGER;
    trip_duration_hours NUMERIC;
    avg_speed_kmh NUMERIC;
    kmpl NUMERIC;
    validation_errors TEXT[];
    validation_warnings TEXT[];
    edge_case_info JSONB;
    is_edge_case BOOLEAN := FALSE;
    severity_level TEXT := 'info';
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Initialize arrays
    validation_errors := ARRAY[]::TEXT[];
    validation_warnings := ARRAY[]::TEXT[];
    edge_case_info := jsonb_build_object();

    -- Calculate basic metrics
    distance_km := NEW.end_km - NEW.start_km;
    
    IF NEW.trip_start_date IS NOT NULL AND NEW.trip_end_date IS NOT NULL THEN
        trip_duration_hours := EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600.0;
        IF distance_km > 0 AND trip_duration_hours > 0 THEN
            avg_speed_kmh := distance_km / trip_duration_hours;
        END IF;
    END IF;

    -- =================================================================
    -- EDGE CASE DETECTION (Allowed scenarios with special handling)
    -- =================================================================
    
    -- Edge case 1: Maintenance/Service trips (zero or minimal distance)
    IF distance_km <= 5 AND (
        NEW.trip_type = 'maintenance' OR 
        NEW.trip_type = 'service' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%maintenance%' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%service%'
    ) THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'maintenance_trip',
            'reason', 'Vehicle maintenance/service with minimal movement'
        );
    
    -- Edge case 2: Test drive (short distance)
    ELSIF distance_km < 10 AND (
        NEW.trip_type = 'test' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%test%'
    ) THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'test_trip',
            'reason', 'Test drive with short distance'
        );
    
    -- Edge case 3: Refueling only trip (short distance with fuel)
    ELSIF distance_km < 15 AND NEW.refueling_done = true AND NEW.fuel_quantity > 0 THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'refueling_trip',
            'reason', 'Dedicated refueling trip with minimal distance'
        );
    
    -- Edge case 4: Long-haul trip (very long distance/duration)
    ELSIF (distance_km > 1000 OR trip_duration_hours > 24) AND (
        NEW.trip_type = 'long_haul' OR
        NEW.trip_type = 'interstate' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%long haul%' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%interstate%'
    ) THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'long_haul_trip',
            'reason', 'Long-distance interstate/long-haul trip'
        );
        
        -- Still validate max limits for long-haul
        IF distance_km > 3000 THEN
            validation_errors := array_append(validation_errors,
                format('Even for long-haul, distance %s km exceeds maximum 3000 km', distance_km));
        END IF;
        IF trip_duration_hours > 72 THEN
            validation_errors := array_append(validation_errors,
                format('Trip duration %.1f hours exceeds maximum 72 hours for continuous driving', trip_duration_hours));
        END IF;
    END IF;

    -- =================================================================
    -- STANDARD VALIDATIONS (Applied unless it's a valid edge case)
    -- =================================================================
    
    IF NOT is_edge_case THEN
        -- Check for impossible negative distance
        IF distance_km < 0 THEN
            validation_errors := array_append(validation_errors, 
                format('CRITICAL: Negative distance (%s km) - end KM cannot be less than start KM', distance_km));
        
        -- Check for zero distance (non-edge case)
        ELSIF distance_km = 0 THEN
            validation_errors := array_append(validation_errors, 
                'Zero distance recorded - if vehicle was stationary, mark as maintenance/service trip');
        
        -- Check for very short trips (non-edge case)
        ELSIF distance_km < 5 THEN
            validation_warnings := array_append(validation_warnings, 
                format('Very short trip (%s km) - verify odometer readings or mark as test/maintenance', distance_km));
        
        -- Check for excessive single trip distance
        ELSIF distance_km > 2000 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic single trip distance: %s km (max 2000 km for regular trips)', distance_km));
        
        -- Moderate distance warning
        ELSIF distance_km > 1500 THEN
            validation_warnings := array_append(validation_warnings, 
                format('Very long trip distance: %s km - consider marking as long-haul', distance_km));
        END IF;

        -- Check trip duration
        IF trip_duration_hours IS NOT NULL THEN
            IF trip_duration_hours <= 0 THEN
                validation_errors := array_append(validation_errors, 
                    'Trip duration must be positive');
            ELSIF trip_duration_hours > 48 THEN
                validation_errors := array_append(validation_errors, 
                    format('Excessive trip duration: %.1f hours (max 48 hours for regular trips)', trip_duration_hours));
            ELSIF trip_duration_hours > 36 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Long trip duration: %.1f hours - verify or split into multiple trips', trip_duration_hours));
            END IF;
        END IF;

        -- Check average speed
        IF avg_speed_kmh IS NOT NULL AND distance_km > 10 THEN  -- Only check for trips > 10km
            IF avg_speed_kmh > 120 THEN
                validation_errors := array_append(validation_errors, 
                    format('Impossible average speed: %.1f km/h (max 120 km/h)', avg_speed_kmh));
            ELSIF avg_speed_kmh > 100 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('High average speed: %.1f km/h - verify trip times', avg_speed_kmh));
            ELSIF avg_speed_kmh < 5 AND distance_km > 50 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Very low average speed: %.1f km/h for %s km - check for data entry errors', avg_speed_kmh, distance_km));
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- FUEL EFFICIENCY VALIDATIONS (Applied to all trips with fuel)
    -- =================================================================
    
    IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
        -- Check fuel quantity limits
        IF NEW.fuel_quantity > 500 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive fuel quantity: %.2f L (max 500 L)', NEW.fuel_quantity));
        ELSIF NEW.fuel_quantity > 200 THEN
            validation_warnings := array_append(validation_warnings, 
                format('Large fuel quantity: %.2f L - verify entry', NEW.fuel_quantity));
        END IF;
        
        -- Calculate and check fuel efficiency
        IF distance_km > 0 THEN
            kmpl := distance_km::NUMERIC / NEW.fuel_quantity;
            
            -- Extreme efficiency issues (always check)
            IF kmpl < 1 THEN
                validation_errors := array_append(validation_errors, 
                    format('Impossible fuel consumption: %.2f km/L (min 1 km/L)', kmpl));
            ELSIF kmpl < 3 AND NOT is_edge_case THEN
                validation_errors := array_append(validation_errors, 
                    format('Unrealistic fuel consumption: %.2f km/L (min 3 km/L for normal trips)', kmpl));
            ELSIF kmpl < 5 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Poor fuel efficiency: %.2f km/L - check for issues or heavy load', kmpl));
            ELSIF kmpl > 50 THEN
                validation_errors := array_append(validation_errors, 
                    format('Impossible fuel efficiency: %.2f km/L (max 50 km/L)', kmpl));
            ELSIF kmpl > 30 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Unusually high efficiency: %.2f km/L - verify fuel quantity', kmpl));
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- EXPENSE VALIDATIONS
    -- =================================================================
    
    -- Fuel expense validation
    IF NEW.fuel_expense IS NOT NULL THEN
        IF NEW.fuel_expense > 50000 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive fuel expense: %.2f (max 50000)', NEW.fuel_expense));
        ELSIF NEW.fuel_expense > 30000 THEN
            validation_warnings := array_append(validation_warnings, 
                format('High fuel expense: %.2f - verify amount', NEW.fuel_expense));
        END IF;
        
        -- Check fuel expense vs quantity correlation
        IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
            IF NEW.fuel_expense / NEW.fuel_quantity > 200 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Fuel rate seems high: %.2f per liter', NEW.fuel_expense / NEW.fuel_quantity));
            ELSIF NEW.fuel_expense / NEW.fuel_quantity < 50 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Fuel rate seems low: %.2f per liter', NEW.fuel_expense / NEW.fuel_quantity));
            END IF;
        END IF;
    END IF;
    
    -- Driver expense validation
    IF NEW.driver_expense IS NOT NULL THEN
        IF NEW.driver_expense > 10000 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive driver expense: %.2f (max 10000)', NEW.driver_expense));
        ELSIF NEW.driver_expense > 5000 THEN
            validation_warnings := array_append(validation_warnings, 
                format('High driver expense: %.2f - verify amount', NEW.driver_expense));
        END IF;
    END IF;
    
    -- Toll expense validation
    IF NEW.toll_expense IS NOT NULL THEN
        IF NEW.toll_expense > 5000 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive toll expense: %.2f (max 5000)', NEW.toll_expense));
        ELSIF NEW.toll_expense > 2000 THEN
            validation_warnings := array_append(validation_warnings, 
                format('High toll expense: %.2f - verify amount', NEW.toll_expense));
        END IF;
    END IF;

    -- =================================================================
    -- DETERMINE SEVERITY AND HANDLE ERRORS/WARNINGS
    -- =================================================================
    
    IF array_length(validation_errors, 1) > 0 THEN
        severity_level := 'error';
        -- Raise exception with all errors
        RAISE EXCEPTION E'VALUE VALIDATION FAILED!\n%', 
            array_to_string(validation_errors, E'\n');
    ELSIF array_length(validation_warnings, 1) > 0 THEN
        severity_level := 'warning';
        -- Raise notice with warnings but allow the operation
        RAISE NOTICE E'VALUE VALIDATION WARNINGS:\n%', 
            array_to_string(validation_warnings, E'\n');
    ELSIF is_edge_case THEN
        severity_level := 'info';
        RAISE NOTICE 'Edge case detected: %', edge_case_info->>'reason';
    END IF;

    -- =================================================================
    -- AUDIT LOGGING
    -- =================================================================
    
    IF (is_edge_case OR array_length(validation_warnings, 1) > 0) AND 
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        
        PERFORM log_audit_trail(
            'value_range_validation',
            'trip_data',
            'trip',
            NEW.id::TEXT,
            format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
            CASE 
                WHEN is_edge_case THEN 'validated_edge_case'
                ELSE 'validated_with_warnings'
            END,
            jsonb_build_object(
                'distance_km', distance_km,
                'duration_hours', trip_duration_hours,
                'avg_speed_kmh', avg_speed_kmh,
                'fuel_quantity', NEW.fuel_quantity,
                'fuel_efficiency_kmpl', kmpl,
                'trip_type', NEW.trip_type
            ),
            jsonb_build_object(
                'is_edge_case', is_edge_case,
                'edge_case_info', edge_case_info,
                'validation_warnings', validation_warnings
            ),
            severity_level,
            NULL,
            ARRAY['value_validation', 
                  CASE WHEN is_edge_case THEN 'edge_case' ELSE 'standard' END,
                  COALESCE(edge_case_info->>'type', 'normal')],
            CASE 
                WHEN is_edge_case THEN edge_case_info->>'reason'
                WHEN array_length(validation_warnings, 1) > 0 THEN array_to_string(validation_warnings, '; ')
                ELSE NULL
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger for value range validation
CREATE TRIGGER enhanced_trip_value_validation
    BEFORE INSERT OR UPDATE OF start_km, end_km, fuel_quantity, fuel_expense, 
                              driver_expense, toll_expense, other_expense,
                              breakdown_expense, miscellaneous_expense,
                              trip_start_date, trip_end_date, trip_type,
                              refueling_done, notes
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_values_enhanced();

-- Function to analyze value anomalies across all trips
CREATE OR REPLACE FUNCTION analyze_value_anomalies(
    p_vehicle_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT (CURRENT_DATE - INTERVAL '90 days')::DATE,
    p_date_to DATE DEFAULT CURRENT_DATE,
    p_include_edge_cases BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    anomaly_type TEXT,
    severity TEXT,
    trip_count INTEGER,
    trip_ids UUID[],
    trip_serials TEXT[],
    anomaly_details JSONB,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH anomaly_detection AS (
        SELECT 
            t.id,
            t.trip_serial_number,
            t.vehicle_id,
            t.vehicle_registration,
            t.trip_start_date,
            (t.end_km - t.start_km) as distance_km,
            t.fuel_quantity,
            CASE 
                WHEN t.fuel_quantity > 0 THEN (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity 
                ELSE NULL 
            END as kmpl,
            EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 as duration_hours,
            t.fuel_expense,
            t.driver_expense,
            t.toll_expense,
            t.trip_type,
            t.refueling_done,
            -- Anomaly detection logic
            CASE
                WHEN (t.end_km - t.start_km) < 0 THEN 'negative_distance'
                WHEN (t.end_km - t.start_km) = 0 AND t.trip_type NOT IN ('maintenance', 'service') THEN 'zero_distance_non_maintenance'
                WHEN (t.end_km - t.start_km) > 2000 THEN 'excessive_distance'
                WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 300 THEN 'excessive_fuel'
                WHEN t.fuel_quantity > 0 AND (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 2 THEN 'poor_efficiency'
                WHEN t.fuel_quantity > 0 AND (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40 THEN 'suspicious_efficiency'
                WHEN EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 48 THEN 'excessive_duration'
                WHEN t.fuel_expense > 30000 THEN 'high_fuel_expense'
                WHEN t.driver_expense > 5000 THEN 'high_driver_expense'
                WHEN (t.end_km - t.start_km) > 100 AND 
                     EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 0 AND
                     (t.end_km - t.start_km) / (EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0) > 120 THEN 'impossible_speed'
                ELSE NULL
            END as anomaly_type
        FROM trips t
        WHERE t.deleted_at IS NULL
            AND t.created_by = auth.uid()
            AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
            AND t.trip_start_date >= p_date_from
            AND t.trip_start_date <= p_date_to
    )
    SELECT 
        ad.anomaly_type,
        CASE 
            WHEN ad.anomaly_type IN ('negative_distance', 'impossible_speed', 'poor_efficiency') THEN 'critical'
            WHEN ad.anomaly_type IN ('excessive_distance', 'excessive_fuel', 'excessive_duration', 'zero_distance_non_maintenance') THEN 'high'
            WHEN ad.anomaly_type IN ('suspicious_efficiency', 'high_fuel_expense', 'high_driver_expense') THEN 'medium'
            ELSE 'low'
        END as severity,
        COUNT(*)::INTEGER as trip_count,
        array_agg(ad.id) as trip_ids,
        array_agg(ad.trip_serial_number) as trip_serials,
        jsonb_build_object(
            'avg_distance', AVG(ad.distance_km),
            'max_distance', MAX(ad.distance_km),
            'min_distance', MIN(ad.distance_km),
            'avg_efficiency', AVG(ad.kmpl),
            'vehicles_affected', COUNT(DISTINCT ad.vehicle_id),
            'date_range', jsonb_build_object(
                'from', MIN(ad.trip_start_date),
                'to', MAX(ad.trip_start_date)
            )
        ) as anomaly_details,
        CASE ad.anomaly_type
            WHEN 'negative_distance' THEN 'Critical: Review and correct odometer readings immediately'
            WHEN 'zero_distance_non_maintenance' THEN 'Mark as maintenance trip or verify odometer readings'
            WHEN 'excessive_distance' THEN 'Verify trip or split into multiple segments'
            WHEN 'excessive_fuel' THEN 'Verify fuel quantity entry'
            WHEN 'poor_efficiency' THEN 'Check vehicle condition or verify fuel/distance entries'
            WHEN 'suspicious_efficiency' THEN 'Verify fuel quantity - efficiency seems too high'
            WHEN 'excessive_duration' THEN 'Consider splitting into multiple trips'
            WHEN 'high_fuel_expense' THEN 'Verify fuel expense amount'
            WHEN 'high_driver_expense' THEN 'Review and validate driver expense'
            WHEN 'impossible_speed' THEN 'Critical: Check trip times and distances'
            ELSE 'Review trip details for accuracy'
        END as recommendation
    FROM anomaly_detection ad
    WHERE ad.anomaly_type IS NOT NULL
        AND (p_include_edge_cases OR ad.trip_type NOT IN ('maintenance', 'service', 'test', 'long_haul'))
    GROUP BY ad.anomaly_type
    ORDER BY 
        CASE 
            WHEN ad.anomaly_type IN ('negative_distance', 'impossible_speed', 'poor_efficiency') THEN 1
            WHEN ad.anomaly_type IN ('excessive_distance', 'excessive_fuel', 'excessive_duration', 'zero_distance_non_maintenance') THEN 2
            ELSE 3
        END,
        COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_trip_values_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_value_anomalies(UUID, DATE, DATE, BOOLEAN) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_trip_values_enhanced() IS 'Enhanced validation of trip values with comprehensive range checking and edge case handling';
COMMENT ON FUNCTION analyze_value_anomalies(UUID, DATE, DATE, BOOLEAN) IS 'Analyzes trips for value anomalies and provides recommendations for data quality improvement';

--================================================================================

-- Migration: 20250918103736_delicate_silence.sql
/*
  # Add missing added_by column to destinations table

  1. Schema Changes
    - Add `added_by` column to `destinations` table
    - Copy data from existing `created_by` column to maintain data integrity
    - Update RLS policies to use `added_by` column

  2. Data Migration  
    - Migrate existing `created_by` values to new `added_by` column
    - Preserve existing data relationships

  3. Security
    - Update RLS policies to work with `added_by` column
*/

-- Add the missing added_by column to destinations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE public.destinations ADD COLUMN added_by UUID REFERENCES auth.users(id);
    
    -- Migrate existing data from created_by to added_by
    UPDATE public.destinations SET added_by = created_by WHERE created_by IS NOT NULL;
  END IF;
END $$;

-- Update RLS policies to use added_by column
DROP POLICY IF EXISTS "destinations_delete_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_insert_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;
DROP POLICY IF EXISTS "destinations_update_policy" ON public.destinations;

-- Create new RLS policies using added_by
CREATE POLICY "destinations_select_policy" ON public.destinations
  FOR SELECT USING (added_by = auth.uid());

CREATE POLICY "destinations_insert_policy" ON public.destinations
  FOR INSERT WITH CHECK (added_by = auth.uid());

CREATE POLICY "destinations_update_policy" ON public.destinations
  FOR UPDATE USING (added_by = auth.uid()) WITH CHECK (added_by = auth.uid());

CREATE POLICY "destinations_delete_policy" ON public.destinations
  FOR DELETE USING (added_by = auth.uid());

-- Create index on added_by for better performance
CREATE INDEX IF NOT EXISTS idx_destinations_added_by ON public.destinations(added_by);

--================================================================================

-- Migration: 20250919152512_square_ocean.sql
-- Add odometer_image column to maintenance_tasks table
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS odometer_image TEXT;

--================================================================================

-- Migration: 20250919152514_humble_limit.sql
-- Add odometer_image column to maintenance_tasks table
-- Run this in your Supabase SQL Editor

-- Add the missing odometer_image column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks' 
    AND column_name = 'odometer_image'
  ) THEN
    ALTER TABLE public.maintenance_tasks 
    ADD COLUMN odometer_image TEXT;
  END IF;
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'maintenance_tasks' 
  AND column_name = 'odometer_image';

--================================================================================

-- Migration: 20250921174910_silent_coral.sql
-- Fix fuel_amount column reference to total_fuel_cost in rpc_fuel_summary function
CREATE OR REPLACE FUNCTION rpc_fuel_summary(
  reg_no TEXT,
  date_from DATE,
  date_to DATE
)
RETURNS TABLE(
  total_fuel_amount NUMERIC,
  total_liters NUMERIC,
  trips_covered INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(t.total_fuel_cost), 0) as total_fuel_amount,
    COALESCE(SUM(t.fuel_quantity), 0) as total_liters,
    COUNT(*)::INTEGER as trips_covered
  FROM trips t
  JOIN vehicles v ON t.vehicle_id = v.id
  WHERE v.registration_number = reg_no
    AND t.trip_start_date >= date_from
    AND t.trip_start_date <= date_to
    AND t.total_fuel_cost IS NOT NULL
    AND t.total_fuel_cost > 0;
END;
$$;

--================================================================================

