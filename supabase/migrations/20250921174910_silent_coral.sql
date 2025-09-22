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