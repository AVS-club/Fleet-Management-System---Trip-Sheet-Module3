import { supabase } from '../supabaseClient';
import { handleSupabaseError } from '../errors';

export interface VehicleTag {
  id: string;
  vehicle_id: string;
  tag_id: string;
  organization_id: string;
  added_by: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
  description?: string;
  organization_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all tags for an organization
 */
export const getTags = async (): Promise<Tag[]> => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      handleSupabaseError('fetch tags', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
};

/**
 * Get all tags assigned to a vehicle
 */
export const getVehicleTags = async (vehicleId: string): Promise<Tag[]> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_tags')
      .select(`
        tag_id,
        tags (
          id,
          name,
          slug,
          color_hex,
          description,
          organization_id,
          active,
          created_at,
          updated_at
        )
      `)
      .eq('vehicle_id', vehicleId);

    if (error) {
      handleSupabaseError('fetch vehicle tags', error);
      return [];
    }

    // Extract tags from the nested structure
    return (data || [])
      .map(item => item.tags)
      .filter(tag => tag && tag.active) as Tag[];
  } catch (error) {
    console.error('Error fetching vehicle tags:', error);
    return [];
  }
};

/**
 * Assign a tag to a vehicle
 */
export const assignTagToVehicle = async (
  vehicleId: string,
  tagId: string
): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    // Check if tag is already assigned
    const { data: existing } = await supabase
      .from('vehicle_tags')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('tag_id', tagId)
      .single();

    if (existing) {
      console.log('Tag already assigned to vehicle');
      return true;
    }

    // Get user's organization
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgUser) {
      console.error('User not in any organization');
      return false;
    }

    // Assign the tag
    const { error } = await supabase
      .from('vehicle_tags')
      .insert({
        vehicle_id: vehicleId,
        tag_id: tagId,
        organization_id: orgUser.organization_id,
        added_by: user.id
      });

    if (error) {
      handleSupabaseError('assign tag to vehicle', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error assigning tag to vehicle:', error);
    return false;
  }
};

/**
 * Remove a tag from a vehicle
 */
export const removeTagFromVehicle = async (
  vehicleId: string,
  tagId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicle_tags')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('tag_id', tagId);

    if (error) {
      handleSupabaseError('remove tag from vehicle', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing tag from vehicle:', error);
    return false;
  }
};

/**
 * Create a new tag
 */
export const createTag = async (
  name: string,
  color?: string,
  description?: string
): Promise<Tag | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    // Get user's organization
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgUser) {
      console.error('User not in any organization');
      return null;
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        color_hex: color || '#3B82F6',
        description,
        organization_id: orgUser.organization_id,
        active: true
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError('create tag', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
};

/**
 * Update vehicles.tags column (simple text array) - for backward compatibility
 */
export const updateVehicleTagsArray = async (
  vehicleId: string,
  tags: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ tags })
      .eq('id', vehicleId);

    if (error) {
      handleSupabaseError('update vehicle tags array', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating vehicle tags array:', error);
    return false;
  }
};

/**
 * Get tag assignment history for a vehicle
 */
export const getVehicleTagHistory = async (vehicleId: string) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_tag_history')
      .select(`
        *,
        tags (name, color),
        assigned_by_user:assigned_by (email)
      `)
      .eq('vehicle_id', vehicleId)
      .order('action_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch tag history', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tag history:', error);
    return [];
  }
};
