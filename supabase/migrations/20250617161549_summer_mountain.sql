/*
  # Add function for trip summary metrics
  
  1. New Function
    - `get_trip_summary_metrics` - Calculates summary metrics for trips with filtering options
    - Takes parameters for filtering by date range, vehicle, driver, warehouse, and trip type
    - Returns a JSON object with metrics including total expenses, average distance, trip count,
      mean mileage, top driver, and top vehicle
  
  2. Security
    - Grant execute permission to authenticated users
    - Function is designed to work with the existing trips table structure
*/

-- Function to calculate trip summary metrics with optional filtering
CREATE OR REPLACE FUNCTION get_trip_summary_metrics(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  p_vehicle_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_trip_type text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
  total_expenses numeric := 0;
  avg_distance numeric := 0;
  mean_mileage numeric := 0;
  top_driver json := NULL;
  top_vehicle json := NULL;
  trip_count integer := 0;
BEGIN
  -- Calculate total expenses
  SELECT 
    COALESCE(SUM(unloading_expense), 0) +
    COALESCE(SUM(driver_expense), 0) +
    COALESCE(SUM(road_rto_expense), 0) +
    COALESCE(SUM(breakdown_expense), 0) +
    COALESCE(SUM(miscellaneous_expense), 0) +
    COALESCE(SUM(total_fuel_cost), 0)
  INTO total_expenses
  FROM trips
  WHERE (start_date IS NULL OR trip_start_date >= start_date)
    AND (end_date IS NULL OR trip_end_date <= end_date)
    AND (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id)
    AND (p_driver_id IS NULL OR driver_id = p_driver_id)
    AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    AND (
      p_trip_type IS NULL
      OR (
        (p_trip_type = 'local' AND short_trip = true)
        OR (p_trip_type = 'two_way' AND destinations IS NOT NULL AND array_length(destinations, 1) > 1)
        OR (p_trip_type = 'one_way' AND NOT short_trip AND destinations IS NOT NULL AND array_length(destinations, 1) = 1)
      )
    );
  
  -- Calculate trip count and average distance
  SELECT 
    COUNT(*),
    CASE 
      WHEN COUNT(*) > 0 THEN AVG(end_km - start_km) 
      ELSE 0 
    END
  INTO trip_count, avg_distance
  FROM trips
  WHERE (start_date IS NULL OR trip_start_date >= start_date)
    AND (end_date IS NULL OR trip_end_date <= end_date)
    AND (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id)
    AND (p_driver_id IS NULL OR driver_id = p_driver_id)
    AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    AND (
      p_trip_type IS NULL
      OR (
        (p_trip_type = 'local' AND short_trip = true)
        OR (p_trip_type = 'two_way' AND destinations IS NOT NULL AND array_length(destinations, 1) > 1)
        OR (p_trip_type = 'one_way' AND NOT short_trip AND destinations IS NOT NULL AND array_length(destinations, 1) = 1)
      )
    );
  
  -- Calculate mean mileage (excluding null and short trips)
  SELECT 
    COALESCE(AVG(calculated_kmpl), 0)
  INTO mean_mileage
  FROM trips
  WHERE calculated_kmpl IS NOT NULL
    AND NOT short_trip
    AND (start_date IS NULL OR trip_start_date >= start_date)
    AND (end_date IS NULL OR trip_end_date <= end_date)
    AND (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id)
    AND (p_driver_id IS NULL OR driver_id = p_driver_id)
    AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
    AND (
      p_trip_type IS NULL
      OR (
        (p_trip_type = 'local' AND short_trip = true)
        OR (p_trip_type = 'two_way' AND destinations IS NOT NULL AND array_length(destinations, 1) > 1)
        OR (p_trip_type = 'one_way' AND NOT short_trip AND destinations IS NOT NULL AND array_length(destinations, 1) = 1)
      )
    );
  
  -- Find top driver by total distance (if any)
  BEGIN
    SELECT 
      json_build_object(
        'id', driver_id,
        'name', driver_name,
        'totalDistance', total_distance,
        'tripCount', driver_trip_count
      )
    INTO top_driver
    FROM (
      SELECT 
        trips.driver_id,
        drivers.name AS driver_name,
        SUM(trips.end_km - trips.start_km) AS total_distance,
        COUNT(*) AS driver_trip_count
      FROM trips
      JOIN drivers ON trips.driver_id = drivers.id
      WHERE (start_date IS NULL OR trips.trip_start_date >= start_date)
        AND (end_date IS NULL OR trips.trip_end_date <= end_date)
        AND (p_vehicle_id IS NULL OR trips.vehicle_id = p_vehicle_id)
        AND (p_driver_id IS NULL OR trips.driver_id = p_driver_id)
        AND (p_warehouse_id IS NULL OR trips.warehouse_id = p_warehouse_id)
        AND (
          p_trip_type IS NULL
          OR (
            (p_trip_type = 'local' AND trips.short_trip = true)
            OR (p_trip_type = 'two_way' AND trips.destinations IS NOT NULL AND array_length(trips.destinations, 1) > 1)
            OR (p_trip_type = 'one_way' AND NOT trips.short_trip AND trips.destinations IS NOT NULL AND array_length(trips.destinations, 1) = 1)
          )
        )
      GROUP BY trips.driver_id, drivers.name
      ORDER BY total_distance DESC
      LIMIT 1
    ) AS driver_stats;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      top_driver := NULL;
  END;
  
  -- Find top vehicle by trip count (if any)
  BEGIN
    SELECT 
      json_build_object(
        'id', vehicle_id,
        'registrationNumber', vehicle_reg,
        'tripCount', vehicle_trip_count
      )
    INTO top_vehicle
    FROM (
      SELECT 
        trips.vehicle_id,
        vehicles.registration_number AS vehicle_reg,
        COUNT(*) AS vehicle_trip_count
      FROM trips
      JOIN vehicles ON trips.vehicle_id = vehicles.id
      WHERE (start_date IS NULL OR trips.trip_start_date >= start_date)
        AND (end_date IS NULL OR trips.trip_end_date <= end_date)
        AND (p_vehicle_id IS NULL OR trips.vehicle_id = p_vehicle_id)
        AND (p_driver_id IS NULL OR trips.driver_id = p_driver_id)
        AND (p_warehouse_id IS NULL OR trips.warehouse_id = p_warehouse_id)
        AND (
          p_trip_type IS NULL
          OR (
            (p_trip_type = 'local' AND trips.short_trip = true)
            OR (p_trip_type = 'two_way' AND trips.destinations IS NOT NULL AND array_length(trips.destinations, 1) > 1)
            OR (p_trip_type = 'one_way' AND NOT trips.short_trip AND trips.destinations IS NOT NULL AND array_length(trips.destinations, 1) = 1)
          )
        )
      GROUP BY trips.vehicle_id, vehicles.registration_number
      ORDER BY vehicle_trip_count DESC
      LIMIT 1
    ) AS vehicle_stats;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      top_vehicle := NULL;
  END;
  
  -- Build the result JSON
  result := json_build_object(
    'totalExpenses', COALESCE(total_expenses, 0),
    'avgDistance', COALESCE(avg_distance, 0),
    'tripCount', COALESCE(trip_count, 0),
    'meanMileage', COALESCE(mean_mileage, 0),
    'topDriver', top_driver,
    'topVehicle', top_vehicle
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trip_summary_metrics TO authenticated;