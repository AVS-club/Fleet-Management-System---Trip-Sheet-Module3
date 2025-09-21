-- FleetIQ Scanner RPC Functions
-- These functions provide optimized database queries for the scanner chatbox

-- Function to count trips for a specific vehicle and date range
CREATE OR REPLACE FUNCTION rpc_trips_count(
  reg_no TEXT,
  date_from DATE,
  date_to DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trip_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO trip_count
  FROM trips t
  JOIN vehicles v ON t.vehicle_id = v.id
  WHERE v.registration_number = reg_no
    AND t.trip_start_date >= date_from
    AND t.trip_start_date <= date_to;
  
  RETURN COALESCE(trip_count, 0);
END;
$$;

-- Function to get fuel summary for a vehicle and date range
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

-- Function to get mileage statistics for a vehicle and date range
CREATE OR REPLACE FUNCTION rpc_mileage_stats(
  reg_no TEXT,
  date_from DATE,
  date_to DATE
)
RETURNS TABLE(
  distance_km NUMERIC,
  refuel_liters NUMERIC,
  trip_count INTEGER,
  avg_mileage_kmpl NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_distance NUMERIC;
  total_fuel NUMERIC;
  trip_count INTEGER;
  avg_mileage NUMERIC;
BEGIN
  -- Calculate total distance and fuel consumption
  SELECT 
    COALESCE(SUM(t.end_km - t.start_km), 0),
    COALESCE(SUM(t.fuel_quantity), 0),
    COUNT(*)::INTEGER
  INTO total_distance, total_fuel, trip_count
  FROM trips t
  JOIN vehicles v ON t.vehicle_id = v.id
  WHERE v.registration_number = reg_no
    AND t.trip_start_date >= date_from
    AND t.trip_start_date <= date_to
    AND t.end_km > t.start_km
    AND t.fuel_quantity > 0;
  
  -- Calculate average mileage
  IF total_fuel > 0 THEN
    avg_mileage := total_distance / total_fuel;
  ELSE
    avg_mileage := 0;
  END IF;
  
  RETURN QUERY
  SELECT 
    total_distance as distance_km,
    total_fuel as refuel_liters,
    trip_count,
    avg_mileage as avg_mileage_kmpl;
END;
$$;

-- Function to get vehicle document expiries
CREATE OR REPLACE FUNCTION rpc_vehicle_expiries(
  reg_no TEXT
)
RETURNS TABLE(
  registration_number TEXT,
  insurance_expiry_date DATE,
  puc_expiry_date DATE,
  permit_expiry_date DATE,
  fitness_expiry_date DATE,
  registration_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.registration_number,
    v.insurance_expiry_date,
    v.puc_expiry_date,
    v.permit_expiry_date,
    v.fitness_expiry_date,
    v.registration_date,
    v.puc_expiry_date
  FROM vehicles v
  WHERE v.registration_number = reg_no;
END;
$$;

-- Function to get all vehicles with expiring documents (next 30 days)
CREATE OR REPLACE FUNCTION rpc_expiring_documents(
  days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE(
  registration_number TEXT,
  insurance_expiry_date DATE,
  puc_expiry_date DATE,
  permit_expiry_date DATE,
  fitness_expiry_date DATE,
  days_until_insurance INTEGER,
  days_until_pollution INTEGER,
  days_until_permit INTEGER,
  days_until_fitness INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date DATE;
BEGIN
  cutoff_date := CURRENT_DATE + INTERVAL '1 day' * days_ahead;
  
  RETURN QUERY
  SELECT 
    v.registration_number,
    v.insurance_expiry_date,
    v.puc_expiry_date,
    v.permit_expiry_date,
    v.fitness_expiry_date,
    CASE 
      WHEN v.insurance_expiry_date IS NOT NULL 
      THEN (v.insurance_expiry_date - CURRENT_DATE)::INTEGER
      ELSE NULL 
    END as days_until_insurance,
    CASE 
      WHEN v.puc_expiry_date IS NOT NULL 
      THEN (v.puc_expiry_date - CURRENT_DATE)::INTEGER
      ELSE NULL 
    END as days_until_pollution,
    CASE 
      WHEN v.permit_expiry_date IS NOT NULL 
      THEN (v.permit_expiry_date - CURRENT_DATE)::INTEGER
      ELSE NULL 
    END as days_until_permit,
    CASE 
      WHEN v.fitness_expiry_date IS NOT NULL 
      THEN (v.fitness_expiry_date - CURRENT_DATE)::INTEGER
      ELSE NULL 
    END as days_until_fitness
  FROM vehicles v
  WHERE (
    (v.insurance_expiry_date IS NOT NULL AND v.insurance_expiry_date <= cutoff_date) OR
    (v.puc_expiry_date IS NOT NULL AND v.puc_expiry_date <= cutoff_date) OR
    (v.permit_expiry_date IS NOT NULL AND v.permit_expiry_date <= cutoff_date) OR
    (v.fitness_expiry_date IS NOT NULL AND v.fitness_expiry_date <= cutoff_date)
  )
  ORDER BY 
    LEAST(
      COALESCE(v.insurance_expiry_date, '9999-12-31'::DATE),
      COALESCE(v.puc_expiry_date, '9999-12-31'::DATE),
      COALESCE(v.permit_expiry_date, '9999-12-31'::DATE),
      COALESCE(v.fitness_expiry_date, '9999-12-31'::DATE)
    );
END;
$$;

-- Function to get maintenance status for a vehicle or all vehicles
CREATE OR REPLACE FUNCTION rpc_maintenance_status(
  reg_no TEXT DEFAULT NULL
)
RETURNS TABLE(
  maintenance_id UUID,
  vehicle_registration TEXT,
  task_type TEXT,
  status TEXT,
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  scheduled_date DATE,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF reg_no IS NOT NULL THEN
    -- Get maintenance for specific vehicle
    RETURN QUERY
    SELECT 
      m.id as maintenance_id,
      v.registration_number as vehicle_registration,
      m.task_type,
      m.status,
      m.priority,
      m.created_at,
      m.scheduled_date,
      m.description
    FROM maintenance_tasks m
    JOIN vehicles v ON m.vehicle_id = v.id
    WHERE v.registration_number = reg_no
      AND m.status IN ('pending', 'in_progress')
    ORDER BY m.created_at DESC;
  ELSE
    -- Get all pending maintenance
    RETURN QUERY
    SELECT 
      m.id as maintenance_id,
      v.registration_number as vehicle_registration,
      m.task_type,
      m.status,
      m.priority,
      m.created_at,
      m.scheduled_date,
      m.description
    FROM maintenance_tasks m
    JOIN vehicles v ON m.vehicle_id = v.id
    WHERE m.status IN ('pending', 'in_progress')
    ORDER BY m.created_at DESC
    LIMIT 20;
  END IF;
END;
$$;

-- Function to get fleet summary statistics
CREATE OR REPLACE FUNCTION rpc_fleet_summary(
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  total_vehicles INTEGER,
  active_vehicles INTEGER,
  total_trips INTEGER,
  total_distance NUMERIC,
  total_fuel_cost NUMERIC,
  avg_mileage NUMERIC,
  trips_this_month INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  current_month_start DATE;
BEGIN
  -- Set default date range if not provided
  IF date_from IS NULL THEN
    start_date := CURRENT_DATE - INTERVAL '30 days';
  ELSE
    start_date := date_from;
  END IF;
  
  IF date_to IS NULL THEN
    end_date := CURRENT_DATE;
  ELSE
    end_date := date_to;
  END IF;
  
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM vehicles WHERE status != 'archived') as total_vehicles,
    (SELECT COUNT(*)::INTEGER FROM vehicles WHERE status = 'active') as active_vehicles,
    (SELECT COUNT(*)::INTEGER FROM trips WHERE trip_start_date >= start_date AND trip_start_date <= end_date) as total_trips,
    (SELECT COALESCE(SUM(end_km - start_km), 0) FROM trips WHERE trip_start_date >= start_date AND trip_start_date <= end_date AND end_km > start_km) as total_distance,
    (SELECT COALESCE(SUM(total_fuel_cost), 0) FROM trips WHERE trip_start_date >= start_date AND trip_start_date <= end_date AND total_fuel_cost IS NOT NULL) as total_fuel_cost,
    (SELECT 
      CASE 
        WHEN SUM(fuel_quantity) > 0 
        THEN SUM(end_km - start_km) / SUM(fuel_quantity)
        ELSE 0 
      END
     FROM trips 
     WHERE trip_start_date >= start_date 
       AND trip_start_date <= end_date 
       AND end_km > start_km 
       AND fuel_quantity > 0
    ) as avg_mileage,
    (SELECT COUNT(*)::INTEGER FROM trips WHERE trip_start_date >= current_month_start) as trips_this_month;
END;
$$;

-- Function to search vehicles by registration pattern
CREATE OR REPLACE FUNCTION rpc_search_vehicles(
  search_pattern TEXT
)
RETURNS TABLE(
  registration_number TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.registration_number,
    v.make,
    v.model,
    v.year,
    v.status
  FROM vehicles v
  WHERE v.registration_number ILIKE '%' || search_pattern || '%'
    AND v.status != 'archived'
  ORDER BY v.registration_number
  LIMIT 10;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION rpc_trips_count(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_fuel_summary(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_mileage_stats(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_vehicle_expiries(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_expiring_documents(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_maintenance_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_fleet_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_search_vehicles(TEXT) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_date ON trips(vehicle_id, trip_start_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_expiry_dates ON vehicles(insurance_expiry_date, puc_expiry_date, permit_expiry_date, fitness_expiry_date);
