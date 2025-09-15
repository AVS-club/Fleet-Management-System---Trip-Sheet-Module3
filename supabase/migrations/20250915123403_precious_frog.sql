/*
  # Create get_trip_summary_metrics RPC function
  
  This function provides trip summary metrics for the admin dashboard.
  It calculates various metrics based on the actual database schema columns.
*/

CREATE OR REPLACE FUNCTION get_trip_summary_metrics(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
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
  total_expenses_val numeric := 0;
  avg_distance_val numeric := 0;
  trip_count_val bigint := 0;
  mean_mileage_val numeric := 0;
  top_driver_record record;
  top_vehicle_record record;
BEGIN
  -- Build the base query with filters
  WITH filtered_trips AS (
    SELECT 
      t.*,
      (t.end_km - t.start_km) as distance,
      COALESCE(t.fuel_expense, t.fuel_cost, 0) + 
      COALESCE(t.driver_expense, 0) + 
      COALESCE(t.toll_expense, 0) + 
      COALESCE(t.other_expense, 0) + 
      COALESCE(t.breakdown_expense, 0) + 
      COALESCE(t.miscellaneous_expense, 0) + 
      COALESCE(t.unloading_expense, 0) + 
      COALESCE(t.road_rto_expense, 0) as total_trip_expenses
    FROM trips t
    WHERE 
      (start_date IS NULL OR t.trip_start_date >= start_date)
      AND (end_date IS NULL OR t.trip_end_date <= end_date)
      AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
      AND (p_driver_id IS NULL OR t.driver_id = p_driver_id)
      AND (p_warehouse_id IS NULL OR t.warehouse_id = p_warehouse_id)
      AND (p_trip_type IS NULL OR 
           (p_trip_type = 'one_way' AND array_length(t.destinations, 1) = 1) OR
           (p_trip_type = 'two_way' AND array_length(t.destinations, 1) > 1))
  ),
  trip_metrics AS (
    SELECT 
      COUNT(*) as trip_count,
      COALESCE(SUM(total_trip_expenses), 0) as total_expenses,
      COALESCE(AVG(distance), 0) as avg_distance,
      COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0) as mean_mileage
    FROM filtered_trips
  ),
  driver_stats AS (
    SELECT 
      t.driver_id,
      d.name as driver_name,
      SUM(t.distance) as total_distance,
      COUNT(*) as trip_count
    FROM filtered_trips t
    JOIN drivers d ON d.id = t.driver_id
    GROUP BY t.driver_id, d.name
    ORDER BY total_distance DESC
    LIMIT 1
  ),
  vehicle_stats AS (
    SELECT 
      t.vehicle_id,
      v.registration_number,
      COUNT(*) as trip_count
    FROM filtered_trips t
    JOIN vehicles v ON v.id = t.vehicle_id
    GROUP BY t.vehicle_id, v.registration_number
    ORDER BY trip_count DESC
    LIMIT 1
  )
  SELECT 
    tm.total_expenses,
    tm.avg_distance,
    tm.trip_count,
    tm.mean_mileage,
    CASE 
      WHEN ds.driver_id IS NOT NULL THEN
        json_build_object(
          'id', ds.driver_id,
          'name', ds.driver_name,
          'totalDistance', ds.total_distance,
          'tripCount', ds.trip_count
        )
      ELSE NULL
    END as top_driver,
    CASE 
      WHEN vs.vehicle_id IS NOT NULL THEN
        json_build_object(
          'id', vs.vehicle_id,
          'registrationNumber', vs.registration_number,
          'tripCount', vs.trip_count
        )
      ELSE NULL
    END as top_vehicle
  INTO 
    total_expenses_val,
    avg_distance_val,
    trip_count_val,
    mean_mileage_val,
    top_driver_record,
    top_vehicle_record
  FROM trip_metrics tm
  LEFT JOIN driver_stats ds ON true
  LEFT JOIN vehicle_stats vs ON true;

  -- Build the result JSON
  result := json_build_object(
    'totalExpenses', COALESCE(total_expenses_val, 0),
    'avgDistance', COALESCE(avg_distance_val, 0),
    'tripCount', COALESCE(trip_count_val, 0),
    'meanMileage', COALESCE(mean_mileage_val, 0),
    'topDriver', top_driver_record,
    'topVehicle', top_vehicle_record
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trip_summary_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_summary_metrics TO anon;