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
   added_by UUID REFERENCES auth.users(id),
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
+-- Create maintenance_service_tasks table
+CREATE TABLE IF NOT EXISTS public.maintenance_service_tasks (
+  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
+  maintenance_task_id UUID REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
+  vendor_id TEXT DEFAULT '',
+  tasks TEXT[] NOT NULL,
+  cost DECIMAL(10,2) NOT NULL,
+  bill_url TEXT[],
+  parts_replaced BOOLEAN DEFAULT false,
+  battery_tracking BOOLEAN DEFAULT false,
+  battery_serial VARCHAR(255),
+  battery_brand VARCHAR(255),
+  battery_warranty_url TEXT[],
+  battery_warranty_expiry_date DATE,
+  tyre_tracking BOOLEAN DEFAULT false,
+  tyre_positions TEXT[],
+  tyre_brand VARCHAR(255),
+  tyre_serials TEXT[],
+  tyre_warranty_url TEXT[],
+  tyre_warranty_expiry_date DATE,
+  bill_file TEXT[],
+  added_by UUID REFERENCES auth.users(id),
+  created_at TIMESTAMPTZ DEFAULT NOW(),
+  updated_at TIMESTAMPTZ DEFAULT NOW()
+);
+
 -- Create vehicle_documents table
 CREATE TABLE IF NOT EXISTS public.vehicle_documents (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   vehicle_id UUID REFERENCES public.vehicles(id),
   document_type VARCHAR(100),
   document_number VARCHAR(255),
   issue_date DATE,
   expiry_date DATE,
   file_url TEXT,
   status VARCHAR(50) DEFAULT 'active',
   added_by UUID REFERENCES auth.users(id),
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- Create driver_documents table
 CREATE TABLE IF NOT EXISTS public.driver_documents (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   driver_id UUID REFERENCES public.drivers(id),
   document_type VARCHAR(100),
   document_number VARCHAR(255),
   issue_date DATE,
   expiry_date DATE,
   file_url TEXT,
   status VARCHAR(50) DEFAULT 'active',
   added_by UUID REFERENCES auth.users(id),
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- Enable Row Level Security
 ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
+ALTER TABLE public.maintenance_service_tasks ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
 
 -- Create RLS policies (allows authenticated users to manage their own data)
 CREATE POLICY "Users can view their own vehicles" ON public.vehicles
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
 CREATE POLICY "Users can view their own drivers" ON public.drivers
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
 CREATE POLICY "Users can view their own trips" ON public.trips
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
 CREATE POLICY "Users can view their own destinations" ON public.destinations
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
 CREATE POLICY "Users can view their own maintenance tasks" ON public.maintenance_tasks
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
+CREATE POLICY "Users can view their own maintenance service tasks" ON public.maintenance_service_tasks
+  FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
+
 CREATE POLICY "Users can view their own vehicle documents" ON public.vehicle_documents
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
 CREATE POLICY "Users can view their own driver documents" ON public.driver_documents
   FOR ALL USING (auth.uid() = added_by OR auth.uid() IS NOT NULL);
 
 -- Create indexes for performance
 CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);
 CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
 CREATE INDEX IF NOT EXISTS idx_trips_trip_start_date ON public.trips(trip_start_date);
 CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_tasks(vehicle_id);
+CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_task_id ON public.maintenance_service_tasks(maintenance_task_id);
 CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_id ON public.vehicle_documents(vehicle_id);
 CREATE INDEX IF NOT EXISTS idx_driver_docs_driver_id ON public.driver_documents(driver_id);