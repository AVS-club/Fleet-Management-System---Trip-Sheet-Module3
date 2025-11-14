-- =====================================================
-- Fleet Management System - Report SQL Queries
-- =====================================================
-- This file contains all SQL queries for generating reports
-- in the Fleet Management System.
-- =====================================================

-- =====================================================
-- 1. WEEKLY COMPARISON REPORT
-- =====================================================
-- Get current week data
WITH current_week_dates AS (
  SELECT
    DATE_TRUNC('week', CURRENT_DATE)::date AS week_start,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date AS week_end
),
previous_week_dates AS (
  SELECT
    (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days')::date AS week_start,
    (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day')::date AS week_end
)
SELECT
  'current_week' AS period,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS fuel_consumed,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses
FROM trips t
CROSS JOIN current_week_dates cw
WHERE t.trip_start_date >= cw.week_start
  AND t.trip_start_date <= cw.week_end
  AND t.status != 'cancelled'

UNION ALL

SELECT
  'previous_week' AS period,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS fuel_consumed,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses
FROM trips t
CROSS JOIN previous_week_dates pw
WHERE t.trip_start_date >= pw.week_start
  AND t.trip_start_date <= pw.week_end
  AND t.status != 'cancelled';

-- =====================================================
-- 2. MONTHLY COMPARISON REPORT
-- =====================================================
-- Get current month and previous month comparison
WITH current_month_dates AS (
  SELECT
    DATE_TRUNC('month', CURRENT_DATE)::date AS month_start,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date AS month_end
),
previous_month_dates AS (
  SELECT
    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::date AS month_start,
    (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::date AS month_end
)
SELECT
  'current_month' AS period,
  TO_CHAR(CURRENT_DATE, 'Month') AS month_name,
  EXTRACT(YEAR FROM CURRENT_DATE) AS year,
  COUNT(DISTINCT t.vehicle_id) AS active_vehicles,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(t.net_profit), 0) AS net_profit
FROM trips t
CROSS JOIN current_month_dates cm
WHERE t.trip_start_date >= cm.month_start
  AND t.trip_start_date <= cm.month_end
  AND t.status != 'cancelled'

UNION ALL

SELECT
  'previous_month' AS period,
  TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'Month') AS month_name,
  EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month') AS year,
  COUNT(DISTINCT t.vehicle_id) AS active_vehicles,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(t.net_profit), 0) AS net_profit
FROM trips t
CROSS JOIN previous_month_dates pm
WHERE t.trip_start_date >= pm.month_start
  AND t.trip_start_date <= pm.month_end
  AND t.status != 'cancelled';

-- =====================================================
-- 3. MONTHLY BREAKDOWN BY WEEKS
-- =====================================================
SELECT
  EXTRACT(WEEK FROM t.trip_start_date) - EXTRACT(WEEK FROM DATE_TRUNC('month', t.trip_start_date)) + 1 AS week_of_month,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS fuel_consumed,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses
FROM trips t
WHERE t.trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND t.trip_start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  AND t.status != 'cancelled'
GROUP BY week_of_month
ORDER BY week_of_month;

-- =====================================================
-- 4. YEARLY COMPARISON REPORT
-- =====================================================
SELECT
  'current_year' AS period,
  EXTRACT(YEAR FROM CURRENT_DATE) AS year,
  COUNT(DISTINCT t.vehicle_id) AS active_vehicles,
  COUNT(DISTINCT t.driver_id) AS active_drivers,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(t.net_profit), 0) AS net_profit,
  COALESCE(AVG(t.total_km), 0) AS avg_trip_distance
FROM trips t
WHERE EXTRACT(YEAR FROM t.trip_start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND t.status != 'cancelled'

UNION ALL

SELECT
  'previous_year' AS period,
  EXTRACT(YEAR FROM CURRENT_DATE) - 1 AS year,
  COUNT(DISTINCT t.vehicle_id) AS active_vehicles,
  COUNT(DISTINCT t.driver_id) AS active_drivers,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(t.net_profit), 0) AS net_profit,
  COALESCE(AVG(t.total_km), 0) AS avg_trip_distance
FROM trips t
WHERE EXTRACT(YEAR FROM t.trip_start_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
  AND t.status != 'cancelled';

-- =====================================================
-- 5. YEARLY BREAKDOWN BY MONTHS
-- =====================================================
SELECT
  EXTRACT(MONTH FROM t.trip_start_date) AS month_number,
  TO_CHAR(t.trip_start_date, 'Month') AS month_name,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS fuel_consumed,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(t.net_profit), 0) AS net_profit
