import { Trip, Vehicle, Driver, Warehouse, Destination, RouteAnalysis, Alert } from '../types'; 
import { supabase } from './supabaseClient';
import { logVehicleActivity } from './vehicleActivity';

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

// Helper function to upload vehicle profile JSON to Supabase Storage
const uploadVehicleProfile = async (vehicle: Vehicle): Promise<void> => {
  try {
    const fileName = `${vehicle.id}.json`;
    const filePath = fileName;
    
    // Create JSON blob
    const jsonBlob = new Blob([JSON.stringify(vehicle, null, 2)], {
      type: 'application/json'
    });
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('vehicle-profiles')
      .upload(filePath, jsonBlob, {
        upsert: true,
        contentType: 'application/json'
      });
      
    if (uploadError) {
      console.error('Error uploading vehicle profile:', uploadError);
      // Don't throw error to avoid breaking the main operation
    }
  } catch (error) {
    console.error('Error creating vehicle profile JSON:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Generate Trip ID based on vehicle registration
const generateTripId = async (vehicleId: string): Promise<string> => {
  // Validate vehicleId
  if (!vehicleId) {
    throw new Error('Vehicle ID is required to generate a trip ID');
  }

  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) {
    console.error(`Vehicle with ID ${vehicleId} not found`);
    throw new Error(`Vehicle with ID ${vehicleId} not found`);
  }

  // Extract last 4 digits from registration number
  const regMatch = vehicle.registration_number.match(/\d{4}$/);
  if (!regMatch) {
    console.error(`Invalid registration format for vehicle: ${vehicle.registration_number}`);
    throw new Error(`Invalid registration format for vehicle: ${vehicle.registration_number}`);
  }
  
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
  // Validate required fields
  if (!trip.vehicle_id) {
    console.error('Vehicle ID is missing for trip creation');
    throw new Error('Vehicle ID is required to create a trip');
  }

  const tripId = await generateTripId(trip.vehicle_id);
  
  // Ensure material_type_ids is properly handled
  const tripData = {
    ...trip,
    trip_serial_number: tripId
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
  // Process the vehicle data to handle file uploads and document flags
  const processedVehicle = {
    ...vehicle,
    // Set document flags based on URL presence
    rc_copy: !!vehicle.rc_document_url,
    insurance_document: !!vehicle.insurance_document_url,
    fitness_document: !!vehicle.fitness_document_url,
    tax_receipt_document: !!vehicle.tax_document_url,
    permit_document: !!vehicle.permit_document_url,
    puc_document: !!vehicle.puc_document_url,
  };
  
  // Remove file objects as they can't be stored in the database
  delete (processedVehicle as any).rc_copy_file;
  delete (processedVehicle as any).insurance_document_file;
  delete (processedVehicle as any).fitness_document_file;
  delete (processedVehicle as any).tax_receipt_document_file;
  delete (processedVehicle as any).permit_document_file;
  delete (processedVehicle as any).puc_document_file;
  
  // Process other documents to ensure they have the right format
  if (processedVehicle.other_documents && Array.isArray(processedVehicle.other_documents)) {
    processedVehicle.other_documents = processedVehicle.other_documents.map(doc => ({
      name: doc.name,
      file: doc.file_url || doc.file,
      issue_date: doc.issue_date || doc.issueDate,
      expiry_date: doc.expiry_date || doc.expiryDate,
      cost: doc.cost
    }));
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert(convertKeysToSnakeCase(processedVehicle))
    .select()
    .single();

  if (error) {
    console.error('Error creating vehicle:', error);
    return null;
  }

  // Upload vehicle profile JSON to storage
  if (data) {
    await uploadVehicleProfile(data);
  }

  // Log the vehicle creation activity
  const { data: { user } } = await supabase.auth.getUser();
  if (data && user) {
    await logVehicleActivity(
      data.id,
      'updated',
      user.email || user.id,
      'Vehicle created'
    );
  }

  return data;
};

export const updateVehicle = async (id: string, updatedVehicle: Partial<Vehicle>): Promise<Vehicle | null> => {
  // Process the vehicle data to handle file uploads and document flags
  const processedVehicle = {
    ...updatedVehicle,
    // Set document flags based on URL presence
    rc_copy: updatedVehicle.rc_document_url ? true : updatedVehicle.rc_copy,
    insurance_document: updatedVehicle.insurance_document_url ? true : updatedVehicle.insurance_document,
    fitness_document: updatedVehicle.fitness_document_url ? true : updatedVehicle.fitness_document,
    tax_receipt_document: updatedVehicle.tax_document_url ? true : updatedVehicle.tax_receipt_document,
    permit_document: updatedVehicle.permit_document_url ? true : updatedVehicle.permit_document,
    puc_document: updatedVehicle.puc_document_url ? true : updatedVehicle.puc_document,
    updated_at: new Date().toISOString()
  };
  
  // Remove file objects as they can't be stored in the database
  delete (processedVehicle as any).rc_copy_file;
  delete (processedVehicle as any).insurance_document_file;
  delete (processedVehicle as any).fitness_document_file;
  delete (processedVehicle as any).tax_receipt_document_file;
  delete (processedVehicle as any).permit_document_file;
  delete (processedVehicle as any).puc_document_file;
  
  // Process other documents to ensure they have the right format
  if (processedVehicle.other_documents && Array.isArray(processedVehicle.other_documents)) {
    processedVehicle.other_documents = processedVehicle.other_documents.map(doc => ({
      name: doc.name,
      file: doc.file_url || doc.file,
      issue_date: doc.issue_date || doc.issueDate,
      expiry_date: doc.expiry_date || doc.expiryDate,
      cost: doc.cost
    }));
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(convertKeysToSnakeCase(processedVehicle))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle:', error);
    return null;
  }

  // Upload updated vehicle profile JSON to storage
  if (data) {
    await uploadVehicleProfile(data);
  }

  // Log the vehicle update activity
  const { data: { user } } = await supabase.auth.getUser();
  if (data && user) {
    let actionType: 'updated' | 'archived' | 'assigned_driver' | 'unassigned_driver' = 'updated';
    let notes = 'Vehicle information updated';

    // Determine the action type based on the updated fields
    if (updatedVehicle.status === 'archived') {
      actionType = 'archived';
      notes = 'Vehicle archived';
    } else if (updatedVehicle.primary_driver_id !== undefined) {
      if (updatedVehicle.primary_driver_id === null) {
        actionType = 'unassigned_driver';
        notes = 'Driver unassigned from vehicle';
      } else {
        actionType = 'assigned_driver';
        notes = 'Driver assigned to vehicle';
      }
    }

    await logVehicleActivity(
      id,
      actionType,
      user.email || user.id,
      notes
    );
  }

  return data;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  // Get current user and vehicle info before deletion
  const { data: { user } } = await supabase.auth.getUser();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('registration_number')
    .eq('id', id)
    .single();

  try {
    // Log the deletion BEFORE deleting the vehicle (while the foreign key constraint is still satisfied)
    if (user) {
      await logVehicleActivity(
        id,
        'deleted',
        user.email || user.id,
        `Vehicle deleted: ${vehicle?.registration_number || id}`
      );
    }

    // Step 1: Delete all associated trips first
    const { error: tripsError } = await supabase
      .from('trips')
      .delete()
      .eq('vehicle_id', id);

    if (tripsError) {
      console.error('Error deleting associated trips:', tripsError);
      throw new Error(`Failed to delete associated trips: ${tripsError.message}`);
    }

    // Step 2: Delete all associated maintenance tasks
    const { error: maintenanceError } = await supabase
      .from('maintenance_tasks')
      .delete()
      .eq('vehicle_id', id);

    if (maintenanceError) {
      console.error('Error deleting associated maintenance tasks:', maintenanceError);
      throw new Error(`Failed to delete associated maintenance tasks: ${maintenanceError.message}`);
    }

    // Step 3: Delete all associated maintenance service tasks
    // First get the maintenance task IDs for this vehicle to delete their service tasks
    const { data: maintenanceTasks } = await supabase
      .from('maintenance_tasks')
      .select('id')
      .eq('vehicle_id', id);

    if (maintenanceTasks && maintenanceTasks.length > 0) {
      const maintenanceTaskIds = maintenanceTasks.map(task => task.id);
      const { error: serviceTasksError } = await supabase
        .from('maintenance_service_tasks')
        .delete()
        .in('maintenance_task_id', maintenanceTaskIds);

      if (serviceTasksError) {
        console.error('Error deleting associated maintenance service tasks:', serviceTasksError);
        // Don't throw error here as service tasks might not exist
      }
    }

    // Step 4: Delete associated maintenance audit logs
    const { error: auditLogsError } = await supabase
      .from('maintenance_audit_logs')
      .delete()
      .eq('task_id', id);

    if (auditLogsError) {
      console.error('Error deleting maintenance audit logs:', auditLogsError);
      // Don't throw error here as audit logs might not exist
    }

    // Step 5: Delete the vehicle activity logs
    const { error: activityLogsError } = await supabase
      .from('vehicle_activity_log')
      .delete()
      .eq('vehicle_id', id);

    if (activityLogsError) {
      console.error('Error deleting vehicle activity logs:', activityLogsError);
      // Don't throw error here as activity logs are not critical for deletion
    }

    // Step 6: Finally delete the vehicle itself
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (vehicleError) {
      console.error('Error deleting vehicle:', vehicleError);
      throw new Error(`Failed to delete vehicle: ${vehicleError.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in vehicle deletion process:', error);
    throw error;
  }
};

export const bulkUpdateVehicles = async (
  vehicleIds: string[], 
  updates: Partial<Vehicle>
): Promise<{ success: number; failed: number }> => {
  let successCount = 0;
  let failedCount = 0;
  
  for (const id of vehicleIds) {
    try {
      const result = await updateVehicle(id, updates);
      if (result) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      console.error(`Error updating vehicle ${id}:`, error);
      failedCount++;
    }
  }
  
  return { success: successCount, failed: failedCount };
};

export const bulkDeleteVehicles = async (
  vehicleIds: string[]
): Promise<{ success: number; failed: number }> => {
  let successCount = 0;
  let failedCount = 0;
  
  for (const id of vehicleIds) {
    try {
      const result = await deleteVehicle(id);
      if (result) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      console.error(`Error deleting vehicle ${id}:`, error);
      failedCount++;
    }
  }
  
  return { success: successCount, failed: failedCount };
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
  // Remove photo property if it exists (we handle it separately)
  const { photo, ...driverData } = driver as any;
  
  const { data, error } = await supabase
    .from('drivers')
    .insert(convertKeysToSnakeCase(driverData))
    .select()
    .single();

  if (error) {
    console.error('Error creating driver:', error);
    return null;
  }

  return data;
};

export const updateDriver = async (id: string, updatedDriver: Partial<Driver>): Promise<Driver | null> => {
  // Remove photo property if it exists (we handle it separately)
  const { photo, ...driverData } = updatedDriver as any;
  
  const mappedDriverData = {
    ...driverData,
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('drivers')
    .update(mappedDriverData)
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

// Upload driver photo to Supabase Storage
export const uploadDriverPhoto = async (file: File, driverId: string): Promise<string> => {
  if (!file) throw new Error('No file provided');
  
  // Get file extension
  const fileExt = file.name.split('.').pop();
  // Create a unique filename
  const fileName = `${driverId}.${fileExt}`;
  const filePath = `driver_photos/${fileName}`;
  
  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from('drivers')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });
    
  if (uploadError) {
    console.error('Error uploading driver photo:', uploadError);
    throw uploadError;
  }
  
  // Get the public URL
  const { data } = supabase.storage
    .from('drivers')
    .getPublicUrl(filePath);
    
  return data.publicUrl;
};

// Driver stats
export const getDriverStats = async (driverId: string) => {
  // First get the driver to get their name
  const driver = await getDriver(driverId);
  if (!driver) return { totalTrips: 0, totalDistance: 0 };

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_name', driver.name);

  if (!trips || !Array.isArray(trips)) return { totalTrips: 0, totalDistance: 0 };

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => {
    const startKm = parseFloat(trip.start_kilometer) || 0;
    const endKm = parseFloat(trip.end_kilometer) || 0;
    return sum + (endKm - startKm);
  }, 0);

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
  // Ensure material_type_ids is an array
  const warehouseData = {
    ...warehouse,
    material_type_ids: warehouse.materialTypeIds || []
  };
  
  // Delete the camelCase property as we're using the snake_case version
  if ('materialTypeIds' in warehouseData) {
    delete (warehouseData as any).materialTypeIds;
  }

  const { data, error } = await supabase
    .from('warehouses')
    .insert(convertKeysToSnakeCase(warehouseData))
    .select()
    .single();

  if (error) {
    console.error('Error creating warehouse:', error);
    return null;
  }

  return data;
};

export const updateWarehouse = async (id: string, updates: Partial<Warehouse>): Promise<Warehouse | null> => {
  // Ensure material_type_ids is an array
  const warehouseUpdates = {
    ...updates,
    material_type_ids: updates.materialTypeIds || updates.material_type_ids,
    updated_at: new Date().toISOString()
  };
  
  // Delete the camelCase property as we're using the snake_case version
  if ('materialTypeIds' in warehouseUpdates) {
    delete (warehouseUpdates as any).materialTypeIds;
  }

  const { data, error } = await supabase
    .from('warehouses')
    .update(warehouseUpdates)
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
  // Validate the ID parameter before making the request
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.error('Invalid destination ID provided:', id);
    return null;
  }

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
  // Prepare the data for insertion, removing empty id field if present
  const destinationData = convertKeysToSnakeCase(destination);
  
  // Remove id field if it's empty or undefined to let Supabase auto-generate it
  if ('id' in destinationData && (!destinationData.id || destinationData.id === '')) {
    delete destinationData.id;
  }

  const { data, error } = await supabase
    .from('destinations')
    .insert(destinationData)
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
    const timeMatch = dest.estimated_time.match(/(\d+)h\s*(?:(\d+)m)?/);
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

// Export vehicle data to CSV
export const exportVehicleData = async (vehicleData: any[]): Promise<string> => {
  // Get the current user for logging
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create CSV header and content
  let csvContent = 'Registration Number,Make,Model,Year,Type,Fuel Type,Status,Current Odometer,Total Trips,Total Distance,Average Mileage\n';
  
  for (const vehicle of vehicleData) {
    const row = [
      vehicle.registration_number,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.type,
      vehicle.fuel_type,
      vehicle.status,
      vehicle.current_odometer,
      vehicle.stats?.totalTrips || 0,
      vehicle.stats?.totalDistance || 0,
      vehicle.stats?.averageKmpl ? vehicle.stats.averageKmpl.toFixed(2) : 'N/A'
    ].map(value => `"${value}"`).join(',');
    
    csvContent += row + '\n';
    
    // Log export activity for each vehicle
    if (user) {
      await logVehicleActivity(
        vehicle.id,
        'exported',
        user.email || user.id,
        'Vehicle data exported to CSV'
      );
    }
  }
  
  return csvContent;
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
  bulkUpdateVehicles,
  bulkDeleteVehicles,
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  uploadDriverPhoto,
  getDriverStats,
  getWarehouses,
  getWarehouse,
  getDestinations,
  analyzeRoute,
  generateAlerts,
  getVehicleStats,
  updateAllTripMileage,
  exportVehicleData
};