import { supabase } from '../supabaseClient';
import { Tag, VehicleTag, TagFormData, VehicleWithTags } from '../../types/tags';
import { Vehicle } from '../../types';

/**
 * Fetch all tags for the user's organization with vehicle counts
 */
export async function getTags(): Promise<Tag[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's organization
    const { data: orgData } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgData) throw new Error('No organization found');

    // Fetch tags with vehicle counts
    const { data, error } = await supabase
      .from('tags')
      .select(`
        *,
        vehicle_tags (count)
      `)
      .eq('organization_id', orgData.organization_id)
      .eq('active', true)
      .order('name');

    if (error) throw error;

    // Transform the response to include vehicle_count
    return (data || []).map(tag => ({
      ...tag,
      vehicle_count: tag.vehicle_tags?.[0]?.count || 0
    }));
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}

/**
 * Create a new tag
 */
export async function createTag(tagData: TagFormData): Promise<Tag> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's organization
    const { data: orgData } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgData) throw new Error('No organization found');

    // Generate slug from name
    const slug = tagData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: tagData.name.trim(),
        slug,
        description: tagData.description?.trim() || null,
        color_hex: tagData.color_hex,
        organization_id: orgData.organization_id,
        created_by: user.id,
        active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
}

/**
 * Update an existing tag
 */
export async function updateTag(tagId: string, tagData: Partial<TagFormData>): Promise<Tag> {
  try {
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (tagData.name) {
      updates.name = tagData.name.trim();
      updates.slug = tagData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (tagData.description !== undefined) {
      updates.description = tagData.description?.trim() || null;
    }

    if (tagData.color_hex) {
      updates.color_hex = tagData.color_hex;
    }

    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', tagId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
}

/**
 * Soft delete a tag (set active = false)
 */
export async function deleteTag(tagId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tags')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', tagId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
}

/**
 * Get vehicles with a specific tag
 */
export async function getVehiclesWithTag(tagId: string): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase
      .from('vehicle_tags')
      .select(`
        vehicle_id,
        vehicles!inner (
          *
        )
      `)
      .eq('tag_id', tagId);

    if (error) throw error;
    
    // Extract and flatten vehicles
    const vehicles = (data || [])
      .map(item => item.vehicles)
      .filter(Boolean);
    
    return vehicles;
  } catch (error) {
    console.error('Error fetching vehicles with tag:', error);
    throw error;
  }
}

/**
 * Assign a tag to a vehicle
 */
export async function assignTagToVehicle(vehicleId: string, tagId: string): Promise<VehicleTag> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get vehicle's organization
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('organization_id')
      .eq('id', vehicleId)
      .single();

    if (!vehicleData) throw new Error('Vehicle not found');

    const { data, error } = await supabase
      .from('vehicle_tags')
      .insert({
        vehicle_id: vehicleId,
        tag_id: tagId,
        organization_id: vehicleData.organization_id,
        added_by: user.id
      })
      .select()
      .single();

    if (error) {
      // If it's a duplicate error, it's not a problem
      if (error.code === '23505') {
        throw new Error('Tag already assigned to this vehicle');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error assigning tag to vehicle:', error);
    throw error;
  }
}

/**
 * Remove a tag from a vehicle
 */
export async function removeTagFromVehicle(vehicleId: string, tagId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('vehicle_tags')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('tag_id', tagId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing tag from vehicle:', error);
    throw error;
  }
}
