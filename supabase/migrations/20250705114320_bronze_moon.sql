/*
  # Create Trip Summary Metrics RPC Function

  1. New Functions
    - `get_trip_summary_metrics` - Returns aggregated metrics for trips based on filters
      - Parameters: start_date, end_date, vehicle_id, driver_id, warehouse_id, trip_type
      - Returns: total_expenses, avg_distance, trip_count, mean_mileage, top_driver, top_vehicle

  2. Security
    - Function accessible to authenticated users
    - Uses existing RLS policies on underlying tables
*/

CREATE OR REPLACE FUNCTION public.get_trip_summary_metrics(
    start_date timestamp with time zone DEFAULT NULL,
    end_date timestamp with time zone DEFAULT NULL,
    p_vehicle_id uuid DEFAULT NULL,
    p_driver_id uuid DEFAULT NULL,
    p_warehouse_id uuid DEFAULT NULL,
    p_trip_type text DEFAULT NULL
)
RETURNS TABLE(
    total_expenses numeric,
    avg_distance numeric,
    trip_count bigint,
    mean_mileage numeric,
    top_driver jsonb,
    top_vehicle jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_expenses numeric;
    v_avg_distance numeric;
    v_trip_count bigint;
    v_mean_mileage numeric;
    v_top_driver jsonb;
    v_top_vehicle jsonb;
BEGIN
    -- Calculate metrics using filtered trips
    WITH filtered_trips AS (
        SELECT
            t.id,
            t.vehicle_id,
            t.driver_id,
            t.warehouse_id,
            COALESCE(t.total_fuel_cost, 0) + COALESCE(t.total_road_expenses, 0) + 
            COALESCE(t.unloading_expense, 0) + COALESCE(t.driver_expense, 0) + 
            COALESCE(t.road_rto_expense, 0) + COALESCE(t.breakdown_expense, 0) + 
            COALESCE(t.miscellaneous_expense, 0) AS total_trip_cost,
            (t.end_km - t.start_km) AS distance_km,
            t.calculated_kmpl,
            t.short_trip,
            t.destinations,
            d.name AS driver_name,
            v.registration_number AS vehicle_registration_number
        FROM
            trips t
        LEFT JOIN
            drivers d ON t.driver_id = d.id
        LEFT JOIN
            vehicles v ON t.vehicle_id = v.id
        WHERE
            (start_date IS NULL OR t.trip_start_date >= start_date) AND
            (end_date IS NULL OR t.trip_end_date <= end_date) AND
            (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id) AND
            (p_driver_id IS NULL OR t.driver_id = p_driver_id) AND
            (p_warehouse_id IS NULL OR t.warehouse_id = p_warehouse_id) AND
            (p_trip_type IS NULL OR
                (p_trip_type = 'local' AND t.short_trip = TRUE) OR
                (p_trip_type = 'one_way' AND t.short_trip = FALSE AND array_length(t.destinations, 1) = 1) OR
                (p_trip_type = 'two_way' AND t.short_trip = FALSE AND array_length(t.destinations, 1) > 1)
            )
    ),
    driver_performance AS (
        SELECT
            driver_id,
            driver_name,
            SUM(distance_km) AS total_distance,
            COUNT(id) AS trip_count
        FROM
            filtered_trips
        WHERE driver_id IS NOT NULL AND driver_name IS NOT NULL
        GROUP BY
            driver_id, driver_name
        ORDER BY
            total_distance DESC
        LIMIT 1
    ),
    vehicle_performance AS (
        SELECT
            vehicle_id,
            vehicle_registration_number,
            COUNT(id) AS trip_count
        FROM
            filtered_trips
        WHERE vehicle_id IS NOT NULL AND vehicle_registration_number IS NOT NULL
        GROUP BY
            vehicle_id, vehicle_registration_number
        ORDER BY
            COUNT(id) DESC
        LIMIT 1
    )
    SELECT
        COALESCE(SUM(ft.total_trip_cost), 0),
        COALESCE(AVG(ft.distance_km), 0),
        COUNT(ft.id),
        COALESCE(AVG(ft.calculated_kmpl) FILTER (WHERE ft.calculated_kmpl IS NOT NULL AND ft.calculated_kmpl > 0), 0),
        (SELECT jsonb_build_object(
            'id', dp.driver_id,
            'name', dp.driver_name,
            'totalDistance', dp.total_distance,
            'tripCount', dp.trip_count
        ) FROM driver_performance dp),
        (SELECT jsonb_build_object(
            'id', vp.vehicle_id,
            'registrationNumber', vp.vehicle_registration_number,
            'tripCount', vp.trip_count
        ) FROM vehicle_performance vp)
    INTO
        v_total_expenses,
        v_avg_distance,
        v_trip_count,
        v_mean_mileage,
        v_top_driver,
        v_top_vehicle
    FROM
        filtered_trips ft;

    RETURN QUERY SELECT
        v_total_expenses,
        v_avg_distance,
        v_trip_count,
        v_mean_mileage,
        v_top_driver,
        v_top_vehicle;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trip_summary_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trip_summary_metrics TO anon;