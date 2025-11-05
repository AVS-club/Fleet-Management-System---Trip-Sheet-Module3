import { Trip } from '@/types';
import { createLogger } from './logger';

const logger = createLogger('mileageDiagnostics');

export interface MileageAnomaly {
  tripId: string;
  tripNumber: string;
  vehicleId: string;
  issueType: 'very_high' | 'very_low' | 'partial_fill' | 'negative_distance' | 'unrealistic';
  severity: 'critical' | 'warning' | 'info';
  calculatedMileage: number | undefined;
  expectedMileage?: number;
  tripDistance: number;
  tankToTankDistance?: number;
  fuelQuantity: number;
  previousRefuelEndKm?: number;
  currentEndKm: number;
  message: string;
  suggestion: string;
}

export interface VehicleMileageReport {
  vehicleId: string;
  totalTrips: number;
  refuelingTrips: number;
  anomalies: MileageAnomaly[];
  averageMileage: number;
  mileageRange: { min: number; max: number };
}

export interface DiagnosticSummary {
  totalTrips: number;
  totalRefuelingTrips: number;
  totalAnomalies: number;
  criticalAnomalies: number;
  warningAnomalies: number;
  veryHighMileage: number; // > 50 km/L
  extremelyHighMileage: number; // > 100 km/L
  veryLowMileage: number; // < 2 km/L
  partialRefills: number;
  negativeDistances: number;
}

/**
 * Diagnoses mileage calculation issues for a single trip
 */
