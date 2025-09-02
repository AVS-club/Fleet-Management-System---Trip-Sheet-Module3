import { supabase } from './supabaseClient';
import { isNetworkError, handleNetworkError } from './supabaseClient';
import config from './env';
import {
  Trip,
  TripFormData,
  Vehicle,
  Driver,
  DriverSummary,
  Destination,
  Warehouse,
  RouteAnalysis,
  AIAlert
} from '@/types';
import { uploadVehicleDocument } from './supabaseStorage';
import { getCurrentUserId, withOwner } from './supaHelpers';
import { loadGoogleMaps } from './googleMapsLoader';
import { toast } from 'react-toastify';
import { generateCSV, downloadCSV } from './csvParser';
import { handleSupabaseError } from './errors';

// Helper function to check if a value is LTT (Lifetime Tax)
const isLTT = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== 'string') return false;
  const upperValue = value.trim().toUpperCase();
  return ['LTT', 'LIFETIME', 'LIFE TIME', 'LIFE TIME TAX'].includes(upperValue);
};

// Helper function to get future date (10 years from now)
const getFutureDateForLTT = (): string => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  return futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Define allowed columns for vehicles table
export const VEHICLE_COLS = 'id,registration_number,make,model,year,type,fuel_type,current_odometer,status,chassis_number,engine_number,owner_name,tyre_size,number_of_tyres,rc_expiry_date,rc_document_url,insurance_policy_number,insurer_name,insurance_start_date,insurance_expiry_date,insurance_premium_amount,insurance_document_url,fitness_certificate_number,fitness_issue_date,fitness_expiry_date,fitness_cost,fitness_document_url,tax_receipt_number,tax_amount,tax_period,tax_document_url,permit_number,permit_issuing_state,permit_type,permit_issue_date,permit_expiry_date,permit_cost,permit_document_url,puc_certificate_number,puc_issue_date,puc_expiry_date,puc_cost,puc_document_url,issuing_state,other_documents,registration_date,policy_number,tax_receipt_document,insurance_idv,tax_scope,remind_insurance,insurance_reminder_contact_id,insurance_reminder_days_before,remind_fitness,fitness_reminder_contact_id,fitness_reminder_days_before,remind_puc,puc_reminder_contact_id,puc_reminder_days_before,remind_tax,tax_reminder_contact_id,tax_reminder_days_before,remind_permit,permit_reminder_contact_id,permit_reminder_days_before,remind_service,service_reminder_contact_id,service_reminder_days_before,service_reminder_km,photo_url,financer,vehicle_class,color,cubic_capacity,cylinders,unladen_weight,seating_capacity,emission_norms,noc_details,national_permit_number,national_permit_upto,rc_status,vahan_last_fetched_at,other_info_documents,tax_paid_upto,tags,last_updated_at,added_by,service_interval_km,service_interval_days,created_by,primary_driver_id,created_at,updated_at';

// Define allowed columns for drivers table
export const DRIVER_COLS = 'id,name,license_number,contact_number,email,join_date,status,experience_years,primary_vehicle_id,driver_photo_url,license_doc_url,aadhar_doc_url,police_doc_url,bank_doc_url,address,last_updated_at,blood_group,dob,father_or_husband_name,gender,license_issue_date,other_documents,rto,rto_code,state,valid_from,vehicle_class,notes,medical_doc_url,added_by,created_by,created_at,updated_at,license_expiry_date';

export async function getUserData() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Handle network errors gracefully
      if (isNetworkError(error)) {
        if (config.isDev) console.warn('Network error getting user data, returning null user');
        return { user: null, error: null };
      }
      handleSupabaseError('get user data', error);
      throw error;
    }
    
    return { user, error: null };
  } catch (error) {
    // Handle network errors gracefully
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error getting user data, returning null user');
      return { user: null, error: null };
    }
    handleSupabaseError('get user data', error);
    throw error;
  }
}

