import { Trip } from '@/types';

const roundToTwoDecimals = (value: number): number => parseFloat(value.toFixed(2));

const getTimeValue = (date: string): number => new Date(date).getTime();

export function recalculateMileageForRefuelingTrip(
  currentTrip: Trip,
  allTrips: Trip[]
): { updatedTrip: Trip; affectedTrips: Trip[] } {
  if (!currentTrip.refueling_done || !currentTrip.fuel_quantity || currentTrip.fuel_quantity <= 0) {
    return { updatedTrip: currentTrip, affectedTrips: [] };
  }

  const currentTripEnd = getTimeValue(currentTrip.trip_end_date);

  const previousTrips = allTrips
    .filter(trip =>
      trip.vehicle_id === currentTrip.vehicle_id &&
      trip.id !== currentTrip.id &&
      getTimeValue(trip.trip_end_date) < currentTripEnd
    )
    .sort((a, b) => getTimeValue(b.trip_end_date) - getTimeValue(a.trip_end_date));

  const lastRefuelingTrip = previousTrips.find(trip =>
    trip.refueling_done &&
    trip.fuel_quantity &&
    trip.fuel_quantity > 0
  ) || null;

  const immediatePreviousTrip = previousTrips[0] ?? null;

  const calculateMileageFromDistance = (distance: number): number | undefined => {
    if (distance > 0 && currentTrip.fuel_quantity && currentTrip.fuel_quantity > 0) {
      return roundToTwoDecimals(distance / currentTrip.fuel_quantity);
    }
    return undefined;
  };

  let calculatedMileage: number | undefined;

  if (lastRefuelingTrip) {
    const tankToTankDistance = currentTrip.end_km - lastRefuelingTrip.end_km;
    calculatedMileage = calculateMileageFromDistance(tankToTankDistance);

    if (!calculatedMileage && immediatePreviousTrip) {
      const fallbackDistance = currentTrip.end_km - immediatePreviousTrip.end_km;
      calculatedMileage = calculateMileageFromDistance(fallbackDistance);
    }
  } else {
    const distanceFromStart = currentTrip.end_km - currentTrip.start_km;
    calculatedMileage = calculateMileageFromDistance(distanceFromStart);

    if (!calculatedMileage && immediatePreviousTrip) {
      const fallbackDistance = currentTrip.end_km - immediatePreviousTrip.end_km;
      calculatedMileage = calculateMileageFromDistance(fallbackDistance);
    }
  }

  const updatedTrip: Trip = {
    ...currentTrip,
    calculated_kmpl: calculatedMileage
  };

  const affectedTrips: Trip[] = [];

  if (calculatedMileage) {
    if (lastRefuelingTrip) {
      const lastRefuelEnd = getTimeValue(lastRefuelingTrip.trip_end_date);
      const tripsToUpdate = allTrips
        .filter(trip =>
          trip.vehicle_id === currentTrip.vehicle_id &&
          !trip.refueling_done &&
          trip.id !== currentTrip.id &&
          getTimeValue(trip.trip_end_date) > lastRefuelEnd &&
          getTimeValue(trip.trip_end_date) <= currentTripEnd
        )
        .map(trip => ({
          ...trip,
          calculated_kmpl: calculatedMileage
        }));

      affectedTrips.push(...tripsToUpdate);
    } else if (immediatePreviousTrip && !immediatePreviousTrip.refueling_done) {
      affectedTrips.push({
        ...immediatePreviousTrip,
        calculated_kmpl: calculatedMileage
      });
    }
  }

  return { updatedTrip, affectedTrips };
}

export function recalculateAllMileageForVehicle(vehicleId: string, allTrips: Trip[]): Trip[] {
  const vehicleTrips = allTrips
    .filter(trip => trip.vehicle_id === vehicleId)
    .sort((a, b) => getTimeValue(a.trip_end_date) - getTimeValue(b.trip_end_date));

  const updatedTrips: Trip[] = [];
  let lastRefuelingEndKm: number | null = null;
  let lastRefuelingMileage: number | undefined;

  for (const trip of vehicleTrips) {
    if (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0) {
      let calculatedMileage: number | undefined;

      if (lastRefuelingEndKm !== null) {
        const tankToTankDistance = trip.end_km - lastRefuelingEndKm;
        if (tankToTankDistance > 0) {
          calculatedMileage = roundToTwoDecimals(tankToTankDistance / trip.fuel_quantity);
        }
      } else {
        const tripDistance = trip.end_km - trip.start_km;
        if (tripDistance > 0) {
          calculatedMileage = roundToTwoDecimals(tripDistance / trip.fuel_quantity);
        }
      }

      if (!calculatedMileage) {
        const previousTrip = updatedTrips[updatedTrips.length - 1];
        if (previousTrip) {
          const fallbackDistance = trip.end_km - previousTrip.end_km;
          if (fallbackDistance > 0) {
            calculatedMileage = roundToTwoDecimals(fallbackDistance / trip.fuel_quantity);
          }
        }
      }

      const recalculatedTrip: Trip = {
        ...trip,
        calculated_kmpl: calculatedMileage
      };

      updatedTrips.push(recalculatedTrip);
      lastRefuelingEndKm = trip.end_km;
      lastRefuelingMileage = calculatedMileage;
    } else {
      updatedTrips.push({
        ...trip,
        calculated_kmpl: lastRefuelingMileage
      });
    }
  }

  return updatedTrips;
}
