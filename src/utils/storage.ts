import { supabase } from './supabaseClient';
import { Vehicle, Driver, Trip, Destination, Warehouse } from '../types';
import { nanoid } from 'nanoid';
import { calculateMileage } from './mileageCalculator';
import { logVehicleActivity } from './vehicleActivity';

// Vehicle CRUD operations
export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Error fetching user data');
    return [];
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('added_by', user.id)
    .order('created_at', { ascending: false });

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
    .insert(vehicle)
    .select()
    .single();

  if (error) {
    console.error('Error creating vehicle:', error);
    return null;
  }

  return data;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle:', error);
    return null;
  }

  return data;
};

export const deleteVehicle = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Get current user for activity logging
    const { data: { user } } = await supabase.auth.getUser();
    const userName = user?.email || 'Unknown User';

    // Get vehicle details for logging
    const vehicle = await getVehicle(id);
    if (!vehicle) {
      return { success: false, message: 'Vehicle not found' };
    }

    // Attempt to delete the vehicle
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      
      // Check for foreign key constraint violation
      if (error.code === '23503' || error.message.includes('foreign key constraint')) {
        // Log the failed deletion attempt
        await logVehicleActivity(
          id,
          'permanently_deleted',
          userName,
          `Failed deletion attempt: Vehicle has associated records (${error.message})`
        );
        
        return { 
          success: false, 
          message: 'Cannot delete vehicle: It has associated trips, maintenance records, or driver assignments. Please remove these associations first or consider archiving the vehicle instead.' 
        };
      }
      
      // For other database errors
      return { 
        success: false, 
        message: `Failed to delete vehicle: ${error.message}` 
      };
    }

    // Log successful deletion
    await logVehicleActivity(
      id,
      'permanently_deleted',
      userName,
      `Vehicle ${vehicle.registration_number} permanently deleted`
    );

    return { 
      success: true, 
      message: 'Vehicle deleted successfully' 
    };
  } catch (error) {
    console.error('Exception in deleteVehicle:', error);
    return { 
      success: false, 
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// Driver CRUD operations
export const getDrivers = async (): Promise<Driver[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Error fetching user data');
    return [];
  }

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('added_by', user.id)
    .order('created_at', { ascending: false });

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
    .insert(driver)
    .select()
    .single();

  if (error) {
    console.error('Error creating driver:', error);
    return null;
  }

  return data;
};

export const updateDriver = async (id: string, updates: Partial<Driver>): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating driver:', error);
    return null;
  }

  return data;
};

export const uploadDriverPhoto = async (file: File, driverId: string): Promise<string | null> => {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${driverId}_photo.${fileExt}`;
  const filePath = `driver-photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('drivers')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Error uploading driver photo:', uploadError);
    return null;
  }

  const { data } = supabase.storage.from('drivers').getPublicUrl(filePath);
  return data.publicUrl;
};

// Trip CRUD operations
export const getTrips = async (): Promise<Trip[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Error fetching user data');
    return [];
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('added_by', user.id)
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

export const createTrip = async (trip: Omit<Trip, 'id' | 'created_at' | 'updated_at'>): Promise<Trip | null> => {
  // Generate trip serial number
  const tripSerial = `T${String(Date.now()).slice(-6)}`;
  
  const tripData = {
    ...trip,
    trip_serial_number: tripSerial,
  };

  const { data, error } = await supabase
    .from('trips')
    .insert(tripData)
    .select()
    .single();

  if (error) {
    console.error('Error creating trip:', error);
    return null;
  }

  return data;
};

export const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
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

// Warehouse operations
export const getWarehouses = async (): Promise<Warehouse[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Error fetching user data');
    return [];
  }

  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('created_by', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

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

// Destination operations
export const getDestinations = async (): Promise<Destination[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Error fetching user data');
    return [];
  }

  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

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
    .insert(destination)
    .select()
    .single();

  if (error) {
    console.error('Error creating destination:', error);
    return null;
  }

  return data;
};

export const hardDeleteDestination = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('destinations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting destination:', error);
    throw error;
  }

  return true;
};

// Bulk operations
export const bulkArchiveVehicles = async (vehicleIds: string[]): Promise<{ success: number; failed: number }> => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'archived' })
      .in('id', vehicleIds);
    
    if (error) {
      console.error('Supabase bulk archive error:', error);
      return { success: 0, failed: vehicleIds.length };
    }
    
    return { success: vehicleIds.length, failed: 0 };
  } catch (error) {
    console.error('Error bulk archiving vehicles:', error);
    return { success: 0, failed: vehicleIds.length };
  }
};

// Route analysis
export const analyzeRoute = async (warehouseId: string, destinationIds: string[]): Promise<any> => {
  // This would implement route analysis logic
  return null;
};

// Vehicle stats
export const getVehicleStats = async (vehicleId: string): Promise<any> => {
  const trips = await getTrips();
  const vehicleTrips = trips.filter(trip => trip.vehicle_id === vehicleId);
  
  const totalTrips = vehicleTrips.length;
  const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
  
  const tripsWithKmpl = vehicleTrips.filter(trip => trip.calculated_kmpl && !trip.short_trip);
  const averageKmpl = tripsWithKmpl.length > 0
    ? tripsWithKmpl.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithKmpl.length
    : undefined;

  return {
    totalTrips,
    totalDistance,
    averageKmpl
  };
};

// Latest odometer reading
export const getLatestOdometer = async (vehicleId: string): Promise<{ value: number; date: string }> => {
  const { data, error } = await supabase
    .from('trips')
    .select('end_km, trip_end_date')
    .eq('vehicle_id', vehicleId)
    .order('trip_end_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback to vehicle's current odometer
    const vehicle = await getVehicle(vehicleId);
    return {
      value: vehicle?.current_odometer || 0,
      date: new Date().toISOString()
    };
  }

  return {
    value: data.end_km,
    date: data.trip_end_date
  };
};