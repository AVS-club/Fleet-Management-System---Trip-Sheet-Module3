import { supabase, isNetworkError } from '../supabaseClient';
import config from '../env';
import { Trip } from '../../types';
import { getCurrentUserId, withOwner, getUserActiveOrganization } from '../supaHelpers';
import { handleSupabaseError } from '../errors';
import { createLogger } from '../logger';

const logger = createLogger('trips');

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for trips, returning empty array');
        return [];
      }
      handleSupabaseError('get user for trips', userError);
      return [];
    }

    if (!user) {
      logger.error('No user authenticated');
      return [];
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      logger.warn('No organization selected for user');
      return [];
    }

    // First get the total count
    const { count } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    logger.info(`Total trips in database: ${count}`);
    
    // Then fetch all trips with explicit range to bypass default 1000 limit
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('organization_id', organizationId)
      .order('trip_start_date', { ascending: false })
      .range(0, (count || 10000) - 1);
    
    logger.info(`Fetched ${data?.length || 0} trips from database`);

    if (error) {
      handleSupabaseError('fetch trips', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error fetching user for trips, returning empty array');
      return [];
    }
    handleSupabaseError('get user for trips', error);
    return [];
  }
};

export const getTrip = async (id: string): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips')
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

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    const sanitizedTripData = { ...tripData } as any;
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

    const payload = withOwner({
      ...sanitizedTripData,
      station: sanitizedTripData.station ?? null,
      fuel_station_id: sanitizedTripData.fuel_station_id ?? null,
      fuel_expense: sanitizedTripData.fuel_expense || sanitizedTripData.fuel_cost || 0,
      fuel_cost: sanitizedTripData.fuel_cost || sanitizedTripData.fuel_expense || 0,
      // Ensure total_fuel_cost is properly handled
      total_fuel_cost: sanitizedTripData.total_fuel_cost || 0,
    }, userId, organizationId);

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