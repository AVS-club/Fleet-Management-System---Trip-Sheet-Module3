@@ .. @@
BEGIN
  RETURN QUERY
  SELECT 
-    COALESCE(SUM(t.fuel_amount), 0) as total_fuel_amount,
+    COALESCE(SUM(t.total_fuel_cost), 0) as total_fuel_amount,
     COALESCE(SUM(t.fuel_quantity), 0) as total_liters,
     COUNT(*)::INTEGER as trips_covered
   FROM trips t
   JOIN vehicles v ON t.vehicle_id = v.id
   WHERE v.registration_number = reg_no
     AND t.trip_start_date >= date_from
     AND t.trip_start_date <= date_to
-    AND t.fuel_amount IS NOT NULL
-    AND t.fuel_amount > 0;
+    AND t.total_fuel_cost IS NOT NULL
+    AND t.total_fuel_cost > 0;