FROM trips t
WHERE EXTRACT(YEAR FROM t.trip_start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND t.status != 'cancelled'
GROUP BY month_number, month_name
ORDER BY month_number;

-- =====================================================
-- 6. TRIP SUMMARY REPORT (with date range parameters)
-- =====================================================
-- Usage: Replace :start_date and :end_date with actual dates
SELECT
  t.id,
  t.trip_serial_number,
  v.registration_number AS vehicle,
  v.model AS vehicle_model,
  d.name AS driver,
  d.phone AS driver_phone,
  t.destination AS start_location,
  t.destination AS end_location,
  t.total_km AS distance,
  EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/60 AS duration_minutes,
  t.trip_start_date AS start_time,
  t.trip_end_date AS end_time,
  COALESCE(t.fuel_quantity, 0) AS fuel_consumed,
  COALESCE(t.total_fuel_cost, 0) AS fuel_cost,
  COALESCE(t.total_expenses, 0) AS total_expenses,
  COALESCE(t.income_amount, 0) AS income,
  COALESCE(t.net_profit, 0) AS profit,
  t.status,
  t.material_type,
  t.material_quantity
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
LEFT JOIN drivers d ON t.driver_id = d.id
WHERE t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
ORDER BY t.trip_start_date DESC;

-- =====================================================
-- 7. TRIP SUMMARY STATISTICS
-- =====================================================
SELECT
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(AVG(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/60), 0) AS avg_duration_minutes,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS avg_fuel_efficiency,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600), 0) AS total_active_hours,
  CASE
    WHEN SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600) > 0
    THEN SUM(t.total_km)::decimal / SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600)
    ELSE 0
  END AS avg_speed
FROM trips t
WHERE t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled';

-- =====================================================
-- 8. MOST USED VEHICLE AND TOP DRIVER
-- =====================================================
WITH vehicle_usage AS (
  SELECT
    v.registration_number,
    COUNT(t.id) AS trip_count
  FROM trips t
  LEFT JOIN vehicles v ON t.vehicle_id = v.id
  WHERE t.trip_start_date >= :start_date::timestamptz
    AND t.trip_start_date <= :end_date::timestamptz
    AND t.status != 'cancelled'
  GROUP BY v.registration_number
  ORDER BY trip_count DESC
  LIMIT 1
),
driver_usage AS (
  SELECT
    d.name AS driver_name,
    COUNT(t.id) AS trip_count
  FROM trips t
  LEFT JOIN drivers d ON t.driver_id = d.id
  WHERE t.trip_start_date >= :start_date::timestamptz
    AND t.trip_start_date <= :end_date::timestamptz
    AND t.status != 'cancelled'
  GROUP BY d.name
  ORDER BY trip_count DESC
  LIMIT 1
)
SELECT
  (SELECT registration_number FROM vehicle_usage) AS most_used_vehicle,
  (SELECT driver_name FROM driver_usage) AS top_driver;

-- =====================================================
-- 9. VEHICLE UTILIZATION REPORT
-- =====================================================
SELECT
  v.id,
  v.registration_number AS number,
  v.model,
  v.status,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600), 0) AS active_hours,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS fuel_efficiency,
  CASE
    WHEN SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600) > 0
    THEN SUM(t.total_km)::decimal / SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600)
    ELSE 0
  END AS avg_speed,
  CASE
    WHEN COUNT(t.id) > 0
    THEN LEAST((COUNT(t.id)::decimal / 30) * 100, 100)
    ELSE 0
  END AS utilization_percentage,
  MAX(t.trip_start_date) AS last_trip_date
FROM vehicles v
LEFT JOIN trips t ON v.id = t.vehicle_id
  AND t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
WHERE v.status = 'active'
GROUP BY v.id, v.registration_number, v.model, v.status
ORDER BY total_trips DESC;

