import { supabase, isNetworkError } from '../utils/supabaseClient';
import { handleSupabaseError } from '../utils/errors';
import { Vehicle, Trip } from '../types';
import { uploadVehicleDocument } from '../utils/supabaseStorage';
import { getCurrentUserId, withOwner } from '../utils/supaHelpers';
import { generateCSV, downloadCSV } from '../utils/csvParser';
import { fetchWithUser } from './common';

// Define allowed columns for vehicles table
export const VEHICLE_COLS = 'id,registration_number,make,model,year,type,fuel_type,current_odometer,status,chassis_number,engine_number,owner_name,tyre_size,number_of_tyres,rc_expiry_date,rc_document_url,insurance_policy_number,insurer_name,insurance_start_date,insurance_expiry_date,insurance_premium_amount,insurance_document_url,fitness_certificate_number,fitness_issue_date,fitness_expiry_date,fitness_cost,fitness_document_url,tax_receipt_number,tax_amount,tax_period,tax_document_url,permit_number,permit_issuing_state,permit_type,permit_issue_date,permit_expiry_date,permit_cost,permit_document_url,puc_certificate_number,puc_issue_date,puc_expiry_date,puc_cost,puc_document_url,issuing_state,other_documents,registration_date,policy_number,tax_receipt_document,insurance_idv,tax_scope,remind_insurance,insurance_reminder_contact_id,insurance_reminder_days_before,remind_fitness,fitness_reminder_contact_id,fitness_reminder_days_before,remind_puc,puc_reminder_contact_id,puc_reminder_days_before,remind_tax,tax_reminder_contact_id,tax_reminder_days_before,remind_permit,permit_reminder_contact_id,permit_reminder_days_before,remind_service,service_reminder_contact_id,service_reminder_days_before,service_reminder_km,photo_url,financer,vehicle_class,color,cubic_capacity,cylinders,unladen_weight,seating_capacity,emission_norms,noc_details,national_permit_number,national_permit_upto,rc_status,vahan_last_fetched_at,other_info_documents,tax_paid_upto,tags,last_updated_at,added_by,service_interval_km,service_interval_days,created_by,primary_driver_id,created_at,updated_at';

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
  return futureDate.toISOString().split('T')[0];
};

// Vehicle CRUD operations
export const getVehicles = async (): Promise<Vehicle[]> => {
  return fetchWithUser<Vehicle>('vehicles', VEHICLE_COLS);
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

    const { documents, selected, ...cleanData } = vehicleData as any;

    if (isLTT(cleanData.tax_paid_upto)) {
      cleanData.tax_paid_upto = getFutureDateForLTT();
      if (!cleanData.tax_scope || cleanData.tax_scope.trim() === '') {
        cleanData.tax_scope = 'Lifetime Tax (LTT)';
      }
    }

    const payload = withOwner({
      ...cleanData,
      current_odometer: cleanData.current_odometer || 0,
    }, userId);

    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    for (const key in payload) {
      if (typeof payload[key] === 'string' && payload[key].trim() === '') {
        (payload as any)[key] = null;
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
    const {
      documents,
      selected,
      stats,
      odometer,
      odometer_km,
      ...rest
    } = values || {};

    const payload: any = {
      ...rest,
      current_odometer: odometer_km ?? odometer ?? rest.current_odometer,
    };

    if (isLTT(payload.tax_paid_upto)) {
      payload.tax_paid_upto = getFutureDateForLTT();
      if (!payload.tax_scope || payload.tax_scope.trim() === '') {
        payload.tax_scope = 'Lifetime Tax (LTT)';
      }
    }

    if (payload.current_odometer != null) {
      const n = Number(payload.current_odometer);
      payload.current_odometer = Number.isFinite(n) ? n : null;
    }

    for (const k of Object.keys(payload)) {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    }

    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

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

    if (Array.isArray(documents)) {
      for (const file of documents) {
        if (!file || typeof file.name !== 'string') {
          continue;
        }
        try {
          const dotIndex = file.name.lastIndexOf('.');
          const extension = dotIndex >= 0 ? file.name.slice(dotIndex + 1) : '';
          if (extension) {
            const filePath = await uploadVehicleDocument(file, id, 'general');
            const existingDocs = data.other_documents || [];
            const updatedDocs = [
              ...existingDocs,
              {
                name: file.name,
                file_path: filePath,
                upload_date: new Date().toISOString()
              }
            ];
            await supabase
              .from('vehicles')
              .update({ other_documents: updatedDocs })
              .eq('id', id);
          }
        } catch (uploadError) {
          handleSupabaseError('upload vehicle document', uploadError);
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

export const exportVehicleData = async (): Promise<void> => {
  try {
    const vehicles = await getVehicles();

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
    } as const;

    const csvData = generateCSV(vehicles, headers);
    const fileName = `vehicles_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(fileName, csvData);
  } catch (error) {
    handleSupabaseError('export vehicle data', error);
    throw error;
  }
};

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
          console.warn('Network error fetching user for vehicle stats, returning empty object');
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

    const stats: Record<string, { totalTrips: number; totalDistance: number; kmplSum: number; kmplCount: number }> = {};

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
      console.warn('Network error calculating vehicle stats, returning empty object');
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
        console.warn('Network error fetching user for vehicle stats, returning defaults');
        return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
      }
      handleSupabaseError('get user for vehicle stats', userError);
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    if (!user) {
      console.error('No user authenticated');
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    const { data: trips, error } = await supabase
      .from('trips')
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

    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
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
      console.warn('Network error calculating vehicle stats, returning defaults');
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }
    handleSupabaseError('calculate vehicle stats', error);
    return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
  }
};

export const getLatestOdometer = async (vehicleId: string): Promise<{ value: number; fromTrip: boolean }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        console.warn('Network error fetching user for odometer, returning default');
        return { value: 0, fromTrip: false };
      }
      handleSupabaseError('get user for odometer', userError);
      return { value: 0, fromTrip: false };
    }

    if (!user) {
      console.error('No user authenticated');
      return { value: 0, fromTrip: false };
    }

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('end_km')
      .eq('added_by', user.id)
      .eq('vehicle_id', vehicleId)
      .order('trip_end_date', { ascending: false })
      .limit(1);

    if (!tripsError && trips && trips.length > 0 && trips[0].end_km) {
      return { value: trips[0].end_km, fromTrip: true };
    }

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

export const hardDeleteVehicle = deleteVehicle;
