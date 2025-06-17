import { Trip, RouteAnalysis, Alert, AIAlert, MaintenanceTask } from '../types';
import { supabase } from './supabaseClient';
import { subDays, isWithinInterval } from 'date-fns';

// Mileage anomaly detection thresholds
const MAX_ALLOWED_MILEAGE = 30; // km/L - suspiciously high mileage
const MIN_ALLOWED_MILEAGE = 4;  // km/L - suspiciously low mileage

/**
 * Check for mileage anomalies in a trip
 * @param trip The trip to analyze
 * @returns An alert object if an anomaly is detected, or null if no anomaly
 */
export const checkMileageAnomaly = async (trip: Trip): Promise<AIAlert | null> => {
  // Skip trips without refueling or fuel quantity
  if (!trip.refueling_done || !trip.fuel_quantity || trip.fuel_quantity <= 0) {
    return null;
  }

  // Skip short/local trips as they often have unusual mileage patterns
  if (trip.short_trip) {
    return null;
  }

  const distance = trip.end_km - trip.start_km;
  
  // Skip if distance is invalid
  if (distance <= 0) {
    return null;
  }

  const mileage = distance / trip.fuel_quantity;

  // Check if mileage is outside acceptable range
  if (mileage > MAX_ALLOWED_MILEAGE || mileage < MIN_ALLOWED_MILEAGE) {
    const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
      alert_type: 'fuel_anomaly',
      severity: mileage > MAX_ALLOWED_MILEAGE ? 'medium' : 'high',
      status: 'pending',
      title: `Unusual mileage detected: ${mileage.toFixed(2)} km/L`,
      description: `Trip ${trip.trip_serial_number} recorded ${mileage.toFixed(2)} km/L, which is ${
        mileage > MAX_ALLOWED_MILEAGE ? 'higher than expected' : 'lower than expected'
      }. This might indicate ${
        mileage > MAX_ALLOWED_MILEAGE ? 
          'fuel leakage, data entry error, or gauge malfunction.' : 
          'vehicle issues, driving style concerns, or fuel theft.'
      }`,
      affected_entity: {
        type: 'vehicle',
        id: trip.vehicle_id
      },
      metadata: {
        trip_id: trip.id,
        driver_id: trip.driver_id,
        expected_value: mileage > MAX_ALLOWED_MILEAGE ? MAX_ALLOWED_MILEAGE : MIN_ALLOWED_MILEAGE,
        actual_value: mileage,
        deviation: mileage > MAX_ALLOWED_MILEAGE ? 
          ((mileage - MAX_ALLOWED_MILEAGE) / MAX_ALLOWED_MILEAGE * 100) : 
          ((MIN_ALLOWED_MILEAGE - mileage) / MIN_ALLOWED_MILEAGE * 100),
        distance: distance,
        fuel_quantity: trip.fuel_quantity,
        recommendations: [
          mileage > MAX_ALLOWED_MILEAGE ?
            'Verify odometer readings and fuel quantity data' :
            'Check for vehicle mechanical issues',
          'Compare with previous trips for this vehicle',
          'Investigate driver behavior if pattern continues'
        ]
      },
      created_at: new Date().toISOString()
    };

    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from('ai_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating mileage anomaly alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating mileage anomaly alert:', error);
      return null;
    }
  }

  return null;
};

/**
 * Check for route deviations in a trip
 * @param trip The trip to analyze
 * @returns An alert if deviation is above threshold, or null if within acceptable range
 */
