import { Trip, Vehicle } from '@/types';
import { NumberFormatter } from './numberFormatter';
import { getTotalFuelQuantity } from './mileageRecalculation';

interface TripEntry {
  start_km: number;
  end_km: number;
  fuel_liters: number;
  is_loaded?: boolean;
  vehicle_id?: string;
  driver_id?: string;
}

function calculateMileage(currentTrip: Trip, allTrips: Trip[]): number | undefined {
  const fuelQuantity = getTotalFuelQuantity(currentTrip);

  // If the current trip doesn't have refueling or fuel quantity is missing/invalid, we can't calculate
  if (!currentTrip.refueling_done || fuelQuantity <= 0) {
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
    return distance > 0 ? NumberFormatter.roundUp(distance / fuelQuantity, 2) : undefined;
  }

  const lastRefuelingTrip = previousRefuelingTrips[0];

  // Get all trips between last refueling trip and current trip (inclusive of current trip)
  const relevantTrips = allTrips
    .filter(trip =>
      trip.vehicle_id === currentTrip.vehicle_id &&
      new Date(trip.trip_end_date) > new Date(lastRefuelingTrip.trip_end_date) &&
      new Date(trip.trip_end_date) <= new Date(currentTrip.trip_end_date)
    )
    .sort((a, b) => new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime());

  // Calculate total distance covered between refuelings (tank-to-tank method)
  // This is the difference between the current trip's end KM and the last refueling trip's end KM
  const totalDistance = currentTrip.end_km - lastRefuelingTrip.end_km;

  // Calculate KMPL only if we have valid distance and fuel quantity
  if (totalDistance > 0 && fuelQuantity > 0) {
    return NumberFormatter.roundUp(totalDistance / fuelQuantity, 2);
  }

  return undefined;
}

