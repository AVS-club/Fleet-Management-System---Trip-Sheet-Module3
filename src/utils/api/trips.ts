import { supabase, isNetworkError } from '../supabaseClient';
import config from '../env';
import { Trip } from '../../types';
import { getCurrentUserId, withOwner } from '../supaHelpers';
import { handleSupabaseError } from '../errors';

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

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

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('created_by', user.id)
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
    }, userId);

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