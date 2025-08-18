import { supabase } from './supabaseClient';
import { Warehouse } from '../types';

export const listWarehouses = async (): Promise<Warehouse[]> => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching warehouses:', error);
    throw error;
  }

  return data || [];
};

export const createWarehouse = async (warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> => {
  const { data, error } = await supabase
    .from('warehouses')
    .insert({
      ...warehouse,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating warehouse:', error);
    throw error;
  }

  return data;
};

export const updateWarehouse = async (id: string, updates: Partial<Warehouse>): Promise<Warehouse> => {
  const { data, error } = await supabase
    .from('warehouses')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating warehouse:', error);
    throw error;
  }

  return data;
};

export const deleteWarehouse = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting warehouse:', error);
    throw error;
  }
};