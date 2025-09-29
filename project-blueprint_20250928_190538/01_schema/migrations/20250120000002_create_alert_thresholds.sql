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
