import { supabase, isNetworkError } from '../supabaseClient';
import config from '../env';
import { Driver, DriverSummary } from '../../types';
import { getCurrentUserId, withOwner, getUserActiveOrganization } from '../supaHelpers';
import { handleSupabaseError } from '../errors';

// Define allowed columns for drivers table (matching actual database schema)
const DRIVER_COLS = 'id,name,license_number,phone,address,date_of_birth,date_of_joining,license_expiry,medical_certificate_expiry,aadhar_number,status,experience_years,salary,added_by,created_at,updated_at';

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

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      console.warn('No organization selected for user');
      return [];
    }

    const { data, error } = await supabase
      .from('drivers')
      .select(DRIVER_COLS)
      .eq('organization_id', organizationId)
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

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      console.warn('No organization selected for user');
      return [];
    }

    const { data, error } = await supabase
      .from('drivers')
      .select('id,name')
      .eq('organization_id', organizationId)
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

export const getAllDriversIncludingInactive = async (): Promise<Driver[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for all drivers, returning empty array');
        return [];
      }
      handleSupabaseError('get user for all drivers', userError);
      return [];
    }

    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      console.warn('No organization selected for user');
      return [];
    }

    const { data, error } = await supabase
      .from('drivers')
      .select(DRIVER_COLS)
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) {
      handleSupabaseError('fetch all drivers', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for all drivers, returning empty array');
      return [];
    }
    handleSupabaseError('get user for all drivers', error);
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

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    const payload = withOwner(driverData as any, userId, organizationId);

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

