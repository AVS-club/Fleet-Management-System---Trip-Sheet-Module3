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
    
    // Extract GPS screenshots before saving trip
    const gpsScreenshots = sanitizedTripData.gps_screenshots || [];
    delete sanitizedTripData.gps_screenshots;
    
    // Remove station field as it's no longer in the database
    delete sanitizedTripData.station;
    
    if (sanitizedTripData.fuel_station_id === '') {
      sanitizedTripData.fuel_station_id = null;
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

    // Handle GPS screenshots if provided
    if (data && gpsScreenshots.length > 0) {
      await handleGPSScreenshots(data.id, gpsScreenshots);
    }

    return data;
  } catch (error) {
    handleSupabaseError('create trip', error);
    throw error;
  }
};

// Helper function to handle GPS screenshots
const handleGPSScreenshots = async (tripId: string, screenshots: any[]) => {
  if (!screenshots || screenshots.length === 0) return;

  for (const screenshot of screenshots) {
    // Skip if already saved (has an id)
    if (screenshot.id) continue;

    // If screenshot has a file, it needs to be uploaded
    if (screenshot.file) {
      try {
        const fileExt = screenshot.file.name.split('.').pop();
        const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `gps-screenshots/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('trip-documents')
          .upload(filePath, screenshot.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading GPS screenshot:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-documents')
          .getPublicUrl(filePath);

        // Save to database
        await supabase
          .from('trip_gps_screenshots')
          .insert({
            trip_id: tripId,
            image_url: publicUrl,
            caption: screenshot.caption || ''
          });
      } catch (error) {
        console.error('Error saving GPS screenshot:', error);
      }
    } else if (screenshot.image_url && !screenshot.id) {
      // If screenshot has URL but no id, save to database
      await supabase
        .from('trip_gps_screenshots')
        .insert({
          trip_id: tripId,
          image_url: screenshot.image_url,
          caption: screenshot.caption || ''
        });
    }
  }
};

export const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip | null> => {
  try {
    const updateData = { ...updates } as any;
    
    // Extract GPS screenshots before updating trip
    const gpsScreenshots = updateData.gps_screenshots || [];
    delete updateData.gps_screenshots;
    
    // Remove station field as it's no longer in the database
    delete updateData.station;
    
    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('update trip', error);
      throw error;
    }

    // Handle GPS screenshots if provided
    if (data && gpsScreenshots.length > 0) {
      await handleGPSScreenshots(id, gpsScreenshots);
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