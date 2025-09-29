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