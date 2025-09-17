import { Trip } from '@/types';
import { recalculateAllMileageForVehicle } from './mileageRecalculation';

/**
 * Fixes mileage calculations for all trips of a specific vehicle
 * This is useful for correcting existing data that has incorrect mileage calculations
 */
export async function fixMileageForVehicle(vehicleId: string, allTrips: Trip[]): Promise<Trip[]> {
  return recalculateAllMileageForVehicle(vehicleId, allTrips);
}

/**
 * Fixes mileage calculations for all trips in the system
 * This is useful for a one-time correction of all existing data
 */
export function fixMileageForAllTrips(allTrips: Trip[]): Trip[] {
  // Group trips by vehicle
  const tripsByVehicle = allTrips.reduce((acc, trip) => {
    if (!acc[trip.vehicle_id]) {
      acc[trip.vehicle_id] = [];
    }
    acc[trip.vehicle_id].push(trip);
    return acc;
  }, {} as Record<string, Trip[]>);

  // Fix mileage for each vehicle
  const fixedTrips: Trip[] = [];
  Object.entries(tripsByVehicle).forEach(([vehicleId, vehicleTrips]) => {
    const fixedVehicleTrips = recalculateAllMileageForVehicle(vehicleId, allTrips);
    fixedTrips.push(...fixedVehicleTrips);
  });

  return fixedTrips;
}

/**
 * Validates that mileage calculations are correct for a set of trips
 * Returns trips that have incorrect mileage calculations
 */
export function validateMileageCalculations(trips: Trip[]): { 
  correctTrips: Trip[]; 
  incorrectTrips: Trip[]; 
  fixedTrips: Trip[] 
} {
  const correctTrips: Trip[] = [];
  const incorrectTrips: Trip[] = [];
  
  // Group trips by vehicle
  const tripsByVehicle = trips.reduce((acc, trip) => {
    if (!acc[trip.vehicle_id]) {
      acc[trip.vehicle_id] = [];
    }
    acc[trip.vehicle_id].push(trip);
    return acc;
  }, {} as Record<string, Trip[]>);

  // Check each vehicle's trips
  Object.entries(tripsByVehicle).forEach(([vehicleId, vehicleTrips]) => {
    const sortedTrips = vehicleTrips.sort((a, b) => 
      new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime()
    );
    
    let lastRefuelingTrip: Trip | null = null;
    
    for (const trip of sortedTrips) {
      if (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0) {
        // This is a refueling trip - calculate expected mileage
        let expectedMileage: number | undefined;
        
        if (lastRefuelingTrip) {
          // Use tank-to-tank method
          const totalDistance = trip.end_km - lastRefuelingTrip.end_km;
          expectedMileage = totalDistance > 0 ? parseFloat((totalDistance / trip.fuel_quantity).toFixed(2)) : undefined;
        } else {
          // First refueling trip
          const distance = trip.end_km - trip.start_km;
          expectedMileage = distance > 0 ? parseFloat((distance / trip.fuel_quantity).toFixed(2)) : undefined;
        }
        
        // Check if calculated mileage matches expected
        const calculatedMileage = trip.calculated_kmpl;
        const isCorrect = calculatedMileage === expectedMileage || 
          (calculatedMileage && expectedMileage && Math.abs(calculatedMileage - expectedMileage) < 0.01);
        
        if (isCorrect) {
          correctTrips.push(trip);
        } else {
          incorrectTrips.push({
            ...trip,
            calculated_kmpl: expectedMileage
          });
        }
        
        lastRefuelingTrip = trip;
      } else {
        // Non-refueling trip - should share mileage with last refueling trip
        const expectedMileage = lastRefuelingTrip?.calculated_kmpl;
        const calculatedMileage = trip.calculated_kmpl;
        const isCorrect = calculatedMileage === expectedMileage;
        
        if (isCorrect) {
          correctTrips.push(trip);
        } else {
          incorrectTrips.push({
            ...trip,
            calculated_kmpl: expectedMileage
          });
        }
      }
    }
  });
  
  // Generate fixed trips
  const fixedTrips = fixMileageForAllTrips(trips);
  
  return { correctTrips, incorrectTrips, fixedTrips };
}
