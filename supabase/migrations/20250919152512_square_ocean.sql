@@ .. @@
-- Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  task_type VARCHAR(100),
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  cost DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  vendor VARCHAR(255),
  invoice_number VARCHAR(100),
  next_due_date DATE,
  next_due_km INTEGER,
  notes TEXT,
+  odometer_image TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);