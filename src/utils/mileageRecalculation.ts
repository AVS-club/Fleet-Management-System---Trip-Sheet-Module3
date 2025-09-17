import { Trip } from '@/types';

/**
 * Recalculates mileage for a refueling trip using the tank-to-tank method
 * and updates related trips that should share the same mileage
 */
export function recalculateMileageForRefuelingTrip(
  currentTrip: Trip, 
  allTrips: Trip[]
): { updatedTrip: Trip; affectedTrips: Trip[] } {
  if (!currentTrip.refueling_done || !currentTrip.fuel_quantity || currentTrip.fuel_quantity <= 0) {
    return { updatedTrip: currentTrip, affectedTrips: [] };
  }

  // Find the most recent refueling trip for the same vehicle that occurred before the current trip
  const previousRefuelingTrips = allTrips
    .filter(trip => 
      trip.vehicle_id === currentTrip.vehicle_id && 
      trip.refueling_done &&
      trip.id !== currentTrip.id &&
      new Date(trip.trip_end_date) < new Date(currentTrip.trip_end_date)
    )
    .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());

  let calculatedMileage: number | undefined;

  if (previousRefuelingTrips.length === 0) {
    // For first refueling, calculate mileage based on just this trip
    const distance = currentTrip.end_km - currentTrip.start_km;
    calculatedMileage = distance > 0 ? parseFloat((distance / currentTrip.fuel_quantity).toFixed(2)) : undefined;
  } else {
    // Use tank-to-tank method: distance from previous refueling end to current refueling end
    const lastRefuelingTrip = previousRefuelingTrips[0];
    const totalDistance = currentTrip.end_km - lastRefuelingTrip.end_km;
    calculatedMileage = totalDistance > 0 ? parseFloat((totalDistance / currentTrip.fuel_quantity).toFixed(2)) : undefined;
  }

  // Update the current trip with the calculated mileage
  const updatedTrip = {
    ...currentTrip,
    calculated_kmpl: calculatedMileage
  };

  // Find trips that should share this mileage calculation
  // These are non-refueling trips that occurred between the last refueling and this refueling
  const affectedTrips: Trip[] = [];
  
  if (previousRefuelingTrips.length > 0 && calculatedMileage) {
    const lastRefuelingTrip = previousRefuelingTrips[0];
    
    // Find all non-refueling trips between the last refueling and current refueling
    const tripsToUpdate = allTrips.filter(trip =>
      trip.vehicle_id === currentTrip.vehicle_id &&
      !trip.refueling_done &&
      trip.id !== currentTrip.id &&
      new Date(trip.trip_end_date) > new Date(lastRefuelingTrip.trip_end_date) &&
      new Date(trip.trip_end_date) <= new Date(currentTrip.trip_end_date)
    );

    // Update these trips with the same mileage
    affectedTrips.push(...tripsToUpdate.map(trip => ({
      ...trip,
      calculated_kmpl: calculatedMileage
    })));
  }

  return { updatedTrip, affectedTrips };
}

/**
 * Recalculates mileage for all trips of a vehicle to ensure consistency
 */
export function recalculateAllMileageForVehicle(vehicleId: string, allTrips: Trip[]): Trip[] {
  const vehicleTrips = allTrips
    .filter(trip => trip.vehicle_id === vehicleId)
    .sort((a, b) => new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime());

  const updatedTrips: Trip[] = [];
  let lastRefuelingTrip: Trip | null = null;

  for (const trip of vehicleTrips) {
    if (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0) {
      // This is a refueling trip
      let calculatedMileage: number | undefined;

      if (lastRefuelingTrip) {
        // Use tank-to-tank method
        const totalDistance = trip.end_km - lastRefuelingTrip.end_km;
        calculatedMileage = totalDistance > 0 ? parseFloat((totalDistance / trip.fuel_quantity).toFixed(2)) : undefined;
      } else {
        // First refueling trip
        const distance = trip.end_km - trip.start_km;
        calculatedMileage = distance > 0 ? parseFloat((distance / trip.fuel_quantity).toFixed(2)) : undefined;
      }

      updatedTrips.push({
        ...trip,
        calculated_kmpl: calculatedMileage
      });

      lastRefuelingTrip = trip;
    } else {
      // This is a non-refueling trip
      // It should share the mileage of the most recent refueling trip
      const mileageToUse = lastRefuelingTrip?.calculated_kmpl;
      updatedTrips.push({
        ...trip,
        calculated_kmpl: mileageToUse
      });
    }
  }

  return updatedTrips;
}
