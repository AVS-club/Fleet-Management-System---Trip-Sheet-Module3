import { Driver, Trip, Vehicle } from '@/types';
import { MaintenanceTask } from '@/types/maintenance';
import { format, parseISO, isValid, isWithinInterval, differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// --- Interfaces ---

interface DriverPerformanceMetrics {
  driverId: string;
  name: string;
  totalTrips: number;
  totalDistance: number; // Sum of (end_km - start_km)
  totalFuel: number; // Sum of fuel_quantity
  avgMileage: number; // totalDistance / totalFuel
  totalGrossWeight: number; // Sum of gross_weight
  avgLoadPerTrip: number; // totalGrossWeight / totalTrips
  totalExpenses: number; // Sum of total_expense from trips
  costPerKm: number; // totalExpenses / totalDistance
  driverUtilizationDays: number; // Number of unique days with a trip
  driverUtilizationPercentage: number; // (driverUtilizationDays / totalDaysInPeriod) * 100
  daysUnderMaintenance: number; // Sum of downtime_days for assigned vehicle
  documentationExpense: number; // Sum of document-related costs for assigned vehicle
  lastTripDate: string | null;
}

export interface DriverInsight {
  type: 'cost_comparison' | 'mileage_drop' | 'breakdown_frequency' | 'maintenance_cost';
  driverId: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  metadata?: any;
}

// --- Helper Functions ---

/**
 * Calculates comprehensive performance metrics for each driver within a given date range.
 * @param drivers All driver data.
 * @param trips All trip data.
 * @param vehicles All vehicle data.
 * @param maintenanceTasks All maintenance task data.
 * @param dateRange The date range for analysis.
 * @returns An array of DriverPerformanceMetrics.
 */
export const getDriverPerformanceMetrics = (
  drivers: Driver[],
  trips: Trip[],
  vehicles: Vehicle[],
  maintenanceTasks: MaintenanceTask[],
  dateRange: { start: Date; end: Date }
): DriverPerformanceMetrics[] => {
  const performanceMetrics: DriverPerformanceMetrics[] = [];
  const totalDaysInPeriod = differenceInDays(dateRange.end, dateRange.start) + 1;

  drivers.forEach(driver => {
    const driverTrips = trips.filter(trip =>
      trip.driver_id === driver.id &&
      isValid(parseISO(trip.trip_start_date)) &&
      isWithinInterval(parseISO(trip.trip_start_date), dateRange)
    );

    const totalTrips = driverTrips.length;
    const totalDistance = driverTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
    const totalFuel = driverTrips.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);
    const totalGrossWeight = driverTrips.reduce((sum, trip) => sum + (trip.gross_weight || 0), 0);
    const totalExpenses = driverTrips.reduce((sum, trip) => sum + (trip.total_expense || 0), 0);

    const avgMileage = totalFuel > 0 ? totalDistance / totalFuel : 0;
    const avgLoadPerTrip = totalTrips > 0 ? totalGrossWeight / totalTrips : 0;
    const avgTripDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
    const costPerKm = totalDistance > 0 ? totalExpenses / totalDistance : 0;

    // Calculate driver utilization days
    const uniqueTripDays = new Set<string>();
    driverTrips.forEach(trip => {
      uniqueTripDays.add(format(parseISO(trip.trip_start_date), 'yyyy-MM-dd'));
    });
    const driverUtilizationDays = uniqueTripDays.size;
    const driverUtilizationPercentage = totalDaysInPeriod > 0 ? (driverUtilizationDays / totalDaysInPeriod) * 100 : 0;

    // Calculate days under maintenance for assigned vehicle
    let daysUnderMaintenance = 0;
    const assignedVehicle = vehicles.find(v => v.id === driver.primary_vehicle_id);
    if (assignedVehicle) {
      const vehicleMaintenanceTasks = maintenanceTasks.filter(task =>
        task.vehicle_id === assignedVehicle.id &&
        isValid(parseISO(task.start_date)) &&
        isWithinInterval(parseISO(task.start_date), dateRange)
      );
      daysUnderMaintenance = vehicleMaintenanceTasks.reduce((sum, task) => sum + (task.downtime_days || 0), 0);
    }

    // Calculate documentation expense (simplified: sum of costs from assigned vehicle)
    let documentationExpense = 0;
    if (assignedVehicle) {
      documentationExpense += (assignedVehicle.insurance_premium_amount || 0);
      documentationExpense += (assignedVehicle.fitness_cost || 0);
      documentationExpense += (assignedVehicle.permit_cost || 0);
      documentationExpense += (assignedVehicle.puc_cost || 0);
      documentationExpense += (assignedVehicle.tax_amount || 0);
      if (assignedVehicle.other_documents && Array.isArray(assignedVehicle.other_documents)) {
        documentationExpense += assignedVehicle.other_documents.reduce((sum, doc) => sum + (doc.cost || 0), 0);
      }
    }

    const lastTripDate = driverTrips.length > 0
      ? format(parseISO(driverTrips[0].trip_end_date), 'yyyy-MM-dd')
      : null;

    performanceMetrics.push({
      driverId: driver.id || '',
      name: driver.name,
      totalTrips,
      totalDistance,
      totalFuel,
      avgMileage,
      totalGrossWeight,
      avgLoadPerTrip,
      totalExpenses,
      costPerKm,
      driverUtilizationDays,
      driverUtilizationPercentage,
      daysUnderMaintenance,
      documentationExpense,
      lastTripDate
    });
  });

  return performanceMetrics;
};