export const checkRouteDeviation = async (trip: Trip): Promise<AIAlert | null> => {
  // Skip trips without route_deviation data or short trips
  if (trip.route_deviation === undefined || trip.route_deviation === null || trip.short_trip) {
    return null;
  }
  
  const ROUTE_DEVIATION_THRESHOLD = 8; // 8% above standard route
  
  if (trip.route_deviation > ROUTE_DEVIATION_THRESHOLD) {
    const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
      alert_type: 'route_deviation',
      severity: 'medium',
      status: 'pending',
      title: `Route deviation detected: ${trip.route_deviation.toFixed(1)}%`,
      description: `Trip ${trip.trip_serial_number} took a route ${trip.route_deviation.toFixed(1)}% longer than the standard route. This may indicate unauthorized detours, traffic diversions, or navigation issues.`,
      affected_entity: {
        type: 'vehicle',
        id: trip.vehicle_id
      },
      metadata: {
        trip_id: trip.id,
        driver_id: trip.driver_id,
        expected_value: 100, // base route = 100%
        actual_value: 100 + trip.route_deviation,
        deviation: trip.route_deviation,
        distance: trip.end_km - trip.start_km,
        recommendations: [
          'Review trip GPS data if available',
          'Check with driver about route changes',
          'Verify if there were road closures or traffic incidents',
          'Consider updating standard route if conditions have changed'
        ]
      },
      created_at: new Date().toISOString()
    };
    
    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from('ai_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating route deviation alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating route deviation alert:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Check for low mileage streak (3 or more consecutive trips with low mileage)
 * @param trip The trip to analyze
 * @param allTrips All trips for context
 * @returns An alert if a streak is detected, or null otherwise
 */
export const checkLowMileageStreak = async (trip: Trip, allTrips: Trip[]): Promise<AIAlert | null> => {
  // Skip trips without mileage data or short trips
  if (!trip.calculated_kmpl || trip.short_trip) {
    return null;
  }
  
  const LOW_MILEAGE_THRESHOLD = 6; // km/L
  const STREAK_THRESHOLD = 3; // number of consecutive trips
  
  // Skip if the current trip's mileage is not low
  if (trip.calculated_kmpl >= LOW_MILEAGE_THRESHOLD) {
    return null;
  }
  
  // Get recent trips for this vehicle
  const recentTrips = allTrips
    .filter(t => 
      t.vehicle_id === trip.vehicle_id && 
      !t.short_trip &&
      t.calculated_kmpl !== undefined
    )
    .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());
  
  // Check if we have a streak of low mileage trips (including the current one)
  let streakCount = 0;
  for (let i = 0; i < recentTrips.length && i < 5; i++) { // Check last 5 trips max
    if (recentTrips[i].calculated_kmpl && recentTrips[i].calculated_kmpl < LOW_MILEAGE_THRESHOLD) {
      streakCount++;
    } else {
      break; // Streak broken
    }
  }
  
  if (streakCount >= STREAK_THRESHOLD) {
    const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
      alert_type: 'low_mileage_streak',
      severity: 'medium',
      status: 'pending',
      title: `${streakCount} consecutive trips with low mileage`,
      description: `Vehicle has had ${streakCount} consecutive trips with mileage below ${LOW_MILEAGE_THRESHOLD} km/L. Latest trip: ${trip.calculated_kmpl.toFixed(2)} km/L. This pattern may indicate mechanical issues or inefficient driving.`,
      affected_entity: {
        type: 'vehicle',
        id: trip.vehicle_id
      },
      metadata: {
        trip_id: trip.id,
        driver_id: trip.driver_id,
        expected_value: LOW_MILEAGE_THRESHOLD,
        actual_value: trip.calculated_kmpl,
        deviation: ((LOW_MILEAGE_THRESHOLD - trip.calculated_kmpl) / LOW_MILEAGE_THRESHOLD) * 100,
        streak_count: streakCount,
        recommendations: [
          'Schedule a maintenance check for the vehicle',
          'Review driving patterns and terrain',
          'Check for excessive idling or improper loading',
          'Consider driver training on fuel-efficient driving'
        ]
      },
      created_at: new Date().toISOString()
    };
    
    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from('ai_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating low mileage streak alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating low mileage streak alert:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Check for frequent maintenance on a vehicle
 * @param task The maintenance task to analyze
 * @param allTasks All maintenance tasks for context
 * @returns An alert if frequent maintenance is detected, or null otherwise
 */
export const checkFrequentMaintenance = async (
  task: MaintenanceTask, 
  allTasks: MaintenanceTask[]
): Promise<AIAlert | null> => {
  const MAINTENANCE_WINDOW_DAYS = 30;
  const MAINTENANCE_COUNT_THRESHOLD = 3;
  
  // Get recent tasks for this vehicle
  const recentTasks = allTasks.filter(t => {
    if (t.vehicle_id !== task.vehicle_id) return false;
    
    // Check if task is within 30 days window
    const taskDate = new Date(task.start_date);
    const otherTaskDate = new Date(t.start_date);
    const timeDiff = Math.abs(taskDate.getTime() - otherTaskDate.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff <= MAINTENANCE_WINDOW_DAYS;
  });
  
  // If we have 3 or more tasks (including this one) in the window, create an alert
  if (recentTasks.length >= MAINTENANCE_COUNT_THRESHOLD) {
    const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
      alert_type: 'frequent_maintenance',
      severity: 'medium',
      status: 'pending',
      title: `${recentTasks.length} maintenance tasks within ${MAINTENANCE_WINDOW_DAYS} days`,
      description: `Vehicle has had ${recentTasks.length} maintenance tasks in the last ${MAINTENANCE_WINDOW_DAYS} days. This may indicate recurring issues or ineffective repairs.`,
      affected_entity: {
        type: 'vehicle',
        id: task.vehicle_id
      },
      metadata: {
        task_id: task.id,
        expected_value: 2, // Expected fewer than 3 tasks in 30 days
        actual_value: recentTasks.length,
        deviation: ((recentTasks.length - 2) / 2) * 100, // Percentage above expected
        maintenance_ids: recentTasks.map(t => t.id),
        recommendations: [
          'Review maintenance history in detail',
          'Consider a comprehensive vehicle inspection',
          'Evaluate repair quality from previous services',
          'Check for pattern of similar issues'
        ]
      },
      created_at: new Date().toISOString()
    };
    
    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from('ai_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating frequent maintenance alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating frequent maintenance alert:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Check for high expense spike in maintenance costs
 * @param task The maintenance task to analyze
 * @returns An alert if the expense is above threshold, or null otherwise
 */
export const checkHighExpenseSpike = async (task: MaintenanceTask): Promise<AIAlert | null> => {
  const EXPENSE_THRESHOLD = 10000; // ₹10,000
  
  // Get the total cost (either from service groups or direct cost)
  let totalCost = 0;
  
  // Check service groups costs
  if (Array.isArray(task.service_groups) && task.service_groups.length > 0) {
    totalCost = task.service_groups.reduce((sum, group) => {
      const groupCost = typeof group.cost === 'number' ? group.cost : 0;
      return sum + groupCost;
    }, 0);
  } else if (task.actual_cost) {
    totalCost = task.actual_cost;
  } else if (task.estimated_cost) {
    totalCost = task.estimated_cost;
  }
  
  // If cost exceeds threshold, create an alert
  if (totalCost > EXPENSE_THRESHOLD) {
    const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
      alert_type: 'high_expense_spike',
      severity: 'high',
      status: 'pending',
      title: `High maintenance cost: ₹${totalCost.toLocaleString()}`,
      description: `Maintenance task has unusually high cost (₹${totalCost.toLocaleString()}), exceeding the ₹${EXPENSE_THRESHOLD.toLocaleString()} threshold. This may require budget review or approval.`,
      affected_entity: {
        type: 'vehicle',
        id: task.vehicle_id
      },
      metadata: {
        task_id: task.id,
        expected_value: EXPENSE_THRESHOLD,
        actual_value: totalCost,
        deviation: ((totalCost - EXPENSE_THRESHOLD) / EXPENSE_THRESHOLD) * 100,
        task_type: task.task_type,
        recommendations: [
          'Review itemized costs for potential errors',
          'Verify if all services were necessary',
          'Compare with average costs for similar maintenance',
          'Consider getting second opinions for future high-cost repairs'
        ]
      },
      created_at: new Date().toISOString()
    };
    
    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from('ai_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating high expense alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating high expense alert:', error);
      return null;
    }
  }
  
  return null;
};

// Stub functions that no longer generate alerts
export const getAIAlerts = async () => {
  const { data, error } = await supabase
    .from('ai_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching AI alerts:', error);
    return [];
  }

  return data || [];
};

export const analyzeTripAndGenerateAlerts = async (trip: Trip, analysis: RouteAnalysis | undefined, allTrips: Trip[]): Promise<Alert[]> => {
  const alerts: Alert[] = [];
  
  // Check for route deviation alerts
  if (analysis && Math.abs(analysis.deviation) > 15) {
    alerts.push({
      type: 'route_deviation',
      message: `Route deviation of ${analysis.deviation.toFixed(1)}%`,
      severity: Math.abs(analysis.deviation) > 25 ? 'high' : 'medium',
      details: `Trip took ${Math.abs(analysis.deviation).toFixed(1)}% ${analysis.deviation > 0 ? 'more' : 'less'} distance than expected.`
    });
  }

  // Run all alert checks
  await Promise.all([
    checkMileageAnomaly(trip),
    checkRouteDeviation(trip),
    checkLowMileageStreak(trip, allTrips)
  ]);
  
  return alerts;
};

export const runAlertScan = async (): Promise<number> => {
  let alertCount = 0;
  
  try {
    // 1. Fetch necessary data
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .order('trip_end_date', { ascending: false })
      .limit(100); // Get the 100 most recent trips
      
    if (tripsError) {
      console.error('Error fetching trips for alert scan:', tripsError);
      return 0;
    }
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('maintenance_tasks')
      .select('*, service_groups(*)')
      .order('start_date', { ascending: false })
      .limit(50); // Get the 50 most recent maintenance tasks
    
    if (tasksError) {
      console.error('Error fetching maintenance tasks for alert scan:', tasksError);
    }
    
    const trips = tripsData || [];
    const tasks = tasksData || [];
    
    // 2. Analyze trips for anomalies
    for (const trip of trips) {
      const mileageAlert = await checkMileageAnomaly(trip);
      if (mileageAlert) alertCount++;
      
      const routeAlert = await checkRouteDeviation(trip);
      if (routeAlert) alertCount++;
      
      const streakAlert = await checkLowMileageStreak(trip, trips);
      if (streakAlert) alertCount++;
    }
    
    // 3. Analyze maintenance tasks
    for (const task of tasks) {
      const frequentMaintenanceAlert = await checkFrequentMaintenance(task, tasks);
      if (frequentMaintenanceAlert) alertCount++;
      
      const expenseAlert = await checkHighExpenseSpike(task);
      if (expenseAlert) alertCount++;
    }
    
    return alertCount;
  } catch (error) {
    console.error('Error running alert scan:', error);
    return 0;
  }
};

export const processAlertAction = async (
  alertId: string, 
  action: 'accept' | 'deny' | 'ignore', 
  reason?: string, 
  duration?: 'week' | 'permanent'
) => {
  const status = action === 'accept' ? 'accepted' : action === 'deny' ? 'denied' : 'ignored';
  
  const { error } = await supabase
    .from('ai_alerts')
    .update({
      status,
      metadata: {
        resolution_reason: reason,
        resolution_comment: reason,
        ignore_duration: duration,
        resolved_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error processing alert action:', error);
    throw new Error(`Failed to process alert action: ${error.message}`);
  }
};

export default {
  analyzeTripAndGenerateAlerts,
  processAlertAction,
  getAIAlerts,
  checkMileageAnomaly,
  checkRouteDeviation,
  checkLowMileageStreak,
  checkFrequentMaintenance,
  checkHighExpenseSpike,
  runAlertScan
};