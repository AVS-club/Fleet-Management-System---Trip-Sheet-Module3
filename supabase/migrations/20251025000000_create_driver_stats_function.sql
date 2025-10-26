-- Create function to get driver statistics efficiently
-- This function calculates key performance metrics for drivers based on their trip history

CREATE OR REPLACE FUNCTION get_driver_stats(
  p_organization_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  driver_id UUID,
  total_trips BIGINT,
  total_distance NUMERIC,
  total_fuel NUMERIC,
  avg_mileage NUMERIC,
  active_days INTEGER,
  last_trip_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.driver_id,
    COUNT(*)::BIGINT as total_trips,
    COALESCE(SUM(t.end_km - t.start_km), 0)::NUMERIC as total_distance,
    COALESCE(SUM(t.fuel_quantity), 0)::NUMERIC as total_fuel,
    CASE
      WHEN SUM(t.fuel_quantity) > 0
      THEN (SUM(t.end_km - t.start_km) / SUM(t.fuel_quantity))::NUMERIC
      ELSE 0
    END as avg_mileage,
    COUNT(DISTINCT DATE(t.trip_start_date))::INTEGER as active_days,
    MAX(DATE(t.trip_end_date)) as last_trip_date
  FROM trips t
  WHERE t.organization_id = p_organization_id
    AND t.driver_id IS NOT NULL
    AND t.trip_start_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
  GROUP BY t.driver_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_driver_stats(UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_driver_stats IS 'Calculate driver performance statistics for a given organization and time period. Returns trip count, distance, fuel usage, mileage, and activity metrics.';
