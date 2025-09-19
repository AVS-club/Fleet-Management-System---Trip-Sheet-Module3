-- Update downtime schema to support both days and hours
-- This migration adds separate columns for days and hours to properly handle downtime

-- Add new columns for downtime
ALTER TABLE public.maintenance_tasks 
ADD COLUMN IF NOT EXISTS downtime_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downtime_hours INTEGER DEFAULT 0;

-- Update existing downtime_days to split into days and hours
-- This handles the conversion from fractional days to separate days/hours
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

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_days ON public.maintenance_tasks (downtime_days);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_downtime_hours ON public.maintenance_tasks (downtime_hours);

-- Add check constraints to ensure valid values
ALTER TABLE public.maintenance_tasks 
ADD CONSTRAINT check_downtime_days_positive CHECK (downtime_days >= 0),
ADD CONSTRAINT check_downtime_hours_valid CHECK (downtime_hours >= 0 AND downtime_hours < 24);

-- Add comments for documentation
COMMENT ON COLUMN public.maintenance_tasks.downtime_days IS 'Number of full days of downtime';
COMMENT ON COLUMN public.maintenance_tasks.downtime_hours IS 'Number of hours of downtime (0-23)';
