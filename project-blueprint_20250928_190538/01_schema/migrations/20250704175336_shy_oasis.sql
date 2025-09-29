/*
  # Add Trip Summary Metrics Function
  
  1. New Functions
    - Creates a new function get_trip_summary_metrics for calculating trip statistics
  2. Security
    - Function is available to all authenticated users
  3. Changes
    - Adds a new SQL function for retrieving trip summary metrics with filtering
*/

-- Create or replace the function to get trip summary metrics
CREATE OR REPLACE FUNCTION get_trip_summary_metrics(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL,
  p_vehicle_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_trip_type text DEFAULT NULL
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_expenses numeric;
  avg_distance numeric;
  trip_count integer;
  mean_mileage numeric;
  top_driver json;
  top_vehicle json;
BEGIN
  -- Filter conditions for all queries
  WITH filtered_trips AS (
    SELECT *
    FROM trips t
    WHERE 
      (start_date IS NULL OR t.trip_start_date >= start_date) AND
      (end_date IS NULL OR t.trip_end_date <= end_date) AND
      (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id) AND
      (p_driver_id IS NULL OR t.driver_id = p_driver_id) AND
      (p_warehouse_id IS NULL OR t.warehouse_id = p_warehouse_id) AND
      (
        p_trip_type IS NULL OR 
        (p_trip_type = 'local' AND t.short_trip = true) OR
        (p_trip_type = 'two_way' AND array_length(t.destinations, 1) > 1) OR
        (p_trip_type = 'one_way' AND t.short_trip = false AND array_length(t.destinations, 1) = 1)
      )
  )
  -- Calculate total expenses
  SELECT COALESCE(SUM(total_road_expenses) + SUM(COALESCE(total_fuel_cost, 0)), 0)
  INTO total_expenses
  FROM filtered_trips;
  
  -- Calculate average distance and trip count
  SELECT 
    COALESCE(AVG(end_km - start_km), 0),
    COUNT(*)
  INTO avg_distance, trip_count
  FROM filtered_trips;
  
  -- Calculate mean mileage for trips with calculated_kmpl
  SELECT COALESCE(AVG(calculated_kmpl), 0)
  INTO mean_mileage
  FROM filtered_trips
  WHERE calculated_kmpl IS NOT NULL AND short_trip = false;
  
  -- Get top driver by total distance
  WITH driver_stats AS (
    SELECT 
      d.id,
      d.name,
      COUNT(t.id) as trip_count,
      SUM(t.end_km - t.start_km) as total_distance
    FROM 
      filtered_trips t
      JOIN drivers d ON t.driver_id = d.id
    GROUP BY d.id, d.name
    ORDER BY total_distance DESC
    LIMIT 1
  )
  SELECT 
    json_build_object(
      'id', ds.id,
      'name', ds.name,
      'totalDistance', ds.total_distance,
      'tripCount', ds.trip_count
    )
  INTO top_driver
  FROM driver_stats ds
  LIMIT 1;
  
  -- Get top vehicle by trip count
  WITH vehicle_stats AS (
    SELECT 
      v.id,
      v.registration_number,
      COUNT(t.id) as trip_count
    FROM 
      filtered_trips t
      JOIN vehicles v ON t.vehicle_id = v.id
    GROUP BY v.id, v.registration_number
    ORDER BY trip_count DESC
    LIMIT 1
  )
  SELECT 
    json_build_object(
      'id', vs.id,
      'registrationNumber', vs.registration_number,
      'tripCount', vs.trip_count
    )
  INTO top_vehicle
  FROM vehicle_stats vs
  LIMIT 1;
  
  -- Build and return the result
  result := json_build_object(
    'totalExpenses', total_expenses,
    'avgDistance', avg_distance,
    'tripCount', trip_count,
    'meanMileage', mean_mileage,
    'topDriver', top_driver,
    'topVehicle', top_vehicle
  );
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_trip_summary_metrics TO authenticated;