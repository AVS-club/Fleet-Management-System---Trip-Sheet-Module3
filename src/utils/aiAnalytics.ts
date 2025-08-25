import { Trip, RouteAnalysis, Alert, AIAlert, MaintenanceTask } from "../types";
import { supabase } from "./supabaseClient";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { handleSupabaseError } from "./errors";

/**
 * Check for mileage anomalies in a trip based on historical vehicle data
 * @param trip The trip to analyze
 * @returns An alert object if an anomaly is detected, or null if no anomaly
 */
const checkMileageAnomaly = async (trip: Trip): Promise<AIAlert | null> => {
  // Skip trips without refueling or fuel quantity
  if (!trip.refueling_done || !trip.fuel_quantity || trip.fuel_quantity <= 0) {
    return null;
  }

  const distance = trip.end_km - trip.start_km;

  // Skip if distance is invalid
  if (distance <= 0) {
    return null;
  }

  // Calculate current trip mileage
  const currentMileage = distance / trip.fuel_quantity;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Error fetching user data");
      return null;
    }
    // Get all trips for this vehicle with valid mileage data
    const { data: vehicleTrips, error } = await supabase
      .from("trips")
      .select("*")
      .eq("added_by", user.id)
      .eq("vehicle_id", trip.vehicle_id)
      .eq("refueling_done", true)
      .not("fuel_quantity", "is", null)
      .not("calculated_kmpl", "is", null)
      .order("trip_end_date", { ascending: false });

    if (error) {
      handleSupabaseError('fetch vehicle trips for mileage analysis', error);
      return null;
    }

    // We need at least 10 trips for a good baseline, otherwise skip alert
    if (!vehicleTrips || vehicleTrips.length < 10) {
      return null;
    }

    // Remove current trip from array if it's there
    const previousTrips = vehicleTrips.filter((t) => t.id !== trip.id);

    // Get the 10 most recent trips for baseline
    const recentTrips = previousTrips.slice(0, 10);

    // Calculate average mileage from these trips
    const baselineMileage =
      recentTrips.reduce((sum, t) => sum + (t.calculated_kmpl || 0), 0) /
      recentTrips.length;

    // Calculate percentage deviation
    const deviation =
      ((currentMileage - baselineMileage) / baselineMileage) * 100;

    // Only trigger alert if deviation is ≥15% (positive or negative)
    if (Math.abs(deviation) >= 15) {
      const alertData: Omit<AIAlert, "id" | "updated_at"> = {
        alert_type: "fuel_anomaly",
        severity: Math.abs(deviation) > 25 ? "high" : "medium",
        status: "pending",
        title: `Fuel anomaly detected: ${currentMileage.toFixed(2)} km/L (${
          deviation > 0 ? "+" : ""
        }${deviation.toFixed(1)}%)`,
        description: `Trip ${
          trip.trip_serial_number
        } recorded ${currentMileage.toFixed(2)} km/L, which is ${
          deviation > 0 ? "higher" : "lower"
        } than the vehicle's average of ${baselineMileage.toFixed(
          2
        )} km/L. This represents a ${Math.abs(deviation).toFixed(
          1
        )}% deviation.`,
        affected_entity: {
          type: "vehicle",
          id: trip.vehicle_id,
        },
        metadata: {
          trip_id: trip.id,
          driver_id: trip.driver_id,
          expected_value: baselineMileage,
          actual_value: currentMileage,
          deviation: deviation,
          distance: distance,
          fuel_quantity: trip.fuel_quantity,
          baseline_mileage: baselineMileage,
          sample_size: recentTrips.length,
          recommendations:
            deviation > 0
              ? [
                  "Verify odometer readings and fuel quantity data",
                  "Check for data entry errors in fuel quantity",
                  "Verify that refueling was complete (tank full to tank full)",
                ]
              : [
                  "Check for vehicle mechanical issues",
                  "Investigate driving patterns or terrain factors",
                  "Verify fuel quality or potential fuel theft",
                ],
        },
        created_at: new Date().toISOString(),
      };

      try {
        // Insert the alert into Supabase
        const { data, error } = await supabase
          .from("ai_alerts")
          .insert(alertData)
          .select()
          .single();

        if (error) {
          handleSupabaseError('create mileage anomaly alert', error);
          return null;
        }

        return data;
      } catch (error) {
        handleSupabaseError('create mileage anomaly alert', error);
        return null;
      }
    }
  } catch (error) {
    handleSupabaseError('analyze mileage', error);
  }

  return null;
};