-- =====================================================
-- 10. VEHICLE UTILIZATION SUMMARY
-- =====================================================
WITH utilization_data AS (
  SELECT
    v.id,
    CASE
      WHEN COUNT(t.id) > 0
      THEN LEAST((COUNT(t.id)::decimal / 30) * 100, 100)
      ELSE 0
    END AS utilization_percentage
  FROM vehicles v
  LEFT JOIN trips t ON v.id = t.vehicle_id
    AND t.trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND t.status != 'cancelled'
  WHERE v.status = 'active'
  GROUP BY v.id
)
SELECT
  COUNT(CASE WHEN utilization_percentage >= 80 THEN 1 END) AS high_utilization,
  COUNT(CASE WHEN utilization_percentage >= 50 AND utilization_percentage < 80 THEN 1 END) AS medium_utilization,
  COUNT(CASE WHEN utilization_percentage < 50 THEN 1 END) AS low_utilization,
  COALESCE(AVG(utilization_percentage), 0) AS avg_utilization
FROM utilization_data;

-- =====================================================
-- 11. DRIVER PERFORMANCE REPORT
-- =====================================================
SELECT
  d.id,
  d.name,
  d.phone,
  d.license_number,
  COUNT(t.id) AS trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS fuel_efficiency,
  CASE
    WHEN SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600) > 0
    THEN SUM(t.total_km)::decimal / SUM(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date))/3600)
    ELSE 0
  END AS avg_speed,
  -- Safety score (placeholder - can be enhanced with actual violation data)
  CASE
    WHEN COUNT(t.id) > 0
    THEN LEAST(10, 8 + (COUNT(t.id)::decimal / 10))
    ELSE 8
  END AS safety_score,
  -- Punctuality score (placeholder - can be enhanced with actual on-time data)
  90 + (RANDOM() * 10)::int AS punctuality,
  -- Overall rating based on multiple factors
  CASE
    WHEN COUNT(t.id) > 0
    THEN LEAST(5, 3 + (COUNT(t.id)::decimal / 20))
    ELSE 3
  END AS rating,
  0 AS violations,  -- Placeholder - connect to violations table if exists
  MAX(t.trip_start_date) AS last_trip_date
FROM drivers d
LEFT JOIN trips t ON d.id = t.driver_id
  AND t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
WHERE d.status = 'active'
GROUP BY d.id, d.name, d.phone, d.license_number
ORDER BY trips DESC, fuel_efficiency DESC;

-- =====================================================
-- 12. DRIVER PERFORMANCE METRICS
-- =====================================================
SELECT
  COUNT(DISTINCT d.id) AS total_drivers,
  COALESCE(AVG(performance.rating), 0) AS avg_rating,
  COALESCE(AVG(performance.safety_score), 0) AS avg_safety_score,
  COALESCE(AVG(performance.fuel_efficiency), 0) AS avg_fuel_efficiency,
  COALESCE(SUM(performance.trips), 0) AS total_trips
FROM drivers d
LEFT JOIN LATERAL (
  SELECT
    COUNT(t.id) AS trips,
    CASE
      WHEN SUM(t.fuel_quantity) > 0
      THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
      ELSE 0
    END AS fuel_efficiency,
    CASE
      WHEN COUNT(t.id) > 0
      THEN LEAST(10, 8 + (COUNT(t.id)::decimal / 10))
      ELSE 8
    END AS safety_score,
    CASE
      WHEN COUNT(t.id) > 0
      THEN LEAST(5, 3 + (COUNT(t.id)::decimal / 20))
      ELSE 3
    END AS rating
  FROM trips t
  WHERE t.driver_id = d.id
    AND t.trip_start_date >= :start_date::timestamptz
    AND t.trip_start_date <= :end_date::timestamptz
    AND t.status != 'cancelled'
) performance ON true
WHERE d.status = 'active';

-- =====================================================
-- 13. EXPENSE REPORT
-- =====================================================
SELECT
  DATE_TRUNC('day', t.trip_start_date)::date AS expense_date,
  COUNT(t.id) AS number_of_trips,
  -- Fuel expenses
  COALESCE(SUM(t.total_fuel_cost), 0) AS fuel_expenses,
  -- Other trip expenses
  COALESCE(SUM(t.driver_allowance), 0) AS driver_allowance,
  COALESCE(SUM(t.toll_expenses), 0) AS toll_expenses,
  COALESCE(SUM(t.other_expenses), 0) AS other_expenses,
  COALESCE(SUM(t.trip_expenses), 0) AS trip_expenses,
  -- Total expenses
  COALESCE(SUM(t.total_expenses), 0) AS total_trip_expenses,
  -- Maintenance expenses (from maintenance_tasks)
  0 AS maintenance_expenses,  -- Will be calculated separately
  -- Income
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  -- Profit/Loss
  COALESCE(SUM(t.net_profit), 0) AS net_profit
