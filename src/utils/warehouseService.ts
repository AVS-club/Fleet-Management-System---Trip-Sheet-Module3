import { supabase } from './supabaseClient';

export type Warehouse = {
  id: string;
  name: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean; // Existing field, keep for compatibility if needed
  material_type_ids?: string[];
  created_at?: string;
  updated_at?: string;
  is_active: boolean; // New field
  created_by: string; // New field
};

export async function listWarehouses(opts: { includeInactive?: boolean } = {}) {
  const q = supabase.from("warehouses").select("*").order("created_at", { ascending: false });
  if (!opts.includeInactive) {
    q.eq("is_active", true);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Warehouse[];
}

export async function createWarehouse(payload: Partial<Warehouse>) {
  const { data, error } = await supabase.from("warehouses").insert([{ ...payload }]).select().single();
  if (error) throw error;
  return data;
}

export async function updateWarehouse(id: string, payload: Partial<Warehouse>) {
  const { data, error } = await supabase.from("warehouses").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function archiveWarehouse(id: string) {
  const { error } = await supabase.from("warehouses").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

export async function restoreWarehouse(id: string) {
  const { error } = await supabase.from("warehouses").update({ is_active: true }).eq("id", id);
  if (error) throw error;
}

/** Use only for admin maintenance; FK constraints may block this. */
export async function hardDeleteWarehouse(id: string) {
  const { error } = await supabase.from("warehouses").delete().eq("id", id);
  if (error) throw error;
}