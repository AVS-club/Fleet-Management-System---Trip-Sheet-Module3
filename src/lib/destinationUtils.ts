import { supabase } from '../utils/supabaseClient';
import { Destination } from '../types/trip';
import { getCurrentUserId, getUserActiveOrganization } from '../utils/supaHelpers';
import { handleSupabaseError } from '../utils/errors';
import { isNetworkError } from '../utils/supabaseClient';
import config from '../utils/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('destinationUtils');

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Searches for existing destination or creates new one
 * Handles duplicates by returning the first match
 */
export async function searchOrCreateDestination(
  placeDetails: PlaceDetails,
  organizationId?: string
): Promise<Destination> {
  const { place_id, name, formatted_address, latitude, longitude } = placeDetails;

  try {
    // Get organization ID if not provided
    let orgId = organizationId;
    if (!orgId) {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      orgId = await getUserActiveOrganization(userId);
      if (!orgId) {
        throw new Error('No organization selected. Please select an organization.');
      }
    }

    // Step 1: Try to find existing destination
    logger.debug('Searching for destination:', { place_id, organizationId: orgId });
    
    const { data: existingDestinations, error: searchError } = await supabase
      .from('destinations')
      .select('*')
      .eq('place_id', place_id)
      .eq('organization_id', orgId)
      .limit(1); // Only get first match if duplicates somehow exist

    if (searchError) {
      logger.error('Search error:', searchError);
      if (isNetworkError(searchError)) {
        if (config.isDev) logger.warn('Network error searching destination, will try to create new one');
      } else {
        handleSupabaseError('search destination', searchError);
      }
      throw new Error(`Failed to search destination: ${searchError.message}`);
    }

    // If found, return it
    if (existingDestinations && existingDestinations.length > 0) {
      logger.debug('Found existing destination:', existingDestinations[0]);
      return existingDestinations[0] as Destination;
    }

    // Step 2: Not found, create new destination
    logger.debug('Creating new destination:', { place_id, name, organizationId: orgId });
    
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Create destination data
    const destinationData = {
      name,
      place_name: name,
      latitude: latitude || null,
      longitude: longitude || null,
      standard_distance: 0, // Will be calculated later
      estimated_time: '0h 0m',
      historical_deviation: 0,
      type: 'city' as const, // Default type, can be improved with better detection
      state: 'chhattisgarh' as const, // Default state
      active: true,
      place_id,
      formatted_address,
      added_by: userId,
      organization_id: orgId
    };

    const { data: newDestination, error: createError } = await supabase
      .from('destinations')
      .insert(destinationData)
      .select()
      .single(); // Safe to use .single() on INSERT

    if (createError) {
      logger.error('Create error:', createError);
      if (isNetworkError(createError)) {
        if (config.isDev) logger.warn('Network error creating destination');
      } else {
        handleSupabaseError('create destination', createError);
      }
      throw new Error(`Failed to create destination: ${createError.message}`);
    }

    if (!newDestination) {
      throw new Error('Destination created but no data returned');
    }

    logger.debug('Successfully created destination:', newDestination);
    return newDestination as Destination;

  } catch (error) {
    logger.error('searchOrCreateDestination failed:', error);
    throw error;
  }
}

/**
 * Search destinations by place_id only (for checking existence)
 */
export async function findDestinationByPlaceId(
  placeId: string,
  organizationId: string
): Promise<Destination | null> {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('place_id', placeId)
      .eq('organization_id', organizationId)
      .limit(1);

    if (error) {
      logger.error('Error finding destination:', error);
      if (isNetworkError(error)) {
        if (config.isDev) logger.warn('Network error finding destination, returning null');
        return null;
      }
      handleSupabaseError('find destination by place_id', error);
      return null;
    }

    return data && data.length > 0 ? (data[0] as Destination) : null;
  } catch (error) {
    logger.error('findDestinationByPlaceId failed:', error);
    return null;
  }
}

/**
 * Enhanced version of the existing findOrCreateDestinationByPlaceId function
 * This provides better error handling and duplicate management
 */
export async function findOrCreateDestinationByPlaceIdEnhanced(
  placeId: string,
  destinationData: Omit<Destination, 'id'>,
  placeName?: string
): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    // First, try to find existing destination by place_id
    const { data: existingDestinations, error: searchError } = await supabase
      .from('destinations')
      .select('id')
      .eq('place_id', placeId)
      .eq('organization_id', organizationId)
      .limit(1); // Use limit(1) instead of maybeSingle() for better duplicate handling

    if (searchError) {
      logger.error('Search error:', searchError);
      if (isNetworkError(searchError)) {
        if (config.isDev) logger.warn('Network error searching destination, will try to create new one');
      } else {
        handleSupabaseError('search destination by place_id', searchError);
      }
      return null;
    }

    // If destination exists, return its UUID
    if (existingDestinations && existingDestinations.length > 0) {
      logger.debug('Found existing destination:', existingDestinations[0].id);
      return existingDestinations[0].id;
    }

    // If destination doesn't exist, create a new one
    const payload = {
      ...destinationData,
      place_name: placeName || destinationData.name,
      added_by: userId,
      organization_id: organizationId
    };

    const { data: newDestination, error: createError } = await supabase
      .from('destinations')
      .insert(payload)
      .select('id')
      .single();

    if (createError) {
      logger.error('Create error:', createError);
      if (isNetworkError(createError)) {
        if (config.isDev) logger.warn('Network error creating destination');
      } else {
        handleSupabaseError('create destination', createError);
      }
      return null;
    }

    logger.debug('Successfully created destination:', newDestination.id);
    return newDestination.id;
  } catch (error) {
    logger.error('findOrCreateDestinationByPlaceIdEnhanced failed:', error);
    return null;
  }
}