FROM trips t
WHERE t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
GROUP BY DATE_TRUNC('day', t.trip_start_date)
ORDER BY expense_date DESC;

-- =====================================================
-- 14. EXPENSE SUMMARY
-- =====================================================
SELECT
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(SUM(t.driver_allowance), 0) AS total_driver_allowance,
  COALESCE(SUM(t.toll_expenses), 0) AS total_toll_expenses,
  COALESCE(SUM(t.other_expenses), 0) AS total_other_expenses,
  COALESCE(SUM(t.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(t.income_amount), 0) AS total_income,
  COALESCE(SUM(t.net_profit), 0) AS net_profit,
  COUNT(t.id) AS total_trips
FROM trips t
WHERE t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled';

-- =====================================================
-- 15. EXPENSE BY CATEGORY
-- =====================================================
SELECT
  'Fuel' AS category,
  COALESCE(SUM(total_fuel_cost), 0) AS amount,
  (COALESCE(SUM(total_fuel_cost), 0) * 100.0 / NULLIF(
    (SELECT SUM(total_expenses) FROM trips
     WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date
     AND status != 'cancelled'), 0
  ))::decimal(5,2) AS percentage
FROM trips
WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date AND status != 'cancelled'

UNION ALL

SELECT
  'Driver Allowance' AS category,
  COALESCE(SUM(driver_allowance), 0) AS amount,
  (COALESCE(SUM(driver_allowance), 0) * 100.0 / NULLIF(
    (SELECT SUM(total_expenses) FROM trips
     WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date
     AND status != 'cancelled'), 0
  ))::decimal(5,2) AS percentage
FROM trips
WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date AND status != 'cancelled'

UNION ALL

SELECT
  'Toll' AS category,
  COALESCE(SUM(toll_expenses), 0) AS amount,
  (COALESCE(SUM(toll_expenses), 0) * 100.0 / NULLIF(
    (SELECT SUM(total_expenses) FROM trips
     WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date
     AND status != 'cancelled'), 0
  ))::decimal(5,2) AS percentage
FROM trips
WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date AND status != 'cancelled'

UNION ALL

SELECT
  'Other' AS category,
  COALESCE(SUM(other_expenses), 0) AS amount,
  (COALESCE(SUM(other_expenses), 0) * 100.0 / NULLIF(
    (SELECT SUM(total_expenses) FROM trips
     WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date
     AND status != 'cancelled'), 0
  ))::decimal(5,2) AS percentage
FROM trips
WHERE trip_start_date >= :start_date AND trip_start_date <= :end_date AND status != 'cancelled';

-- =====================================================
-- 16. FUEL ANALYSIS REPORT
-- =====================================================
SELECT
  DATE_TRUNC('day', t.trip_start_date)::date AS date,
  v.registration_number AS vehicle,
  v.model AS vehicle_model,
  v.fuel_type,
  COUNT(t.id) AS number_of_trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  COALESCE(AVG(t.fuel_rate_per_liter), 0) AS avg_fuel_rate,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS fuel_efficiency,
  CASE
    WHEN SUM(t.total_km) > 0
    THEN SUM(t.total_fuel_cost)::decimal / SUM(t.total_km)
    ELSE 0
  END AS cost_per_km
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
  AND t.fuel_quantity > 0
GROUP BY DATE_TRUNC('day', t.trip_start_date), v.registration_number, v.model, v.fuel_type
ORDER BY date DESC, total_fuel_consumed DESC;

-- =====================================================
-- 17. FUEL ANALYSIS BY VEHICLE
-- =====================================================
SELECT
  v.id,
  v.registration_number,
  v.model,
  v.fuel_type,
  COUNT(t.id) AS trips,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(AVG(t.fuel_rate_per_liter), 0) AS avg_fuel_rate,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS fuel_efficiency,
  CASE
    WHEN SUM(t.total_km) > 0
    THEN SUM(t.total_fuel_cost)::decimal / SUM(t.total_km)
    ELSE 0
  END AS cost_per_km,
  -- Fuel efficiency trend (compare to previous period)
  0 AS efficiency_change_percentage  -- Can be calculated with a subquery
FROM vehicles v
LEFT JOIN trips t ON v.id = t.vehicle_id
  AND t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
  AND t.fuel_quantity > 0
WHERE v.status = 'active'
GROUP BY v.id, v.registration_number, v.model, v.fuel_type
HAVING COUNT(t.id) > 0
ORDER BY total_fuel_consumed DESC;

-- =====================================================
-- 18. FUEL ANALYSIS SUMMARY
-- =====================================================
SELECT
  COUNT(DISTINCT v.id) AS total_vehicles,
  COUNT(t.id) AS total_refuelings,
  COALESCE(SUM(t.total_km), 0) AS total_distance,
  COALESCE(SUM(t.fuel_quantity), 0) AS total_fuel_consumed,
  COALESCE(SUM(t.total_fuel_cost), 0) AS total_fuel_cost,
  COALESCE(AVG(t.fuel_rate_per_liter), 0) AS avg_fuel_rate,
  CASE
    WHEN SUM(t.fuel_quantity) > 0
    THEN SUM(t.total_km)::decimal / SUM(t.fuel_quantity)
    ELSE 0
  END AS fleet_avg_efficiency,
  CASE
    WHEN SUM(t.total_km) > 0
    THEN SUM(t.total_fuel_cost)::decimal / SUM(t.total_km)
    ELSE 0
  END AS avg_cost_per_km
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.trip_start_date >= :start_date::timestamptz
  AND t.trip_start_date <= :end_date::timestamptz
  AND t.status != 'cancelled'
  AND t.fuel_quantity > 0;

-- =====================================================
-- 19. COMPLIANCE REPORT - Vehicle Documents
-- =====================================================
SELECT
  v.id AS vehicle_id,
  v.registration_number,
  v.model,
  v.status,
  -- Insurance compliance
  v.insurance_expiry,
  CASE
    WHEN v.insurance_expiry IS NULL THEN 'Missing'
    WHEN v.insurance_expiry < CURRENT_DATE THEN 'Expired'
    WHEN v.insurance_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS insurance_status,
  -- Pollution compliance
  v.pollution_expiry,
  CASE
    WHEN v.pollution_expiry IS NULL THEN 'Missing'
    WHEN v.pollution_expiry < CURRENT_DATE THEN 'Expired'
    WHEN v.pollution_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS pollution_status,
  -- Fitness compliance
  v.fitness_expiry,
  CASE
    WHEN v.fitness_expiry IS NULL THEN 'Missing'
    WHEN v.fitness_expiry < CURRENT_DATE THEN 'Expired'
    WHEN v.fitness_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS fitness_status,
  -- Permit compliance
  v.permit_expiry,
  CASE
    WHEN v.permit_expiry IS NULL THEN 'Missing'
    WHEN v.permit_expiry < CURRENT_DATE THEN 'Expired'
    WHEN v.permit_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS permit_status,
  -- Tax compliance
  v.tax_expiry,
  CASE
    WHEN v.tax_expiry IS NULL THEN 'Missing'
    WHEN v.tax_expiry < CURRENT_DATE THEN 'Expired'
    WHEN v.tax_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS tax_status,
  -- Overall compliance score
  CASE
    WHEN (
      (CASE WHEN v.insurance_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.pollution_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.fitness_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.permit_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.tax_expiry >= CURRENT_DATE THEN 1 ELSE 0 END)
    ) = 5 THEN 'Fully Compliant'
    WHEN (
      (CASE WHEN v.insurance_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.pollution_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.fitness_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.permit_expiry >= CURRENT_DATE THEN 1 ELSE 0 END) +
      (CASE WHEN v.tax_expiry >= CURRENT_DATE THEN 1 ELSE 0 END)
    ) >= 3 THEN 'Partially Compliant'
    ELSE 'Non-Compliant'
  END AS overall_compliance
FROM vehicles v
WHERE v.status = 'active'
ORDER BY
  CASE
    WHEN v.insurance_expiry < CURRENT_DATE OR v.pollution_expiry < CURRENT_DATE OR
         v.fitness_expiry < CURRENT_DATE OR v.permit_expiry < CURRENT_DATE OR
         v.tax_expiry < CURRENT_DATE THEN 1
    ELSE 2
  END,
  v.registration_number;

-- =====================================================
-- 20. COMPLIANCE REPORT - Driver Documents
-- =====================================================
SELECT
  d.id AS driver_id,
  d.name,
  d.phone,
  d.status,
  -- License compliance
  d.license_expiry,
  CASE
    WHEN d.license_expiry IS NULL THEN 'Missing'
    WHEN d.license_expiry < CURRENT_DATE THEN 'Expired'
    WHEN d.license_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS license_status,
  -- Medical certificate compliance
  d.medical_certificate_expiry,
  CASE
    WHEN d.medical_certificate_expiry IS NULL THEN 'Missing'
    WHEN d.medical_certificate_expiry < CURRENT_DATE THEN 'Expired'
    WHEN d.medical_certificate_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS medical_status,
  -- Overall compliance
  CASE
    WHEN d.license_expiry >= CURRENT_DATE AND d.medical_certificate_expiry >= CURRENT_DATE
    THEN 'Compliant'
    ELSE 'Non-Compliant'
  END AS overall_compliance
FROM drivers d
WHERE d.status = 'active'
ORDER BY
  CASE
    WHEN d.license_expiry < CURRENT_DATE OR d.medical_certificate_expiry < CURRENT_DATE THEN 1
    ELSE 2
  END,
  d.name;

-- =====================================================
-- 21. COMPLIANCE SUMMARY
-- =====================================================
SELECT
  -- Vehicle compliance stats
  (SELECT COUNT(*) FROM vehicles WHERE status = 'active') AS total_vehicles,
  (SELECT COUNT(*) FROM vehicles WHERE status = 'active' AND insurance_expiry >= CURRENT_DATE) AS vehicles_insurance_valid,
  (SELECT COUNT(*) FROM vehicles WHERE status = 'active' AND insurance_expiry < CURRENT_DATE) AS vehicles_insurance_expired,
  (SELECT COUNT(*) FROM vehicles WHERE status = 'active' AND pollution_expiry >= CURRENT_DATE) AS vehicles_pollution_valid,
  (SELECT COUNT(*) FROM vehicles WHERE status = 'active' AND fitness_expiry >= CURRENT_DATE) AS vehicles_fitness_valid,
  -- Driver compliance stats
  (SELECT COUNT(*) FROM drivers WHERE status = 'active') AS total_drivers,
  (SELECT COUNT(*) FROM drivers WHERE status = 'active' AND license_expiry >= CURRENT_DATE) AS drivers_license_valid,
  (SELECT COUNT(*) FROM drivers WHERE status = 'active' AND license_expiry < CURRENT_DATE) AS drivers_license_expired,
  (SELECT COUNT(*) FROM drivers WHERE status = 'active' AND medical_certificate_expiry >= CURRENT_DATE) AS drivers_medical_valid,
  -- Overall compliance percentage
  (
    (SELECT COUNT(*) FROM vehicles WHERE status = 'active' AND
      insurance_expiry >= CURRENT_DATE AND pollution_expiry >= CURRENT_DATE AND
      fitness_expiry >= CURRENT_DATE AND permit_expiry >= CURRENT_DATE AND
      tax_expiry >= CURRENT_DATE)::decimal /
    NULLIF((SELECT COUNT(*) FROM vehicles WHERE status = 'active'), 0) * 100
  )::decimal(5,2) AS vehicle_compliance_percentage,
  (
    (SELECT COUNT(*) FROM drivers WHERE status = 'active' AND
      license_expiry >= CURRENT_DATE AND medical_certificate_expiry >= CURRENT_DATE)::decimal /
    NULLIF((SELECT COUNT(*) FROM drivers WHERE status = 'active'), 0) * 100
  )::decimal(5,2) AS driver_compliance_percentage;

-- =====================================================
-- 22. MAINTENANCE EXPENSES (for Expense Report)
-- =====================================================
SELECT
  DATE_TRUNC('day', mt.scheduled_date)::date AS expense_date,
  v.registration_number AS vehicle,
  mt.task_type,
  mt.description,
  COALESCE(mt.cost, 0) AS cost,
  mt.vendor,
  mt.status
FROM maintenance_tasks mt
LEFT JOIN vehicles v ON mt.vehicle_id = v.id
WHERE mt.scheduled_date >= :start_date::date
  AND mt.scheduled_date <= :end_date::date
  AND mt.status IN ('completed', 'in_progress')
ORDER BY mt.scheduled_date DESC;

-- =====================================================
-- End of Report Queries
-- =====================================================