/**
 * Check for route deviations in a trip
 * @param trip The trip to analyze
 * @returns An alert if deviation is above threshold, or null if within acceptable range
 */
const checkRouteDeviation = async (trip: Trip): Promise<AIAlert | null> => {
  // Skip trips without route_deviation data
  if (
    trip.route_deviation === undefined ||
    trip.route_deviation === null
  ) {
    return null;
  }

  const ROUTE_DEVIATION_THRESHOLD = 20; // 20% above standard route (120% of estimated)

  if (trip.route_deviation > ROUTE_DEVIATION_THRESHOLD) {
    const alertData: Omit<AIAlert, "id" | "updated_at"> = {
      alert_type: "route_deviation",
      severity: trip.route_deviation > 35 ? "high" : "medium",
      status: "pending",
      title: `Route deviation detected: ${trip.route_deviation.toFixed(1)}%`,
      description: `Trip ${
        trip.trip_serial_number
      } took a route ${trip.route_deviation.toFixed(
        1
      )}% longer than the standard route. This may indicate unauthorized detours, traffic diversions, or navigation issues.`,
      affected_entity: {
        type: "vehicle",
        id: trip.vehicle_id,
      },
      metadata: {
        trip_id: trip.id,
        driver_id: trip.driver_id,
        expected_value: 100, // base route = 100%
        actual_value: 100 + trip.route_deviation,
        deviation: trip.route_deviation,
        distance: trip.end_km - trip.start_km,
        recommendations: [
          "Review trip GPS data if available",
          "Check with driver about route changes",
          "Verify if there were road closures or traffic incidents",
          "Consider updating standard route if conditions have changed",
        ],
      },
      created_at: new Date().toISOString(),
    };

    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from("ai_alerts")
        .insert(alertData)
        .select()
        .single();

      if (error) {
        handleSupabaseError('create route deviation alert', error);
        return null;
      }

      return data;
    } catch (error) {
      handleSupabaseError('create route deviation alert', error);
      return null;
    }
  }

  return null;
};

/**
 * Check for frequent maintenance on a vehicle within a calendar month
 * @param task The maintenance task to analyze
 * @param allTasks All maintenance tasks for context
 * @returns An alert if frequent maintenance is detected, or null otherwise
 */
const checkFrequentMaintenance = async (
  task: MaintenanceTask,
  allTasks: MaintenanceTask[]
): Promise<AIAlert | null> => {
  const MAINTENANCE_COUNT_THRESHOLD = 3;

  // Get the month and year of the task
  const taskDate = new Date(task.start_date);
  const monthYear = format(taskDate, "yyyy-MM"); // Format: "2024-06"
  const monthStart = startOfMonth(taskDate);
  const monthEnd = endOfMonth(taskDate);

  // Get tasks for this vehicle in the same month
  const monthlyTasks = allTasks.filter((t) => {
    if (t.vehicle_id !== task.vehicle_id) return false;

    const otherTaskDate = new Date(t.start_date);
    return isWithinInterval(otherTaskDate, {
      start: monthStart,
      end: monthEnd,
    });
  });

  // If we have 3 or more tasks in the month, check if we already created an alert
  if (monthlyTasks.length >= MAINTENANCE_COUNT_THRESHOLD) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Error fetching user data");
      return null;
    }
    // Check if we already created an alert for this vehicle and month
    const { data: existingAlerts, error } = await supabase
      .from("ai_alerts")
      .select("*")
      .eq("added_by", user.id)
      .eq("alert_type", "frequent_maintenance")
      .eq("affected_entity->>id", task.vehicle_id) // Query into the JSONB field
      .eq("affected_entity->>type", "vehicle")
      .eq("metadata->>month_of_alert", monthYear)
      .limit(1);

    if (error) {
      handleSupabaseError('check existing maintenance alerts', error);
    }

    // If an alert already exists for this month, don't create another one
    if (existingAlerts && existingAlerts.length > 0) {
      return null;
    }

    const alertData: Omit<AIAlert, "id" | "updated_at"> = {
      alert_type: "frequent_maintenance",
      severity: monthlyTasks.length >= 4 ? "high" : "medium",
      status: "pending",
      title: `${monthlyTasks.length} maintenance tasks within one month`,
      description: `Vehicle has had ${
        monthlyTasks.length
      } maintenance tasks in ${format(
        taskDate,
        "MMMM yyyy"
      )}. This may indicate recurring issues or ineffective repairs.`,
      affected_entity: {
        type: "vehicle",
        id: task.vehicle_id,
      },
      metadata: {
        task_id: task.id,
        expected_value: 2, // Expected fewer than 3 tasks per month
        actual_value: monthlyTasks.length,
        deviation: ((monthlyTasks.length - 2) / 2) * 100, // Percentage above expected
        maintenance_ids: monthlyTasks.map((t) => t.id),
        month_of_alert: monthYear,
        maintenance_count: monthlyTasks.length,
        recommendations: [
          "Review maintenance history in detail",
          "Consider a comprehensive vehicle inspection",
          "Evaluate repair quality from previous services",
          "Check for pattern of similar issues",
        ],
      },
      created_at: new Date().toISOString(),
    };

    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from("ai_alerts")
        .insert(alertData)
        .select()
        .single();

      if (error) {
        handleSupabaseError('create frequent maintenance alert', error);
        return null;
      }

      return data;
    } catch (error) {
      handleSupabaseError('create frequent maintenance alert', error);
      return null;
    }
  }

  return null;
};

