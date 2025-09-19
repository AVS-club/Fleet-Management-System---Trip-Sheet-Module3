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

-- Add check constraints for data integrity
ALTER TABLE public.maintenance_tasks 
ADD CONSTRAINT check_downtime_days_positive CHECK (downtime_days >= 0),
ADD CONSTRAINT check_downtime_hours_valid CHECK (downtime_hours >= 0 AND downtime_hours < 24),
ADD CONSTRAINT check_downtime_category_valid CHECK (downtime_category IN ('maintenance', 'repair', 'inspection', 'accident', 'breakdown', 'scheduled', 'emergency')),
ADD CONSTRAINT check_downtime_impact_valid CHECK (downtime_impact_level IN ('low', 'medium', 'high', 'critical'));

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