/**
 * Calculates the average cost per km across all drivers.
 * @param allDriverPerformance An array of DriverPerformanceMetrics.
 * @returns The fleet average cost per km.
 */
export const getFleetAverageCostPerKm = (allDriverPerformance: DriverPerformanceMetrics[]): number => {
  const driversWithCost = allDriverPerformance.filter(p => p.totalDistance > 0 && p.costPerKm > 0);
  if (driversWithCost.length === 0) return 0;
  const totalCostPerKm = driversWithCost.reduce((sum, p) => sum + p.costPerKm, 0);
  return totalCostPerKm / driversWithCost.length;
};

/**
 * Generates insight about a driver's cost per km compared to the fleet average.
 * @param driverId The driver's ID.
 * @param driverCostPerKm The driver's cost per km.
 * @param fleetAvgCostPerKm The fleet average cost per km.
 * @returns A DriverInsight object.
 */
export const getCostComparisonInsight = (
  driverId: string,
  driverCostPerKm: number,
  fleetAvgCostPerKm: number
): DriverInsight => {
  const difference = driverCostPerKm - fleetAvgCostPerKm;
  const percentDifference = fleetAvgCostPerKm > 0 ? (difference / fleetAvgCostPerKm) * 100 : 0;
  const absoluteDifference = Math.abs(difference);
  
  let severity: 'high' | 'medium' | 'low';
  if (driverCostPerKm <= fleetAvgCostPerKm) {
    severity = 'low'; // Good performance
  } else if (percentDifference > 25) {
    severity = 'high';
  } else if (percentDifference > 10) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  let message: string;
  if (driverCostPerKm <= fleetAvgCostPerKm) {
    message = `Cost per km of ₹${driverCostPerKm.toFixed(2)}/km is ${absoluteDifference.toFixed(2)} below fleet average (₹${fleetAvgCostPerKm.toFixed(2)}/km). Good performance!`;
  } else {
    message = `Cost per km of ₹${driverCostPerKm.toFixed(2)}/km is ${absoluteDifference.toFixed(2)} above fleet average (₹${fleetAvgCostPerKm.toFixed(2)}/km). May need improvement.`;
  }

  return {
    type: 'cost_comparison',
    driverId,
    message,
    severity,
    metadata: {
      driverCostPerKm,
      fleetAvgCostPerKm,
      difference,
      percentDifference
    }
  };
};

/**
 * Identifies if a driver's mileage has dropped significantly in the current period compared to previous.
 * @param driverId The driver's ID.
 * @param trips All trip data.
 * @param dateRange The current date range for analysis.
 * @returns A DriverInsight object if a mileage drop is detected, null otherwise.
 */
