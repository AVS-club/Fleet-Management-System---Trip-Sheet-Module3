import { supabase } from './supabaseClient';
import { isNetworkError } from './supabaseClient';
import { Destination, Warehouse } from '../types';
import { getCurrentUserId, withOwner } from './supaHelpers';
import { handleSupabaseError } from './errors';


export async function getUserData() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Handle network errors gracefully
      if (isNetworkError(error)) {
        console.warn('Network error getting user data, returning null user');
        return { user: null, error: null };
      }
      handleSupabaseError('get user data', error);
      throw error;
    }
    
    return { user, error: null };
  } catch (error) {
    // Handle network errors gracefully
    if (isNetworkError(error)) {
      console.warn('Network error getting user data, returning null user');
      return { user: null, error: null };
    }
    handleSupabaseError('get user data', error);
    throw error;
  }
}

// Warehouse operations
export const getWarehouses = async (): Promise<Warehouse[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        console.warn('Network error fetching user for warehouses, returning empty array');
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
      console.warn('Network error fetching user for warehouses, returning empty array');
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
        console.warn('Network error fetching user for destinations, returning empty array');
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
      console.warn('Network error fetching user for destinations, returning empty array');
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
        console.warn('Network error fetching user for destination, returning null');
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
      console.warn('Network error fetching destination, returning null');
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
        console.warn('Network error fetching user for destination by any id, returning null');
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
      console.warn('Network error fetching destination by any id, returning null');
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