// Vehicle CRUD operations
export const getVehicles = async (): Promise<Vehicle[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for vehicles, returning empty array');
        return [];
      }
      handleSupabaseError('get user for vehicles', userError);
      return [];
    }
    
    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_COLS)
      .eq('added_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch vehicles', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for vehicles, returning empty array');
      return [];
    }
    handleSupabaseError('get user for vehicles', error);
    return [];
  }
};

export const getVehicle = async (id: string): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_COLS)
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch vehicle', error);
    return null;
  }

  return data;
};

export const createVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Strip UI-only fields and prepare data
    const { documents, selected, ...cleanData } = vehicleData as any; // ⚠️ Confirm field refactor here
    
    // Handle LTT (Lifetime Tax) conversion
    // Replacing "LTT" with a valid future date (10 years from now) to match Supabase date format
    if (isLTT(cleanData.tax_paid_upto)) {
      cleanData.tax_paid_upto = getFutureDateForLTT();
      // Save original LTT info in tax_scope for UI badge display
      if (!cleanData.tax_scope || cleanData.tax_scope.trim() === '') {
        cleanData.tax_scope = 'Lifetime Tax (LTT)';
      }
    }
    
    // Remove _file properties (client-side File objects, not database columns)
    const payload = withOwner({
      ...cleanData,
      current_odometer: cleanData.current_odometer || 0,
    }, userId);

    // Strip file properties that shouldn't go to database
    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    // Sanitize empty strings to null for database compatibility
    for (const key in payload) {
      if (typeof payload[key] === 'string' && payload[key].trim() === '') {
        payload[key] = null;
      }
    }
    const { data, error } = await supabase
      .from('vehicles')
      .insert(payload)
      .select(VEHICLE_COLS)
      .single();

    if (error) {
      handleSupabaseError('create vehicle', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create vehicle', error);
    throw error;
  }
};

export const updateVehicle = async (id: string, values: any): Promise<Vehicle | null> => {
  try {
    // Strip UI-only fields and undefined values
    const {
      documents, 
      selected, // UI fields
      stats, // Frontend-only field
      odometer, 
      odometer_km,
      ...rest
    } = values || {};

    const payload: any = {
      ...rest,
      current_odometer: odometer_km ?? odometer ?? rest.current_odometer,
    };

    // Handle LTT (Lifetime Tax) conversion for updates
    // Replacing "LTT" with a valid future date (10 years from now) to match Supabase date format
    if (isLTT(payload.tax_paid_upto)) {
      payload.tax_paid_upto = getFutureDateForLTT();
      // Save original LTT info in tax_scope for UI badge display
      if (!payload.tax_scope || payload.tax_scope.trim() === '') {
        payload.tax_scope = 'Lifetime Tax (LTT)';
      }
    }

    // Coerce current_odometer to number
    if (payload.current_odometer != null) {
      const n = Number(payload.current_odometer);
      payload.current_odometer = Number.isFinite(n) ? n : null;
    }

    // Remove undefined keys
    for (const k of Object.keys(payload)) {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    }

    // Remove _file properties (client-side File objects, not database columns)
    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    // Update the vehicle
    const { data, error } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('id', id)
      .select(VEHICLE_COLS)
      .single();

    if (error) {
      handleSupabaseError('update vehicle', error);
      throw error;
    }

    // Handle document uploads safely
    if (Array.isArray(documents)) {
      for (const file of documents) {
        // Guard against invalid files
        if (!file || typeof file.name !== 'string') {
          continue;
        }

        try {
          const dotIndex = file.name.lastIndexOf('.');
          const extension = dotIndex >= 0 ? file.name.slice(dotIndex + 1) : '';
          
          // Only proceed if we have a valid extension
          if (extension) {
            const filePath = await uploadVehicleDocument(file, id, 'general');
            // Get existing other_documents array and add the new path
            const existingDocs = data.other_documents || [];
            const updatedDocs = [
              ...existingDocs,
              {
                name: file.name,
                file_path: filePath,
                upload_date: new Date().toISOString()
              }
            ];
            
            // Update the vehicle with the new other_documents array
            await supabase
              .from('vehicles')
              .update({ other_documents: updatedDocs })
              .eq('id', id);
          }
        } catch (uploadError) {
          handleSupabaseError('upload vehicle document', uploadError);
          // Continue with other documents even if one fails
        }
      }
    }

    return data;
  } catch (error) {
    handleSupabaseError('update vehicle', error);
    throw error;
  }
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete vehicle', error);
    return false;
  }

  return true;
};