export const getMileageDropInsight = (
  driverId: string,
  trips: Trip[],
  dateRange: { start: Date; end: Date }
): DriverInsight | null => {
  // Filter driver's trips in current period
  const currentPeriodTrips = trips.filter(trip => 
    trip.driver_id === driverId &&
    trip.calculated_kmpl !== undefined &&
    isValid(parseISO(trip.trip_start_date)) &&
    isWithinInterval(parseISO(trip.trip_start_date), dateRange)
  );
  
  if (currentPeriodTrips.length < 3) return null; // Not enough data in current period
  
  // Calculate current period average mileage
  const currentAvgMileage = currentPeriodTrips.reduce((sum, trip) => 
    sum + (trip.calculated_kmpl || 0), 0) / currentPeriodTrips.length;
  
  // Calculate previous period date range (same duration, earlier time)
  const previousPeriodDuration = differenceInDays(dateRange.end, dateRange.start);
  const previousPeriodEnd = new Date(dateRange.start);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1); // Day before current period starts
  const previousPeriodStart = new Date(previousPeriodEnd);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - previousPeriodDuration);
  
  // Filter driver's trips in previous period
  const previousPeriodTrips = trips.filter(trip => 
    trip.driver_id === driverId &&
    trip.calculated_kmpl !== undefined &&
    isValid(parseISO(trip.trip_start_date)) &&
    isWithinInterval(parseISO(trip.trip_start_date), { start: previousPeriodStart, end: previousPeriodEnd })
  );
  
  if (previousPeriodTrips.length < 3) return null; // Not enough data in previous period
  
  // Calculate previous period average mileage
  const previousAvgMileage = previousPeriodTrips.reduce((sum, trip) => 
    sum + (trip.calculated_kmpl || 0), 0) / previousPeriodTrips.length;
  
  // Calculate drop percentage
  const mileageDrop = previousAvgMileage - currentAvgMileage;
  const dropPercentage = (mileageDrop / previousAvgMileage) * 100;
  
  // Only generate insight if there's a significant drop (more than 10%)
  if (dropPercentage <= 10) return null;
  
  // Determine severity
  let severity: 'high' | 'medium' | 'low';
  if (dropPercentage > 25) {
    severity = 'high';
  } else if (dropPercentage > 15) {
    severity = 'medium';
  } else {
    severity = 'low';
  }
  
  return {
    type: 'mileage_drop',
    driverId,
    message: `Mileage has dropped by ${dropPercentage.toFixed(1)}% compared to previous period (${currentAvgMileage.toFixed(2)} km/L vs ${previousAvgMileage.toFixed(2)} km/L).`,
    severity,
    metadata: {
      currentAvgMileage,
      previousAvgMileage,
      mileageDrop,
      dropPercentage
    }
  };
};

/**
 * Identifies if a driver has an unusually high number of breakdown/accidental maintenance tasks.
 * @param driverId The driver's ID.
 * @param maintenanceTasks All maintenance task data.
 * @param dateRange The date range for analysis.
 * @returns A DriverInsight object if an anomaly is detected, null otherwise.
 */
