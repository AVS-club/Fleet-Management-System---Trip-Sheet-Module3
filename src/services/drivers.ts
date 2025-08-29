import { supabase, isNetworkError } from '../utils/supabaseClient';
import { handleSupabaseError } from '../utils/errors';
import { Driver, DriverSummary } from '../types';
import { getCurrentUserId, withOwner } from '../utils/supaHelpers';
import { fetchWithUser } from './common';

// Define allowed columns for drivers table
export const DRIVER_COLS = 'id,name,license_number,contact_number,email,join_date,status,experience_years,primary_vehicle_id,driver_photo_url,license_doc_url,aadhar_doc_url,police_doc_url,bank_doc_url,address,last_updated_at,blood_group,dob,father_or_husband_name,gender,license_issue_date,other_documents,rto,rto_code,state,valid_from,vehicle_class,notes,medical_doc_url,added_by,created_by,created_at,updated_at,license_expiry_date';

// Driver CRUD operations
export const getDrivers = async (): Promise<Driver[]> => {
  return fetchWithUser<Driver>('drivers', DRIVER_COLS);
};

export const getDriverSummaries = async (): Promise<DriverSummary[]> => {
  return fetchWithUser<DriverSummary>('drivers', 'id,name');
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
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { photo, aadhar_doc_file, medical_doc_file, license_doc_file, police_doc_file, ...cleanData } = driverData as any;

    const payload = withOwner(cleanData, userId);

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
      .from('drivers')
      .insert(payload)
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
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    const { data, error } = await supabase
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

export const uploadDriverPhoto = async (file: File, driverId: string): Promise<string | undefined> => {
  if (!file || !file.name) {
    console.warn('No photo uploaded — skipping uploadDriverPhoto.');
    return undefined;
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `drivers/${driverId}.${fileExt}`;

  try {
    const { error } = await supabase.storage
      .from('driver-photos')
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
