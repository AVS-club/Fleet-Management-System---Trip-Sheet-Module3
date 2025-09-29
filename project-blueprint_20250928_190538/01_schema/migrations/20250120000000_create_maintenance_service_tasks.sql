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
