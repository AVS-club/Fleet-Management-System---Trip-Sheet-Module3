import { Trip } from '../types';

export interface TripEntry {
  start_km: number;
  end_km: number;
  fuel_liters: number;
  is_loaded?: boolean;
  vehicle_id?: string;
  driver_id?: string;
}

export function calculateMileage(currentTrip: Trip, allTrips: Trip[]): number | undefined {
  // If the current trip doesn't have refueling or fuel quantity is missing/invalid, we can't calculate
  if (!currentTrip.refueling_done || !currentTrip.fuel_quantity || currentTrip.fuel_quantity <= 0) {
    return undefined;
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

  if (previousRefuelingTrips.length === 0) {
    // For first refueling, calculate mileage based on just this trip
    const distance = currentTrip.end_km - currentTrip.start_km;
    return distance > 0 ? parseFloat((distance / currentTrip.fuel_quantity).toFixed(2)) : undefined;
  }

  const lastRefuelingTrip = previousRefuelingTrips[0];

  // Get all trips between last refueling trip and current trip (inclusive of current trip)
  const relevantTrips = allTrips
    .filter(trip => 
      trip.vehicle_id === currentTrip.vehicle_id && 
      !trip.short_trip &&
      new Date(trip.trip_end_date) > new Date(lastRefuelingTrip.trip_end_date) && 
      new Date(trip.trip_end_date) <= new Date(currentTrip.trip_end_date)
    )
    .sort((a, b) => new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime());

  // Calculate total distance covered between refuelings (tank-to-tank method)
  // This is the difference between the current trip's end KM and the last refueling trip's end KM
  const totalDistance = currentTrip.end_km - lastRefuelingTrip.end_km;

  // Calculate KMPL only if we have valid distance and fuel quantity
  if (totalDistance > 0 && currentTrip.fuel_quantity > 0) {
    return parseFloat((totalDistance / currentTrip.fuel_quantity).toFixed(2));
  }

  return undefined;
}

export function predictMileage(vehicle_id: string, allTrips: Trip[]): number | undefined {
  const vehicleTrips = allTrips
    .filter(trip => 
      trip.vehicle_id === vehicle_id && 
      trip.calculated_kmpl && 
      !trip.short_trip
    )
    .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());

  if (vehicleTrips.length < 3) {
    return undefined;
  }

  // Calculate weighted average of last 5 KMPL values
  // More recent trips have higher weight
  const tripsToUse = vehicleTrips.slice(0, 5);
  const totalWeight = tripsToUse.length * (tripsToUse.length + 1) / 2;
  
  let weightedSum = 0;
  tripsToUse.forEach((trip, index) => {
    const weight = tripsToUse.length - index;
    weightedSum += (trip.calculated_kmpl || 0) * weight;
  });

  return parseFloat((weightedSum / totalWeight).toFixed(2));
}

export function getMileageInsights(trips: Trip[]) {
  const mileageByVehicle: Record<string, number[]> = {};
  const mileageByDriver: Record<string, number[]> = {};

  let totalKm = 0;
  let totalFuel = 0;

  if (Array.isArray(trips)) {
    for (const trip of trips) {
      if (!trip.short_trip && trip.calculated_kmpl) {
        const distance = trip.end_km - trip.start_km;
        const fuel = trip.fuel_quantity || 0;

        if (distance > 0 && fuel > 0) {
          totalKm += distance;
          totalFuel += fuel;

          if (trip.vehicle_id) {
            mileageByVehicle[trip.vehicle_id] ??= [];
            mileageByVehicle[trip.vehicle_id].push(trip.calculated_kmpl);
          }

          if (trip.driver_id) {
            mileageByDriver[trip.driver_id] ??= [];
            mileageByDriver[trip.driver_id].push(trip.calculated_kmpl);
          }
        }
      }
    }
  }

  const avgMileage = totalFuel > 0 ? parseFloat((totalKm / totalFuel).toFixed(2)) : 0;

  const bestVehicle = Object.keys(mileageByVehicle).length > 0 
    ? Object.entries(mileageByVehicle)
      .map(([vehicle, values]) => [vehicle, values.reduce((a, b) => a + b, 0) / values.length] as const)
      .sort((a, b) => b[1] - a[1])[0]
    : undefined;

  const bestDriver = Object.keys(mileageByDriver).length > 0
    ? Object.entries(mileageByDriver)
      .map(([driver, values]) => [driver, values.reduce((a, b) => a + b, 0) / values.length] as const)
      .sort((a, b) => b[1] - a[1])[0]
    : undefined;

  const worstDriver = Object.keys(mileageByDriver).length > 0
    ? Object.entries(mileageByDriver)
      .map(([driver, values]) => [driver, values.reduce((a, b) => a + b, 0) / values.length] as const)
      .sort((a, b) => a[1] - b[1])[0]
    : undefined;

  const fuelCostPerLiter = 90;
  const fuelDiff = (bestDriver?.[1] || 0) - (worstDriver?.[1] || 0);
  const distanceSample = 1000;
  const estimatedFuelSaved = bestDriver?.[1] 
    ? parseFloat(((fuelDiff > 0 ? fuelDiff : 0) * distanceSample * fuelCostPerLiter / bestDriver[1]).toFixed(2))
    : 0;

  return {
    avgMileage,
    bestVehicle: bestVehicle?.[0] || undefined,
    bestVehicleMileage: bestVehicle?.[1] || undefined,
    bestDriver: bestDriver?.[0] || undefined,
    bestDriverMileage: bestDriver?.[1] || undefined,
    estimatedFuelSaved,
  };
}