function predictMileage(vehicle_id: string, allTrips: Trip[]): number | undefined {
  const vehicleTrips = allTrips
    .filter(trip =>
      trip.vehicle_id === vehicle_id &&
      trip.calculated_kmpl
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

interface SegmentWiseSavings {
  [segment: string]: number;
}

interface MileageInsights {
  avgMileage: number;
  bestVehicle?: string;
  bestVehicleMileage?: number;
  bestDriver?: string;
  bestDriverMileage?: number;
  estimatedFuelSaved: number;
  segmentWiseSavings?: SegmentWiseSavings;
}

export function getMileageInsights(trips: Trip[], vehicles?: Vehicle[]): MileageInsights {
  // Default implementation with overall stats
  const mileageByVehicle: Record<string, number[]> = {};
  const mileageByDriver: Record<string, number[]> = {};

  // If no vehicles are provided, use the original calculation
  if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
    let totalKm = 0;
    let totalFuel = 0;

    if (Array.isArray(trips)) {
      for (const trip of trips) {
        if (trip.calculated_kmpl) {
          const distance = trip.end_km - trip.start_km;
          const fuel = getTotalFuelQuantity(trip);

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
      bestVehicle: bestVehicle?.[0],
      bestVehicleMileage: bestVehicle?.[1],
      bestDriver: bestDriver?.[0],
      bestDriverMileage: bestDriver?.[1],
      estimatedFuelSaved,
    };
  }

  // New implementation with segment-wise calculations
  
  // Define relevant segment tags to look for
  const segmentTags = ['4W Pickup', '6W Truck', '10W Truck', 'LMV', 'HMV', 'Light Truck', 'Heavy Truck'];
  
  // Create vehicle map to quickly look up vehicle data
  const vehicleMap = new Map<string, Vehicle>();
  vehicles.forEach(v => vehicleMap.set(v.id, v));

  // Group vehicles by segment tag
  const vehiclesBySegment: Record<string, string[]> = {};
  
  vehicles.forEach(vehicle => {
    // Skip archived vehicles
    if (vehicle.status === 'archived') {
      return;
    }
    
    // Check if vehicle has tags
    if (Array.isArray(vehicle.tags)) {
      // Find the first matching segment tag
      const matchingTag = vehicle.tags.find(tag => segmentTags.includes(tag));
      if (matchingTag) {
        if (!vehiclesBySegment[matchingTag]) {
          vehiclesBySegment[matchingTag] = [];
        }
        vehiclesBySegment[matchingTag].push(vehicle.id);
      }
    }
  });
  
  // If no segments were found, create a default "All Vehicles" segment
  if (Object.keys(vehiclesBySegment).length === 0) {
    const allVehicleIds = vehicles
      .filter(v => v.status !== 'archived')
      .map(v => v.id);
    
    if (allVehicleIds.length > 0) {
      vehiclesBySegment['All Vehicles'] = allVehicleIds;
    }
  }
  
  // Data structures to track mileage by driver per segment
  interface DriverMileageData {
    driverId: string;
    totalDistance: number;
    totalFuel: number;
    tripCount: number;
    mileage: number;
  }
  
  const segmentData: Record<string, {
    vehicleIds: string[];
    driverMileage: Record<string, DriverMileageData>;
    bestDriver?: { driverId: string; mileage: number };
    worstDriver?: { driverId: string; mileage: number };
    estimatedSavings: number;
  }> = {};
  
  // Initialize segment data
  Object.entries(vehiclesBySegment).forEach(([segment, vehicleIds]) => {
    segmentData[segment] = {
      vehicleIds,
      driverMileage: {},
      estimatedSavings: 0
    };
  });
  
  // Process all trips to accumulate data per segment
  if (Array.isArray(trips)) {
    trips.forEach(trip => {
      if (trip.calculated_kmpl && trip.vehicle_id && trip.driver_id) {
        const vehicle = vehicleMap.get(trip.vehicle_id);
        
        if (!vehicle) return; // Skip if vehicle not found
        
        // Find which segment this vehicle belongs to
        let segment: string | undefined;
        
        if (Array.isArray(vehicle.tags)) {
          // Find the first matching segment tag
          const matchingTag = vehicle.tags.find(tag => segmentTags.includes(tag));
          if (matchingTag) {
            segment = matchingTag;
          }
        }
        
        // Use default segment if no matching tag found
        if (!segment && Object.keys(vehiclesBySegment).includes('All Vehicles')) {
          segment = 'All Vehicles';
        }
        
        if (!segment) return; // Skip if no segment found
        
        // Process trip data for this segment
        const distance = trip.end_km - trip.start_km;
        const fuel = getTotalFuelQuantity(trip);
        
        if (distance > 0 && fuel > 0) {
          const driverId = trip.driver_id;
          
          // Initialize driver data if not exists
          if (!segmentData[segment].driverMileage[driverId]) {
            segmentData[segment].driverMileage[driverId] = {
              driverId,
              totalDistance: 0,
              totalFuel: 0,
              tripCount: 0,
              mileage: 0
            };
          }
          
          // Update driver's stats
          const driverData = segmentData[segment].driverMileage[driverId];
          driverData.totalDistance += distance;
          driverData.totalFuel += fuel;
          driverData.tripCount++;
          
          // Calculate updated average mileage
          driverData.mileage = driverData.totalDistance / driverData.totalFuel;
        }
      }
    });
  }
  
  // Calculate best and worst driver for each segment
  const fuelCostPerLiter = 90;
  const distanceSample = 1000;
  let totalSavings = 0;
  const segmentWiseSavings: SegmentWiseSavings = {};
  
  Object.entries(segmentData).forEach(([segment, data]) => {
    const drivers = Object.values(data.driverMileage);
    
    // Need at least 2 drivers to calculate savings
    if (drivers.length < 2) {
      data.estimatedSavings = 0;
      segmentWiseSavings[segment] = 0;
      return;
    }
    
    // Filter drivers with valid mileage data
    const validDrivers = drivers.filter(d => d.tripCount > 0 && d.mileage > 0);
    if (validDrivers.length < 2) {
      data.estimatedSavings = 0;
      segmentWiseSavings[segment] = 0;
      return;
    }
    
    // Find best and worst drivers
    const sortedDrivers = [...validDrivers].sort((a, b) => b.mileage - a.mileage);
    const bestDriver = sortedDrivers[0];
    const worstDriver = sortedDrivers[sortedDrivers.length - 1];
    
    // Update segment data
    data.bestDriver = { driverId: bestDriver.driverId, mileage: bestDriver.mileage };
    data.worstDriver = { driverId: worstDriver.driverId, mileage: worstDriver.mileage };
    
    // Calculate savings
    const mileageDiff = bestDriver.mileage - worstDriver.mileage;
    if (mileageDiff > 0) {
      // Formula: (mileageDiff * distanceSample * fuelCostPerLiter) / bestMileage
      const segmentSavings = parseFloat(((mileageDiff * distanceSample * fuelCostPerLiter) / bestDriver.mileage).toFixed(2));
      data.estimatedSavings = segmentSavings;
      segmentWiseSavings[segment] = segmentSavings;
      totalSavings += segmentSavings;
    } else {
      data.estimatedSavings = 0;
      segmentWiseSavings[segment] = 0;
    }
  });
  
  // Calculate overall averages from trips for compatibility
  let totalKm = 0;
  let totalFuel = 0;
  
  if (Array.isArray(trips)) {
    for (const trip of trips) {
      if (trip.calculated_kmpl) {
        const distance = trip.end_km - trip.start_km;
        const fuel = getTotalFuelQuantity(trip);
        
        if (distance > 0 && fuel > 0) {
          totalKm += distance;
          totalFuel += fuel;
        }
      }
    }
  }
  
  const avgMileage = totalFuel > 0 ? parseFloat((totalKm / totalFuel).toFixed(2)) : 0;
  
  // Get overall best vehicle and driver (for compatibility)
  const bestVehicle = Object.keys(mileageByVehicle).length > 0 
    ? Object.entries(mileageByVehicle)
      .map(([vehicle, values]) => [vehicle, values.reduce((a, b) => a + b, 0) / values.length] as const)
      .sort((a, b) => b[1] - a[1])[0]
    : undefined;
    
  // Find overall best driver
  const allDriverMileages = Object.values(segmentData)
    .flatMap(segment => Object.values(segment.driverMileage))
    .reduce((acc, curr) => {
      if (!acc[curr.driverId]) {
        acc[curr.driverId] = {
          driverId: curr.driverId,
          totalDistance: 0,
          totalFuel: 0,
          tripCount: 0,
          mileage: 0
        };
      }
      acc[curr.driverId].totalDistance += curr.totalDistance;
      acc[curr.driverId].totalFuel += curr.totalFuel;
      acc[curr.driverId].tripCount += curr.tripCount;
      acc[curr.driverId].mileage = acc[curr.driverId].totalDistance / acc[curr.driverId].totalFuel;
      return acc;
    }, {} as Record<string, DriverMileageData>);
    
  const overallBestDriver = Object.values(allDriverMileages).length > 0
    ? Object.values(allDriverMileages)
      .filter(d => d.mileage > 0)
      .sort((a, b) => b.mileage - a.mileage)[0]
    : undefined;
  
  return {
    avgMileage,
    bestVehicle: bestVehicle?.[0],
    bestVehicleMileage: bestVehicle?.[1],
    bestDriver: overallBestDriver?.driverId,
    bestDriverMileage: overallBestDriver?.mileage,
    estimatedFuelSaved: parseFloat(totalSavings.toFixed(2)),
    segmentWiseSavings
  };
}
