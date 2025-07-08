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