// Fetch AI alerts from Supabase
export const getAIAlerts = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return [];
  }
  const { data, error } = await supabase
    .from("ai_alerts")
    .select("*")
    .eq("added_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError('fetch AI alerts', error);
    return [];
  }

  return data || [];
};

// Generate alerts for a trip
export const analyzeTripAndGenerateAlerts = async (
  trip: Trip,
  analysis: RouteAnalysis | undefined,
  allTrips: Trip[]
): Promise<Alert[]> => {
  const alerts: Alert[] = [];

  // Check for route deviation alerts
  if (analysis && Math.abs(analysis.deviation) > 20) {
    alerts.push({
      type: "route_deviation",
      message: `Route deviation of ${analysis.deviation.toFixed(1)}%`,
      severity: Math.abs(analysis.deviation) > 35 ? "high" : "medium",
      details: `Trip took ${Math.abs(analysis.deviation).toFixed(1)}% ${
        analysis.deviation > 0 ? "more" : "less"
      } distance than expected.`,
    });
  }

  // Run mileage anomaly check
  await checkMileageAnomaly(trip);

  // Run route deviation check
  await checkRouteDeviation(trip);

  return alerts;
};

// Run AI check to generate alerts
export const runAlertScan = async (): Promise<number> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return 0;
  }
  let alertCount = 0;

  try {
    // 1. Fetch necessary data
    const { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select("*")
      .eq("added_by", user.id)
      .order("trip_end_date", { ascending: false })
      .limit(100); // Get the 100 most recent trips

    if (tripsError) {
      handleSupabaseError('fetch trips for alert scan', tripsError);
      return 0;
    }

    // Fetch maintenance tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("maintenance_tasks")
      .select("*")
      .eq("added_by", user.id)
      .order("start_date", { ascending: false })
      .limit(50); // Get the 50 most recent maintenance tasks

    if (tasksError) {
      handleSupabaseError('fetch maintenance tasks for alert scan', tasksError);
    }

    const trips = tripsData || [];
    const tasks = tasksData || [];

    // 2. Analyze trips for anomalies
    for (const trip of trips) {
      const mileageAlert = await checkMileageAnomaly(trip);
      if (mileageAlert) alertCount++;

      const routeAlert = await checkRouteDeviation(trip);
      if (routeAlert) alertCount++;
    }

    // 3. Analyze maintenance tasks
    for (const task of tasks) {
      const frequentMaintenanceAlert = await checkFrequentMaintenance(
        task,
        tasks
      );
      if (frequentMaintenanceAlert) alertCount++;
    }

    return alertCount;
  } catch (error) {
    handleSupabaseError('run alert scan', error);
    return 0;
  }
};

// Process alert actions (accept/deny/ignore)
export const processAlertAction = async (
  alertId: string,
  action: "accept" | "deny" | "ignore",
  reason?: string,
  duration?: "week" | "permanent"
) => {
  const status =
    action === "accept" ? "accepted" : action === "deny" ? "denied" : "ignored";

  const { error } = await supabase
    .from("ai_alerts")
    .update({
      status,
      metadata: supabase.rpc("jsonb_deep_set", {
        json_object: supabase.rpc("jsonb_deep_set", {
          json_object: supabase.rpc("jsonb_deep_set", {
            json_object: supabase.rpc("jsonb_deep_set", {
              json_object: "metadata",
              path: ["resolution_reason"],
              value: reason,
            }),
            path: ["resolution_comment"],
            value: reason,
          }),
          path: ["ignore_duration"],
          value: duration,
        }),
        path: ["resolved_at"],
        value: new Date().toISOString(),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) {
    handleSupabaseError('process alert action', error);
    throw new Error(`Failed to process alert action: ${error.message}`);
  }
};