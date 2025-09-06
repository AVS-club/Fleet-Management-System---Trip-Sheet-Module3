import { supabase, isNetworkError } from '../supabaseClient';
import config from '../env';
import { Driver, DriverSummary } from '../../types';
import { getCurrentUserId, withOwner } from '../supaHelpers';
import { handleSupabaseError } from '../errors';

// Define allowed columns for drivers table
const DRIVER_COLS = 'id,name,license_number,contact_number,email,join_date,status,experience_years,primary_vehicle_id,driver_photo_url,license_doc_url,aadhar_doc_url,police_doc_url,bank_doc_url,address,last_updated_at,blood_group,dob,father_or_husband_name,gender,license_issue_date,other_documents,rto,rto_code,state,valid_from,vehicle_class,notes,medical_doc_url,added_by,created_by,created_at,updated_at,license_expiry_date';

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
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const payload = withOwner(driverData as any, userId);

    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    for (const key in payload) {
      if (typeof payload[key] === 'string' && payload[key].trim() === '') {
        payload[key] = null;
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

const deleteDriver = async (id: string): Promise<boolean> => {
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