export function diagnoseSingleTrip(
  trip: Trip,
  allTrips: Trip[],
  vehicleAverageMileage?: number
): MileageAnomaly | null {
  if (!trip.refueling_done || !trip.fuel_quantity || trip.fuel_quantity <= 0) {
    return null; // Only diagnose refueling trips
  }

  const tripDistance = trip.end_km - trip.start_km;
  const calculatedMileage = trip.calculated_kmpl;

  // Find previous refueling trip
  const previousRefuelingTrips = allTrips
    .filter(t =>
      t.vehicle_id === trip.vehicle_id &&
      t.refueling_done &&
      t.id !== trip.id &&
      new Date(t.trip_end_date) < new Date(trip.trip_end_date)
    )
    .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());

  const previousRefuel = previousRefuelingTrips[0];
  const tankToTankDistance = previousRefuel ? trip.end_km - previousRefuel.end_km : tripDistance;

  // Calculate what mileage SHOULD be based on trip distance
  const simpleMileage = tripDistance / trip.fuel_quantity;

  // Detect anomalies
  const avgMileage = vehicleAverageMileage || 12; // Default assumption for commercial vehicles

  // Critical: Very high mileage (> 100 km/L)
  if (calculatedMileage && calculatedMileage > 100) {
    const isPartialFill = tankToTankDistance > tripDistance * 2;

    return {
      tripId: trip.id,
      tripNumber: trip.trip_number || trip.trip_serial_number || 'Unknown',
      vehicleId: trip.vehicle_id,
      issueType: isPartialFill ? 'partial_fill' : 'very_high',
      severity: 'critical',
      calculatedMileage,
      expectedMileage: simpleMileage,
      tripDistance,
      tankToTankDistance,
      fuelQuantity: trip.fuel_quantity,
      previousRefuelEndKm: previousRefuel?.end_km,
      currentEndKm: trip.end_km,
      message: isPartialFill
        ? `PARTIAL REFILL: ${calculatedMileage.toFixed(2)} km/L (traveled ${tankToTankDistance.toFixed(0)} km, added only ${trip.fuel_quantity.toFixed(2)} L)`
        : `EXTREMELY HIGH: ${calculatedMileage.toFixed(2)} km/L`,
      suggestion: isPartialFill
        ? `Partial refill detected. Vehicle traveled ${tankToTankDistance.toFixed(0)} km since last refueling but only added ${trip.fuel_quantity.toFixed(2)} L. Check for: (1) Unrecorded refuelings, (2) Incorrect fuel quantity, or (3) Wrong odometer reading.`
        : `Unrealistic mileage. Verify fuel quantity (${trip.fuel_quantity.toFixed(2)} L) and odometer readings (${trip.start_km} → ${trip.end_km} km).`
    };
  }

  // Warning: High mileage (50-100 km/L)
  if (calculatedMileage && calculatedMileage > 50) {
    const isPartialFill = tankToTankDistance > tripDistance * 1.5;

    return {
      tripId: trip.id,
      tripNumber: trip.trip_number || trip.trip_serial_number || 'Unknown',
      vehicleId: trip.vehicle_id,
      issueType: isPartialFill ? 'partial_fill' : 'very_high',
      severity: 'warning',
      calculatedMileage,
      expectedMileage: simpleMileage,
      tripDistance,
      tankToTankDistance,
      fuelQuantity: trip.fuel_quantity,
      previousRefuelEndKm: previousRefuel?.end_km,
      currentEndKm: trip.end_km,
      message: `HIGH MILEAGE: ${calculatedMileage.toFixed(2)} km/L (tank-to-tank: ${tankToTankDistance.toFixed(0)} km)`,
      suggestion: isPartialFill
        ? `Possible partial refill. Verify fuel quantity (${trip.fuel_quantity.toFixed(2)} L) and check if tank was filled completely.`
        : `High mileage detected. Verify fuel quantity (${trip.fuel_quantity.toFixed(2)} L).`
    };
  }

  // Warning: Moderately high mileage (25-50 km/L)
  if (calculatedMileage && calculatedMileage > 25) {
    return {
      tripId: trip.id,
      tripNumber: trip.trip_number || trip.trip_serial_number || 'Unknown',
      vehicleId: trip.vehicle_id,
      issueType: 'very_high',
      severity: 'warning',
      calculatedMileage,
      expectedMileage: simpleMileage,
      tripDistance,
      tankToTankDistance,
      fuelQuantity: trip.fuel_quantity,
      previousRefuelEndKm: previousRefuel?.end_km,
      currentEndKm: trip.end_km,
      message: `Elevated mileage: ${calculatedMileage.toFixed(2)} km/L`,
      suggestion: `Double-check fuel quantity (${trip.fuel_quantity.toFixed(2)} L) and odometer readings.`
    };
  }

  // Critical: Very low mileage (< 2 km/L)
  if (calculatedMileage && calculatedMileage < 2 && calculatedMileage > 0) {
    return {
      tripId: trip.id,
      tripNumber: trip.trip_number || trip.trip_serial_number || 'Unknown',
      vehicleId: trip.vehicle_id,
      issueType: 'very_low',
      severity: 'critical',
      calculatedMileage,
      expectedMileage: avgMileage,
      tripDistance,
      tankToTankDistance,
      fuelQuantity: trip.fuel_quantity,
      currentEndKm: trip.end_km,
      message: `VERY LOW MILEAGE: ${calculatedMileage.toFixed(2)} km/L`,
      suggestion: `Check for fuel leak, duplicate refueling entries, or incorrect fuel quantity (${trip.fuel_quantity.toFixed(2)} L seems too high for ${tankToTankDistance.toFixed(0)} km).`
    };
  }

  // Negative or zero distance
  if (tankToTankDistance <= 0) {
    return {
      tripId: trip.id,
      tripNumber: trip.trip_number || trip.trip_serial_number || 'Unknown',
      vehicleId: trip.vehicle_id,
      issueType: 'negative_distance',
      severity: 'critical',
      calculatedMileage,
      tripDistance,
      tankToTankDistance,
      fuelQuantity: trip.fuel_quantity,
      previousRefuelEndKm: previousRefuel?.end_km,
      currentEndKm: trip.end_km,
      message: `INVALID DISTANCE: ${tankToTankDistance.toFixed(0)} km`,
      suggestion: `Odometer readings are incorrect. Previous refuel: ${previousRefuel?.end_km || 'N/A'} km, Current: ${trip.end_km} km.`
    };
  }

  return null;
}

/**
 * Analyzes all trips for a vehicle and returns a comprehensive report
 */
export function analyzeVehicleMileage(vehicleId: string, allTrips: Trip[]): VehicleMileageReport {
  const vehicleTrips = allTrips
    .filter(trip => trip.vehicle_id === vehicleId)
    .sort((a, b) => new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime());

  const refuelingTrips = vehicleTrips.filter(t => t.refueling_done && t.fuel_quantity && t.fuel_quantity > 0);

  // Calculate average mileage for the vehicle (excluding extreme outliers)
  const validMileages = refuelingTrips
    .map(t => t.calculated_kmpl)
    .filter((m): m is number => m !== undefined && m !== null && m > 0 && m < 50);

  const averageMileage = validMileages.length > 0
    ? validMileages.reduce((sum, m) => sum + m, 0) / validMileages.length
    : 12;

  const mileageRange = validMileages.length > 0
    ? { min: Math.min(...validMileages), max: Math.max(...validMileages) }
    : { min: 0, max: 0 };

  // Diagnose each refueling trip
  const anomalies: MileageAnomaly[] = [];
  for (const trip of refuelingTrips) {
    const anomaly = diagnoseSingleTrip(trip, allTrips, averageMileage);
    if (anomaly) {
      anomalies.push(anomaly);
    }
  }

  return {
    vehicleId,
    totalTrips: vehicleTrips.length,
    refuelingTrips: refuelingTrips.length,
    anomalies,
    averageMileage,
    mileageRange
  };
}

