import { Trip, Vehicle, Driver, Warehouse, Destination, RouteAnalysis, Alert } from '../types'; 
import { supabase } from './supabaseClient';

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str: string) => 
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Convert object keys from camelCase to snake_case
const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const newObj: Record<string, any> = {};
  
  Object.keys(obj).forEach(key => {
    const newKey = toSnakeCase(key);
    const value = obj[key];
    
    newObj[newKey] = value && typeof value === 'object' && !Array.isArray(value)
      ? convertKeysToSnakeCase(value)
      : value;
  });
  
  return newObj;
};
import { calculateMileage } from './mileageCalculator';

// Generate Trip ID based on vehicle registration
const generateTripId = async (vehicleId: string): Promise<string> => {
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');

  // Extract last 4 digits from registration number
  const regMatch = vehicle.registration_number.match(/\d{4}$/);
  if (!regMatch) throw new Error('Invalid vehicle registration format');
  
  const prefix = regMatch[0];
  
  // Get latest trip number for this vehicle
  const { data: latestTrip } = await supabase
    .from('trips')
    .select('trip_serial_number')
    .eq('vehicle_id', vehicleId)
    .order('trip_serial_number', { ascending: false })
    .limit(1);

  const lastNum = latestTrip?.[0]?.trip_serial_number 
    ? parseInt(latestTrip[0].trip_serial_number.slice(-4))
    : 0;

  const nextNum = lastNum + 1;

  // Format: XXXX0001 where XXXX is last 4 digits of registration
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// Trips CRUD operations with Supabase
export const getTrips = async (): Promise<Trip[]> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('trip_start_date', { ascending: false });

  if (error) {
    console.error('Error fetching trips:', error);
    return [];
  }

  return data || [];
};

export const getTrip = async (id: string): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching trip:', error);
    return null;
  }

  return data;
};

export const createTrip = async (trip: Omit<Trip, 'id' | 'trip_serial_number'>): Promise<Trip | null> => {
  const tripId = await generateTripId(trip.vehicle_id);
  
  const { data, error } = await supabase
    .from('trips')
    .insert({
    trip_serial_number: tripId,
    ...trip,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating trip:', error);
    return null;
  }

  return data;
};

export const updateTrip = async (id: string, updatedTrip: Partial<Trip>): Promise<Trip | null> => {
  const { data: oldTrip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (!oldTrip) {
    console.error('Trip not found:', id);
    return null;
  }

  const { data, error } = await supabase
    .from('trips')
    .update({
      ...updatedTrip,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating trip:', error);
    return null;
  }

  return data;
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting trip:', error);
    return false;
  }

  return true;
};

export const recalculateMileageForAffectedTrips = async (changedTrip: Trip): Promise<void> => {
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('vehicle_id', changedTrip.vehicle_id)
    .gte('trip_end_date', changedTrip.trip_end_date)
    .order('trip_end_date', { ascending: true });

  if (!trips || !Array.isArray(trips) || trips.length === 0) return;

  // Find all refueling trips for the same vehicle that occurred after the changed trip
  const affectedTrips = trips.filter(trip => 
    trip.refueling_done &&
    trip.fuel_quantity &&
    trip.fuel_quantity > 0 &&
    trip.id !== changedTrip.id
  );

  if (affectedTrips.length === 0) return;

  for (const trip of affectedTrips) {
    const calculatedKmpl = calculateMileage(trip, trips);
    await supabase
      .from('trips')
      .update({ calculated_kmpl: calculatedKmpl })
      .eq('id', trip.id);
  }
};

// Vehicles CRUD operations with Supabase
export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('registration_number');

  if (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }

  return data || [];
};

export const getVehicle = async (id: string): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching vehicle:', error);
    return null;
  }

  return data;
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(convertKeysToSnakeCase(vehicle))
    .select()
    .single();

  if (error) {
    console.error('Error creating vehicle:', error);
    return null;
  }

  return data;
};

export const updateVehicle = async (id: string, updatedVehicle: Partial<Vehicle>): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      ...updatedVehicle,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle:', error);
    return null;
  }

  return data;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting vehicle:', error);
    return false;
  }

  return true;
};

// Drivers CRUD operations with Supabase
export const getDrivers = async (): Promise<Driver[]> => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }

  return data || [];
};

export const getDriver = async (id: string): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching driver:', error);
    return null;
  }

  return data;
};

export const createDriver = async (driver: Omit<Driver, 'id'>): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from('drivers')
    .insert(convertKeysToSnakeCase(driver))
    .select()
    .single();

  if (error) {
    console.error('Error creating driver:', error);
    return null;
  }

  return data;
};

export const updateDriver = async (id: string, updatedDriver: Partial<Driver>): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from('drivers')
    .update({
      ...updatedDriver,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating driver:', error);
    return null;
  }

  return data;
};

export const deleteDriver = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting driver:', error);
    return false;
  }

  return true;
};