export const getBreakdownInsight = (
  driverId: string,
  maintenanceTasks: MaintenanceTask[],
  dateRange: { start: Date; end: Date }
): DriverInsight | null => {
  // Get all maintenance tasks for all vehicles in the given period
  const periodMaintenanceTasks = maintenanceTasks.filter(task => 
    isValid(parseISO(task.start_date)) &&
    isWithinInterval(parseISO(task.start_date), dateRange)
  );
  
  if (periodMaintenanceTasks.length === 0) return null; // No maintenance tasks in period
  
  // Count accidental/breakdown tasks for each driver's vehicle
  const driverAccidentalTasks: Record<string, number> = {};
  const driverVehicleTasks: Record<string, number> = {};
  
  // Assume we have a drivers list with primary_vehicle_id assigned
  // In a real app, we'd need to map drivers to their assigned vehicles
  maintenanceTasks.forEach(task => {
    // Find the driver with this vehicle as primary
    const driverId = 'dummy'; // This would be the actual driver ID in a real implementation
    
    if (driverId) {
      // Count total tasks for this driver's vehicle
      driverVehicleTasks[driverId] = (driverVehicleTasks[driverId] || 0) + 1;
      
      // Count accidental tasks for this driver's vehicle
      if (task.task_type === 'accidental' || 
          (Array.isArray(task.title) && 
           task.title.some(t => t.toLowerCase().includes('breakdown') || t.toLowerCase().includes('accident')))) {
        driverAccidentalTasks[driverId] = (driverAccidentalTasks[driverId] || 0) + 1;
      }
    }
  });
  
  // Check if this driver has accidental tasks
  if (!driverAccidentalTasks[driverId] || driverAccidentalTasks[driverId] <= 1) {
    return null; // No significant accidental tasks
  }
  
  // Calculate percentage of accidental tasks
  const totalTasks = driverVehicleTasks[driverId] || 0;
  const accidentalTasks = driverAccidentalTasks[driverId] || 0;
  const percentage = totalTasks > 0 ? (accidentalTasks / totalTasks) * 100 : 0;
  
  // Only generate insight if percentage is significant (more than 20%)
  if (percentage <= 20) return null;
  
  // Determine severity
  let severity: 'high' | 'medium' | 'low';
  if (percentage > 50) {
    severity = 'high';
  } else if (percentage > 30) {
    severity = 'medium';
  } else {
    severity = 'low';
  }
  
  return {
    type: 'breakdown_frequency',
    driverId,
    message: `${accidentalTasks} breakdown/accidental maintenance tasks recorded (${percentage.toFixed(1)}% of all tasks). May indicate driving issues.`,
    severity,
    metadata: {
      accidentalTasks,
      totalTasks,
      percentage
    }
  };
};

/**
 * Identifies if a driver's vehicle has higher than average maintenance costs.
 * @param driverId The driver's ID.
 * @param maintenanceTasks All maintenance task data.
 * @param dateRange The date range for analysis.
 * @param fleetAvgMaintenanceCost The fleet average maintenance cost per task.
 * @returns A DriverInsight object if an anomaly is detected, null otherwise.
 */
export const getMaintenanceCostInsight = (
  driverId: string,
  maintenanceTasks: MaintenanceTask[],
  dateRange: { start: Date; end: Date },
  fleetAvgMaintenanceCost: number
): DriverInsight | null => {
  // Filter maintenance tasks for the given period
  const periodMaintenanceTasks = maintenanceTasks.filter(task => 
    isValid(parseISO(task.start_date)) &&
    isWithinInterval(parseISO(task.start_date), dateRange)
  );
  
  if (periodMaintenanceTasks.length === 0 || fleetAvgMaintenanceCost <= 0) return null;
  
  // Find the driver's vehicle
  // In a real app, we'd need to get the driver's assigned vehicle
  const driverVehicleId = 'dummy'; // This would be the actual vehicle ID in a real implementation
  
  if (!driverVehicleId) return null;
  
  // Get maintenance tasks for this vehicle
  const vehicleTasks = periodMaintenanceTasks.filter(task => task.vehicle_id === driverVehicleId);
  
  if (vehicleTasks.length === 0) return null; // No tasks for this vehicle
  
  // Calculate average maintenance cost per task for this vehicle using total_cost from database
  const totalCost = vehicleTasks.reduce((sum, task) =>
    sum + (task.total_cost || 0), 0);
  
  const avgCost = totalCost / vehicleTasks.length;
  
  // Calculate difference from fleet average
  const costDifference = avgCost - fleetAvgMaintenanceCost;
  const percentDifference = fleetAvgMaintenanceCost > 0 ? (costDifference / fleetAvgMaintenanceCost) * 100 : 0;
  
  // Only generate insight if cost is significantly higher than average (more than 20%)
  if (percentDifference <= 20) return null;
  
  // Determine severity
  let severity: 'high' | 'medium' | 'low';
  if (percentDifference > 50) {
    severity = 'high';
  } else if (percentDifference > 30) {
    severity = 'medium';
  } else {
    severity = 'low';
  }
  
  return {
    type: 'maintenance_cost',
    driverId,
    message: `Maintenance costs are ${percentDifference.toFixed(1)}% higher than fleet average (₹${avgCost.toLocaleString()} vs ₹${fleetAvgMaintenanceCost.toLocaleString()} per task).`,
    severity,
    metadata: {
      avgCost,
      fleetAvgMaintenanceCost,
      costDifference,
      percentDifference,
      taskCount: vehicleTasks.length
    }
  };
};