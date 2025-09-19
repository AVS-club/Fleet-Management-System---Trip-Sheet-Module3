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