// Bulk archive vehicles
export const bulkArchiveVehicles = async (vehicleIds: string[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'archived' })
      .in('id', vehicleIds);

    if (error) {
      handleSupabaseError('archive vehicles', error);
      return false;
    }

    return true;
  } catch (error) {
    handleSupabaseError('archive vehicles', error);
    return false;
  }
};

// Export vehicle data to CSV
export const exportVehicleData = async (): Promise<void> => {
  try {
    const vehicles = await getVehicles();
    
    // Define CSV headers
    const headers = {
      registration_number: 'Registration Number',
      make: 'Make',
      model: 'Model',
      year: 'Year',
      type: 'Type',
      fuel_type: 'Fuel Type',
      current_odometer: 'Current Odometer (km)',
      status: 'Status',
      chassis_number: 'Chassis Number',
      engine_number: 'Engine Number',
      owner_name: 'Owner Name',
      created_at: 'Created Date',
      updated_at: 'Updated Date'
    };
    
    // Generate CSV
    const csvData = await generateCSV(vehicles, headers);
    
    // Download CSV
    const fileName = `vehicles_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(fileName, csvData);
  } catch (error) {
    handleSupabaseError('export vehicle data', error);
    throw error;
  }
};

// Bulk unarchive vehicles
export const bulkUnarchiveVehicles = async (vehicleIds: string[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'active' })
      .in('id', vehicleIds);

    if (error) {
      handleSupabaseError('unarchive vehicles', error);
      return false;
    }

    return true;
  } catch (error) {
    handleSupabaseError('unarchive vehicles', error);
    return false;
  }
};

// Driver CRUD operations
export const getDrivers = async (): Promise<Driver[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for drivers, returning empty array');
        return [];
      }
      handleSupabaseError('get user for drivers', userError);
      return [];
    }
    
    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const { data, error } = await supabase
      .from('drivers')
      .select(DRIVER_COLS)
      .eq('added_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch drivers', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for drivers, returning empty array');
      return [];
    }
    handleSupabaseError('get user for drivers', error);
    return [];
  }
};

export const getDriverSummaries = async (): Promise<DriverSummary[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for driver summaries, returning empty array');
        return [];
      }
      handleSupabaseError('get user for driver summaries', userError);
      return [];
    }

    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const { data, error } = await supabase
      .from('drivers')
      .select('id,name')
      .eq('added_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch driver summaries', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for driver summaries, returning empty array');
      return [];
    }
    handleSupabaseError('get user for driver summaries', error);
    return [];
  }
};

export const getDriver = async (id: string): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from('drivers')
    .select(DRIVER_COLS)
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch driver', error);
    return null;
  }

  return data;
};

export const createDriver = async (driverData: Omit<Driver, 'id'>): Promise<Driver | null> => {
  try {
    const userId = await getCurrentUserId(); // ⚠️ Confirm field refactor here
    if (!userId) { // ⚠️ Confirm field refactor here
      throw new Error('User not authenticated');
    }

    // Strip file objects and prepare payload
    const { photo, aadhar_doc_file, medical_doc_file, license_doc_file, police_doc_file, ...cleanData } = driverData as any;
    
    const payload = withOwner(cleanData, userId);
    
    // Remove _file properties (client-side File objects, not database columns)
    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    // Sanitize empty strings to null for database compatibility
    for (const key in payload) {
      if (typeof payload[key] === 'string' && payload[key].trim() === '') {
        payload[key] = null;
      }
    }

    const { data, error } = await supabase
      .from('drivers') // ⚠️ Confirm field refactor here
      .insert(payload) // ⚠️ Confirm field refactor here
      .select(DRIVER_COLS)
      .single();

    if (error) {
      handleSupabaseError('create driver', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create driver', error);
    throw error;
  }
};

export const updateDriver = async (id: string, updates: Partial<Driver>): Promise<Driver | null> => {
  try {
    // Remove undefined values
    const cleanUpdates = Object.fromEntries( // ⚠️ Confirm field refactor here
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('drivers')
      .update(cleanUpdates)
      .eq('id', id)
      .select(DRIVER_COLS)
      .single();

    if (error) {
      handleSupabaseError('update driver', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('update driver', error);
    throw error;
  }
};

export const deleteDriver = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete driver', error);
    return false;
  }

  return true;
};

// Photo upload function for drivers
export const uploadDriverPhoto = async (file: File, driverId: string): Promise<string | undefined> => {
  if (!file || !file.name) { // ⚠️ Confirm field refactor here
    if (config.isDev) console.warn('No photo uploaded — skipping uploadDriverPhoto.'); // ⚠️ Confirm field refactor here
    return undefined;
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `drivers/${driverId}.${fileExt}`;

  try {
    const { error } = await supabase.storage // ⚠️ Confirm field refactor here
      .from('driver-photos') // ⚠️ Confirm field refactor here
      .upload(filePath, file, { upsert: true });
      
    if (error) {
      handleSupabaseError('upload driver photo', error);
      return undefined;
    }

    return filePath;
  } catch (uploadError) {
    handleSupabaseError('upload driver photo', uploadError);
    throw uploadError;
  }
};

// Trip CRUD operations
export const getTrips = async (): Promise<Trip[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(); // ⚠️ Confirm field refactor here
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for trips, returning empty array');
        return [];
      }
      handleSupabaseError('get user for trips', userError);
      return [];
    }
    
    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('trips')
      .select('id, vehicle_id, trip_start_date, trip_end_date, start_km, end_km, calculated_kmpl, driver_id, refueling_done, fuel_quantity, fuel_rate_per_liter, total_fuel_cost, warehouse_id')
      .eq('added_by', user.id)
      .order('trip_start_date', { ascending: false });

    if (error) {
      handleSupabaseError('fetch trips', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for trips, returning empty array');
      return [];
    }
    handleSupabaseError('get user for trips', error);
    return [];
  }
};

export const getTrip = async (id: string): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips') // ⚠️ Confirm field refactor here
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch trip', error);
    return null;
  }

  return data;
};

export const createTrip = async (tripData: Omit<Trip, 'id'>): Promise<Trip | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Sanitize empty strings to null for UUID fields to prevent Supabase validation errors
    const sanitizedTripData = { ...tripData };
    if (sanitizedTripData.fuel_station_id === '') {
      sanitizedTripData.fuel_station_id = null;
    }
    if (sanitizedTripData.station === '') {
      sanitizedTripData.station = null;
    }
    if (sanitizedTripData.vehicle_id === '') {
      sanitizedTripData.vehicle_id = null;
    }
    if (sanitizedTripData.driver_id === '') {
      sanitizedTripData.driver_id = null;
    }
    if (sanitizedTripData.warehouse_id === '') {
      sanitizedTripData.warehouse_id = null;
    }

    const payload = withOwner(
      {
        ...sanitizedTripData,
        station: sanitizedTripData.station ?? null,
        fuel_station_id: sanitizedTripData.fuel_station_id ?? null,
      },
      userId
    );

    if (config.isDev) console.log("Submitting trip with payload:", payload);
    const { data, error } = await supabase
      .from('trips')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('create trip', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create trip', error);
    throw error;
  }
};

export const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip | null> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('update trip', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('update trip', error);
    throw error;
  }
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete trip', error);
    return false;
  }

  return true;
};

// Warehouse operations
export const getWarehouses = async (): Promise<Warehouse[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for warehouses, returning empty array');
        return [];
      }
      handleSupabaseError('get user for warehouses', userError);
      return [];
    }
    
    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('warehouses') // ⚠️ Confirm field refactor here
      .select('*')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch warehouses', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for warehouses, returning empty array');
      return [];
    }
    handleSupabaseError('get user for warehouses', error);
    return [];
  }
};

export const getWarehouse = async (id: string): Promise<Warehouse | null> => {
  const { data, error } = await supabase // ⚠️ Confirm field refactor here
    .from('warehouses') // ⚠️ Confirm field refactor here
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch warehouse', error);
    return null;
  }

  return data;
};

// Destination operations
export const getDestinations = async (): Promise<Destination[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for destinations, returning empty array');
        return [];
      }
      handleSupabaseError('get user for destinations', userError);
      return [];
    }
    
    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('destinations') // ⚠️ Confirm field refactor here
      .select('*')
      .eq('created_by', user.id)
      .eq('active', true)
      .order('name');

    if (error) {
      handleSupabaseError('fetch destinations', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for destinations, returning empty array');
      return [];
    }
    handleSupabaseError('get user for destinations', error);
    return [];
  }
};

export const getDestination = async (id: string): Promise<Destination | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for destination, returning null');
        return null;
      }
      handleSupabaseError('get user for destination', userError);
      return null;
    }
    
    if (!user) {
      console.error('No user authenticated');
      return null;
    }

    // Validate that id is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('Invalid UUID format for destination id:', id);
      return null;
    }

    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)
      .maybeSingle();

    if (error) {
      handleSupabaseError('fetch destination', error);
      return null;
    }

    return data;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching destination, returning null');
      return null;
    }
    handleSupabaseError('fetch destination', error);
    return null;
  }
};

export const getDestinationByAnyId = async (id: string): Promise<Destination | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for destination by any id, returning null');
        return null;
      }
      handleSupabaseError('get user for destination by any id', userError);
      return null;
    }
    
    if (!user) {
      console.error('No user authenticated');
      return null;
    }

    // First try to get by UUID (standard database ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(id)) {
      // It's a UUID, use the standard getDestination function
      return await getDestination(id);
    }
    
    // If not a UUID, try to find by place_id (Google Places ID)
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('place_id', id)
      .eq('created_by', user.id)
      .maybeSingle();

    if (error) {
      handleSupabaseError('fetch destination by place_id', error);
      return null;
    }

    return data;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching destination by any id, returning null');
      return null;
    }
    handleSupabaseError('fetch destination by any id', error);
    return null;
  }
};

export const createDestination = async (destinationData: Omit<Destination, 'id'>): Promise<Destination | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const payload = withOwner(destinationData, userId);

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('destinations')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('create destination', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create destination', error);
    throw error;
  }
};

export const hardDeleteDestination = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('destinations') // ⚠️ Confirm field refactor here
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete destination', error);
    return false;
  }

  return true;
};

// Find or create destination by Google Place ID
export const findOrCreateDestinationByPlaceId = async (
  placeId: string,
  destinationData: Omit<Destination, 'id'>,
  placeName?: string
): Promise<string | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // First, try to find existing destination by place_id
    const { data: existingDestination, error: searchError } = await supabase
      .from('destinations')
      .select('id')
      .eq('place_id', placeId)
      .eq('created_by', userId)
      .maybeSingle();

    if (searchError) {
      handleSupabaseError('search destination by place_id', searchError);
      return null;
    }

    // If destination exists, return its UUID
    if (existingDestination) {
      return existingDestination.id;
    }

    // If destination doesn't exist, create a new one
    const payload = withOwner({
      ...destinationData,
      place_name: placeName || destinationData.name
    }, userId);

    const { data: newDestination, error: createError } = await supabase
      .from('destinations')
      .insert(payload)
      .select('id')
      .single();

    if (createError) {
      handleSupabaseError('create destination', createError);
      return null;
    }

    return newDestination.id;
  } catch (error) {
    handleSupabaseError('find or create destination by place_id', error);
    return null;
  }
};
// Vehicle stats

export interface VehicleStats {
  totalTrips: number;
  totalDistance: number;
  averageKmpl?: number;
}

export const getAllVehicleStats = async (
  trips?: Trip[]
): Promise<Record<string, VehicleStats>> => {
  try {
    let tripData = trips;

    if (!tripData) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (isNetworkError(userError)) {
          if (config.isDev) console.warn(
            'Network error fetching user for vehicle stats, returning empty object'
          );
          return {};
        }
        handleSupabaseError('get user for vehicle stats', userError);
        return {};
      }

      if (!user) {
        console.error('No user authenticated');
        return {};
      }

      const { data, error } = await supabase
        .from('trips')
        .select('vehicle_id,start_km,end_km,calculated_kmpl')
        .eq('added_by', user.id);

      if (error) {
        handleSupabaseError('fetch vehicle trips', error);
        return {};
      }

      tripData = data || [];
    }

    const stats: Record<
      string,
      { totalTrips: number; totalDistance: number; kmplSum: number; kmplCount: number }
    > = {};

    tripData.forEach((trip) => {
      if (!trip.vehicle_id) return;
      if (!stats[trip.vehicle_id]) {
        stats[trip.vehicle_id] = {
          totalTrips: 0,
          totalDistance: 0,
          kmplSum: 0,
          kmplCount: 0,
        };
      }

      const entry = stats[trip.vehicle_id];
      entry.totalTrips += 1;
      entry.totalDistance += (trip.end_km ?? 0) - (trip.start_km ?? 0);
      if (trip.calculated_kmpl) {
        entry.kmplSum += trip.calculated_kmpl;
        entry.kmplCount += 1;
      }
    });

    const result: Record<string, VehicleStats> = {};
    for (const [id, s] of Object.entries(stats)) {
      result[id] = {
        totalTrips: s.totalTrips,
        totalDistance: s.totalDistance,
        averageKmpl: s.kmplCount > 0 ? s.kmplSum / s.kmplCount : undefined,
      };
    }

    return result;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn(
        'Network error calculating vehicle stats, returning empty object'
      );
      return {};
    }
    handleSupabaseError('calculate all vehicle stats', error);
    return {};
  }
};

export const getVehicleStats = async (vehicleId: string): Promise<any> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for vehicle stats, returning defaults');
        return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
      }
      handleSupabaseError('get user for vehicle stats', userError);
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }
    
    if (!user) {
      console.error('No user authenticated');
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    // Get trips for this vehicle
    const { data: trips, error } = await supabase // ⚠️ Confirm field refactor here
      .from('trips') // ⚠️ Confirm field refactor here
      .select('start_km, end_km, calculated_kmpl')
      .eq('added_by', user.id)
      .eq('vehicle_id', vehicleId);

    if (error) {
      handleSupabaseError('fetch vehicle trips', error);
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    if (!trips || trips.length === 0) {
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    // Calculate stats
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
    
    // Calculate average KMPL from trips with calculated_kmpl
    const tripsWithKmpl = trips.filter(trip => trip.calculated_kmpl);
    const averageKmpl = tripsWithKmpl.length > 0
      ? tripsWithKmpl.reduce((sum, trip) => sum + trip.calculated_kmpl, 0) / tripsWithKmpl.length
      : undefined;

    return {
      totalTrips,
      totalDistance,
      averageKmpl
    };
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error calculating vehicle stats, returning defaults');
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }
    handleSupabaseError('calculate vehicle stats', error);
    return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
  }
};

// Route analysis
export const analyzeRoute = async (warehouseId: string, destinationIds: string[]): Promise<RouteAnalysis | null> => {
  try {
    // Get warehouse
    const warehouse = await getWarehouse(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Get destinations
    const destinations = await Promise.all(
      destinationIds.map(id => getDestination(id))
    );

    const validDestinations = destinations.filter((d): d is Destination => d !== null);
    
    if (validDestinations.length === 0) {
      throw new Error('No valid destinations found');
    }


    // Create waypoints for map
    const waypoints = [
      { lat: warehouse.latitude || 0, lng: warehouse.longitude || 0 },
      ...validDestinations.map(dest => ({ lat: dest.latitude, lng: dest.longitude }))
    ];

    // Load Google Maps and get live distance/duration using Directions API
    await loadGoogleMaps();
    
    const directionsService = new google.maps.DirectionsService();
    
    const origin = new google.maps.LatLng(warehouse.latitude || 0, warehouse.longitude || 0);
    const destination = new google.maps.LatLng(
      validDestinations[validDestinations.length - 1].latitude,
      validDestinations[validDestinations.length - 1].longitude
    );
    
    // Convert intermediate destinations to waypoints
    const waypointsForDirections = validDestinations.slice(0, -1).map(dest => ({
      location: new google.maps.LatLng(dest.latitude, dest.longitude),
      stopover: true
    }));

    const directionsRequest = {
      origin,
      destination,
      waypoints: waypointsForDirections,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'IN'
    };

    // Use Promise wrapper for Google Directions API
    const directionsResult = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(directionsRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });

    // Extract total distance and duration from Google Directions response
    let totalLiveDistanceMeters = 0;
    let totalLiveDurationSeconds = 0;

    if (directionsResult.routes[0]?.legs) {
      directionsResult.routes[0].legs.forEach(leg => {
        totalLiveDistanceMeters += leg.distance?.value || 0;
        totalLiveDurationSeconds += leg.duration?.value || 0;
      });
    }

    // Convert to appropriate units
    const totalLiveDistanceKm = Math.round(totalLiveDistanceMeters / 1000 * 10) / 10; // Round to 1 decimal
    const totalLiveDurationMinutes = Math.round(totalLiveDurationSeconds / 60);
    const hours = Math.floor(totalLiveDurationMinutes / 60);
    const minutes = totalLiveDurationMinutes % 60;
    const estimatedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      total_distance: totalLiveDistanceKm,
      standard_distance: totalLiveDistanceKm,
      deviation: 0, // Will be calculated when actual distance is known
      estimated_time: estimatedTime,
      waypoints
    };
  } catch (error) {
    console.error('Error in analyzeRoute:', error);
    handleSupabaseError('analyze route', error);
    
    // Return fallback with waypoints for map but no distance/time data
    try {
      const warehouse = await getWarehouse(warehouseId);
      const destinations = await Promise.all(destinationIds.map(id => getDestination(id)));
      const validDestinations = destinations.filter((d): d is Destination => d !== null);
      
      if (warehouse && validDestinations.length > 0) {
        return {
          total_distance: 0,
          standard_distance: 0,
          deviation: 0,
          estimated_time: '—',
          waypoints: [
            { lat: warehouse.latitude || 0, lng: warehouse.longitude || 0 },
            ...validDestinations.map(dest => ({ lat: dest.latitude, lng: dest.longitude }))
          ]
        };
      }
    } catch (fallbackError) {
      console.error('Error in analyzeRoute fallback:', fallbackError);
    }
    
    return null;
  }
};

// Get latest odometer reading
export const getLatestOdometer = async (vehicleId: string): Promise<{ value: number; fromTrip: boolean }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for odometer, returning default');
        return { value: 0, fromTrip: false };
      }
      handleSupabaseError('get user for odometer', userError);
      return { value: 0, fromTrip: false };
    }
    
    if (!user) {
      console.error('No user authenticated');
      return { value: 0, fromTrip: false };
    }

    // First try to get the latest trip end_km
    const { data: trips, error: tripsError } = await supabase // ⚠️ Confirm field refactor here
      .from('trips') // ⚠️ Confirm field refactor here
      .select('end_km')
      .eq('added_by', user.id)
      .eq('vehicle_id', vehicleId)
      .order('trip_end_date', { ascending: false })
      .limit(1);

    if (!tripsError && trips && trips.length > 0 && trips[0].end_km) {
      return { value: trips[0].end_km, fromTrip: true };
    }

    // Fallback to vehicle's current_odometer
    const vehicle = await getVehicle(vehicleId);
    return { 
      value: vehicle?.current_odometer || 0, 
      fromTrip: false 
    };
  } catch (error) {
    handleSupabaseError('get latest odometer', error);
    return { value: 0, fromTrip: false };
  }
};

// Export alias for compatibility
export const hardDeleteVehicle = deleteVehicle;