/**
 * Analyzes all trips across all vehicles and returns a summary
 */
export function analyzeAllTrips(allTrips: Trip[]): DiagnosticSummary {
  const vehicleIds = [...new Set(allTrips.map(t => t.vehicle_id))];
  const refuelingTrips = allTrips.filter(t => t.refueling_done && t.fuel_quantity && t.fuel_quantity > 0);

  let totalAnomalies = 0;
  let criticalAnomalies = 0;
  let warningAnomalies = 0;
  let veryHighMileage = 0;
  let extremelyHighMileage = 0;
  let veryLowMileage = 0;
  let partialRefills = 0;
  let negativeDistances = 0;

  // Analyze each vehicle
  for (const vehicleId of vehicleIds) {
    const report = analyzeVehicleMileage(vehicleId, allTrips);

    for (const anomaly of report.anomalies) {
      totalAnomalies++;

      if (anomaly.severity === 'critical') criticalAnomalies++;
      if (anomaly.severity === 'warning') warningAnomalies++;

      if (anomaly.issueType === 'partial_fill') partialRefills++;
      if (anomaly.issueType === 'negative_distance') negativeDistances++;
      if (anomaly.issueType === 'very_low') veryLowMileage++;

      if (anomaly.calculatedMileage) {
        if (anomaly.calculatedMileage > 100) extremelyHighMileage++;
        else if (anomaly.calculatedMileage > 50) veryHighMileage++;
      }
    }
  }

  return {
    totalTrips: allTrips.length,
    totalRefuelingTrips: refuelingTrips.length,
    totalAnomalies,
    criticalAnomalies,
    warningAnomalies,
    veryHighMileage,
    extremelyHighMileage,
    veryLowMileage,
    partialRefills,
    negativeDistances
  };
}

/**
 * Logs detailed diagnostics for anomalies
 */
export function logAnomalyDetails(anomaly: MileageAnomaly): void {
  const prefix = anomaly.severity === 'critical' ? '🔴 CRITICAL' : '⚠️ WARNING';

  logger.warn(`${prefix}: Trip ${anomaly.tripNumber}`);
  logger.warn(`  Type: ${anomaly.issueType}`);
  logger.warn(`  Calculated Mileage: ${anomaly.calculatedMileage?.toFixed(2) || 'N/A'} km/L`);
  logger.warn(`  Trip Distance: ${anomaly.tripDistance.toFixed(0)} km`);
  if (anomaly.tankToTankDistance) {
    logger.warn(`  Tank-to-Tank Distance: ${anomaly.tankToTankDistance.toFixed(0)} km`);
  }
  logger.warn(`  Fuel Added: ${anomaly.fuelQuantity.toFixed(2)} L`);
  logger.warn(`  Message: ${anomaly.message}`);
  logger.warn(`  Suggestion: ${anomaly.suggestion}`);
  logger.warn('');
}

/**
 * Detects if a trip is likely a partial refill
 */
export function isPartialRefill(trip: Trip, allTrips: Trip[]): boolean {
  if (!trip.refueling_done || !trip.fuel_quantity || trip.fuel_quantity <= 0) {
    return false;
  }

  const tripDistance = trip.end_km - trip.start_km;

  const previousRefuelingTrips = allTrips
    .filter(t =>
      t.vehicle_id === trip.vehicle_id &&
      t.refueling_done &&
      t.id !== trip.id &&
      new Date(t.trip_end_date) < new Date(trip.trip_end_date)
    )
    .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());

  const previousRefuel = previousRefuelingTrips[0];
  if (!previousRefuel) {
    return false;
  }

  const tankToTankDistance = trip.end_km - previousRefuel.end_km;

  // If tank-to-tank distance is more than 2x the trip distance, likely a partial fill
  return tankToTankDistance > tripDistance * 2;
}