// Warehouses CRUD operations with Supabase
export const getWarehouses = async (): Promise<Warehouse[]> => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching warehouses:', error);
    return [];
  }

  return data || [];
};

export const getWarehouse = async (id: string): Promise<Warehouse | null> => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching warehouse:', error);
    return null;
  }

  return data;
};

export const createWarehouse = async (warehouse: Omit<Warehouse, 'id'>): Promise<Warehouse | null> => {
  const { data, error } = await supabase
    .from('warehouses')
    .insert(convertKeysToSnakeCase(warehouse))
    .select()
    .single();

  if (error) {
    console.error('Error creating warehouse:', error);
    return null;
  }

  return data;
};

export const updateWarehouse = async (id: string, updates: Partial<Warehouse>): Promise<Warehouse | null> => {
  const { data, error } = await supabase
    .from('warehouses')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating warehouse:', error);
    return null;
  }

  return data;
};

export const deleteWarehouse = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting warehouse:', error);
    return false;
  }

  return true;
};

// Destinations CRUD operations with Supabase
export const getDestinations = async (): Promise<Destination[]> => {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching destinations:', error);
    return [];
  }

  return data || [];
};

export const getDestination = async (id: string): Promise<Destination | null> => {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching destination:', error);
    return null;
  }

  return data;
};

export const createDestination = async (destination: Omit<Destination, 'id'>): Promise<Destination | null> => {
  const { data, error } = await supabase
    .from('destinations')
    .insert(convertKeysToSnakeCase(destination)) // Use convertKeysToSnakeCase
    .select()
    .single();

  if (error) {
    console.error('Error creating destination:', error);
    return null;
  }

  return data;
};

export const updateDestination = async (id: string, updates: Partial<Destination>): Promise<Destination | null> => {
  const { data, error } = await supabase
    .from('destinations')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating destination:', error);
    return null;
  }

  return data;
};

export const deleteDestination = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('destinations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting destination:', error);
    return false;
  }

  return true;
};

// Route Analysis
export const analyzeRoute = async (
  warehouseId: string,
  destinationIds: string[]
): Promise<RouteAnalysis | undefined> => {
  const warehouse = await getWarehouse(warehouseId);
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .in('id', destinationIds);

  if (!warehouse || !destinations || !Array.isArray(destinations) || destinations.length === 0) return undefined;

  // Calculate total standard distance and estimated time
  let totalDistance = 0;
  let totalMinutes = 0;

  destinations.forEach(dest => {
    totalDistance += dest.standardDistance;
    const timeMatch = dest.estimatedTime.match(/(\d+)h\s*(?:(\d+)m)?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || '0');
      const minutes = parseInt(timeMatch[2] || '0');
      totalMinutes += hours * 60 + minutes;
    }
  });

  return {
    total_distance: totalDistance,
    standard_distance: totalDistance,
    deviation: 0, // This will be calculated when actual distance is known
    estimated_time: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    waypoints: [
      { lat: warehouse.latitude, lng: warehouse.longitude },
      ...destinations.map(d => ({ lat: d.latitude, lng: d.longitude }))
    ]
  };
};

// Generate alerts based on route analysis
export const generateAlerts = async (analysis: RouteAnalysis): Promise<Alert[]> => {
  const alerts: Alert[] = [];

  if (Math.abs(analysis.deviation) > 15) {
    alerts.push({
      type: 'deviation',
      message: 'Significant route deviation detected',
      severity: Math.abs(analysis.deviation) > 25 ? 'high' : 'medium',
      details: `Route shows ${Math.abs(analysis.deviation).toFixed(1)}% deviation from standard distance`
    });
  }

  return alerts;
};

// Vehicle stats
export const getVehicleStats = async (vehicleId: string) => {
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('vehicle_id', vehicleId);

  if (!trips || !Array.isArray(trips)) return { totalTrips: 0, totalDistance: 0 };

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
  const tripsWithKmpl = trips.filter(trip => trip.calculated_kmpl !== undefined && !trip.short_trip);
  const averageKmpl = tripsWithKmpl.length > 0
    ? tripsWithKmpl.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithKmpl.length
    : undefined;

  return {
    totalTrips,
    totalDistance,
    averageKmpl
  };
};

// Update all trip mileage
export const updateAllTripMileage = async (): Promise<void> => {
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .order('trip_end_date', { ascending: true });

  if (!trips || !Array.isArray(trips)) return;

  for (const trip of trips) {
    if (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0) {
      const calculatedKmpl = calculateMileage(trip, trips);
      await supabase
        .from('trips')
        .update({ calculated_kmpl: calculatedKmpl })
        .eq('id', trip.id);
    }
  }
};

export default {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  getWarehouses,
  getWarehouse,
  getDestinations,
  analyzeRoute,
  generateAlerts,
  getVehicleStats,
  updateAllTripMileage
};
