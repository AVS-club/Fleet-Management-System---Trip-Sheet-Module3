import { Driver, Trip, Vehicle } from '../types';
import { MaintenanceTask } from '../types/maintenance';
import { format, parseISO, isValid, isWithinInterval, differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// --- Interfaces ---

export interface DriverPerformanceMetrics {
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
 * Generates an insight if a driver's mileage has significantly dropped.
 * @param driverId The ID of the driver to analyze.
 * @param trips All trip data.
 * @param dateRange The current date range for analysis.
 * @returns A DriverInsight object or null if no significant drop.
 */
export const getMileageDropInsight = (
  driverId: string,
  trips: Trip[],
  dateRange: { start: Date; end: Date }
): DriverInsight | null => {
  const currentPeriodTrips = trips.filter(trip =>
    trip.driver_id === driverId &&
    isValid(parseISO(trip.trip_start_date)) &&
    isWithinInterval(parseISO(trip.trip_start_date), dateRange) &&
    trip.calculated_kmpl !== undefined && trip.calculated_kmpl > 0
  );

  if (currentPeriodTrips.length < 5) return null; // Not enough data

  const currentAvgMileage = currentPeriodTrips.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / currentPeriodTrips.length;

  // Define previous period (e.g., the month before the current period starts)
  const prevPeriodEnd = subMonths(dateRange.start, 1);
  const prevPeriodStart = startOfMonth(prevPeriodEnd);
  const prevDateRange = { start: prevPeriodStart, end: prevPeriodEnd };

  const prevPeriodTrips = trips.filter(trip =>
    trip.driver_id === driverId &&
    isValid(parseISO(trip.trip_start_date)) &&
    isWithinInterval(parseISO(trip.trip_start_date), prevDateRange) &&
    trip.calculated_kmpl !== undefined && trip.calculated_kmpl > 0
  );

  if (prevPeriodTrips.length < 5) return null; // Not enough historical data

  const prevAvgMileage = prevPeriodTrips.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / prevPeriodTrips.length;

  const percentageDrop = prevAvgMileage > 0 ? ((prevAvgMileage - currentAvgMileage) / prevAvgMileage) * 100 : 0;

  if (percentageDrop > 10) { // Significant drop if more than 10%
    return {
      type: 'mileage_drop',
      driverId,
      message: `Mileage drop: ${driverId}'s average mileage dropped by ${percentageDrop.toFixed(1)}% from ${prevAvgMileage.toFixed(2)} km/L to ${currentAvgMileage.toFixed(2)} km/L.`,
      severity: percentageDrop > 20 ? 'high' : 'medium',
      metadata: { currentAvgMileage, prevAvgMileage, percentageDrop }
    };
  }

  return null;
};

/**
 * Generates an insight if a driver has triggered frequent breakdowns.
 * @param driverId The ID of the driver to analyze.
 * @param maintenanceTasks All maintenance task data.
 * @param dateRange The date range for analysis.
 * @returns A DriverInsight object or null if no frequent breakdowns.
 */
export const getBreakdownInsight = (
  driverId: string,
  maintenanceTasks: MaintenanceTask[],
  dateRange: { start: Date; end: Date }
): DriverInsight | null => {
  const driverBreakdowns = maintenanceTasks.filter(task =>
    task.vehicle_id === driverId && // Assuming vehicle_id in maintenance task refers to the primary vehicle of the driver
    (task.task_type === 'accidental' || task.category === 'Breakdown') && // Assuming a 'Breakdown' category or type
    isValid(parseISO(task.start_date)) &&
    isWithinInterval(parseISO(task.start_date), dateRange)
  );

  if (driverBreakdowns.length >= 2) { // More than 1 breakdown in the period
    return {
      type: 'breakdown_frequency',
      driverId,
      message: `${driverId} triggered ${driverBreakdowns.length} breakdown(s) in ${format(dateRange.start, 'MMM yyyy')} - ${format(dateRange.end, 'MMM yyyy')}.`,
      severity: driverBreakdowns.length >= 3 ? 'high' : 'medium',
      metadata: { breakdownCount: driverBreakdowns.length, breakdownTasks: driverBreakdowns.map(t => t.id) }
    };
  }

  return null;
};

/**
 * Generates an insight comparing a driver's cost per km to the fleet average.
 * @param driverId The ID of the driver.
 * @param driverCostPerKm The driver's cost per km.
 * @param fleetAvgCostPerKm The fleet average cost per km.
 * @returns A DriverInsight object.
 */
export const getCostComparisonInsight = (
  driverId: string,
  driverCostPerKm: number,
  fleetAvgCostPerKm: number
): DriverInsight => {
  if (fleetAvgCostPerKm === 0) {
    return {
      type: 'cost_comparison',
      driverId,
      message: `Cannot compare cost/km: Fleet average cost/km is zero.`,
      severity: 'low',
      metadata: { driverCostPerKm, fleetAvgCostPerKm }
    };
  }

  const percentageDifference = ((driverCostPerKm - fleetAvgCostPerKm) / fleetAvgCostPerKm) * 100;
  let message: string;
  let severity: 'high' | 'medium' | 'low';

  if (percentageDifference > 15) {
    message = `${driverId}'s cost/km is ${percentageDifference.toFixed(1)}% above fleet average (₹${driverCostPerKm.toFixed(2)} vs ₹${fleetAvgCostPerKm.toFixed(2)}).`;
    severity = 'high';
  } else if (percentageDifference > 5) {
    message = `${driverId}'s cost/km is ${percentageDifference.toFixed(1)}% above fleet average (₹${driverCostPerKm.toFixed(2)} vs ₹${fleetAvgCostPerKm.toFixed(2)}).`;
    severity = 'medium';
  } else if (percentageDifference < -5) {
    message = `${driverId}'s cost/km is ${Math.abs(percentageDifference).toFixed(1)}% below fleet average (₹${driverCostPerKm.toFixed(2)} vs ₹${fleetAvgCostPerKm.toFixed(2)}).`;
    severity = 'low'; // Good performance
  } else {
    message = `${driverId}'s cost/km is in line with fleet average (₹${driverCostPerKm.toFixed(2)} vs ₹${fleetAvgCostPerKm.toFixed(2)}).`;
    severity = 'low';
  }

  return {
    type: 'cost_comparison',
    driverId,
    message,
    severity,
    metadata: { driverCostPerKm, fleetAvgCostPerKm, percentageDifference }
  };
};

/**
 * Generates an insight about high maintenance costs under a specific driver.
 * @param driverId The ID of the driver.
 * @param maintenanceTasks All maintenance task data.
 * @param dateRange The date range for analysis.
 * @param fleetAvgMaintenanceCost The fleet average maintenance cost per vehicle.
 * @returns A DriverInsight object or null.
 */
export const getMaintenanceCostInsight = (
  driverId: string,
  maintenanceTasks: MaintenanceTask[],
  dateRange: { start: Date; end: Date },
  fleetAvgMaintenanceCost: number
): DriverInsight | null => {
  const driverMaintenanceCosts = maintenanceTasks.filter(task =>
    task.vehicle_id === driverId && // Assuming vehicle_id in maintenance task refers to the primary vehicle of the driver
    isValid(parseISO(task.start_date)) &&
    isWithinInterval(parseISO(task.start_date), dateRange)
  ).reduce((sum, task) => sum + (task.actual_cost || task.estimated_cost || 0), 0);

  if (fleetAvgMaintenanceCost === 0) return null;

  const percentageAboveFleet = ((driverMaintenanceCosts - fleetAvgMaintenanceCost) / fleetAvgMaintenanceCost) * 100;

  if (percentageAboveFleet > 20) { // More than 20% above fleet average
    return {
      type: 'maintenance_cost',
      driverId,
      message: `${driverId} incurred ${percentageAboveFleet.toFixed(1)}% higher maintenance costs (₹${driverMaintenanceCosts.toFixed(2)}) compared to fleet average (₹${fleetAvgMaintenanceCost.toFixed(2)}).`,
      severity: percentageAboveFleet > 40 ? 'high' : 'medium',
      metadata: { driverMaintenanceCosts, fleetAvgMaintenanceCost, percentageAboveFleet }
    };
  }

  return null;
};
