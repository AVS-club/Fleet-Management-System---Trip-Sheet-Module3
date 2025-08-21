import { supabase } from './supabaseClient';
import { handleSupabaseError } from './errors';

export interface MaterialType {
  id: string;
  name: string;
  active: boolean;
}

// Get material types from storage
export const getMaterialTypes = async (): Promise<MaterialType[]> => {
  const { data, error } = await supabase
    .from('material_types')
    .select('*')
    .order('name');

  if (error) {
    handleSupabaseError('fetch material types', error);
    return [];
  }

  return data || [];
};

// Add a new material type
export const addMaterialType = async (name: string): Promise<MaterialType | null> => {
  const { data, error } = await supabase
    .from('material_types')
    .insert({
      name: name.toLowerCase().trim(),
      active: true
    })
    .select()
    .single();

  if (error) {
    handleSupabaseError('add material type', error);
    return null;
  }

  return data;
};

// Update a material type
export const updateMaterialType = async (id: string, updates: Partial<MaterialType>): Promise<MaterialType | null> => {
  const { data, error } = await supabase
    .from('material_types')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    handleSupabaseError('update material type', error);
    return null;
  }

  return data;
};

// Delete a material type
export const deleteMaterialType = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('material_types')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete material type', error);
    return false;
  }

  return true;
};

