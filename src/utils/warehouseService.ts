import { supabase } from './supabaseClient';

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Convert object keys from camelCase to snake_case
const convertKeysToSnakeCase = (
  obj: Record<string, any>
): Record<string, any> => {
  const newObj: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const newKey = toSnakeCase(key);
    const value = obj[key];

    newObj[newKey] =
      value && typeof value === "object" && !Array.isArray(value)
        ? convertKeysToSnakeCase(value)
        : value;
  });

  return newObj;
};

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
  // Convert camelCase keys to snake_case for database
  const dbPayload = convertKeysToSnakeCase(payload);
  
  const { data, error } = await supabase.from("warehouses").insert([dbPayload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateWarehouse(id: string, payload: Partial<Warehouse>) {
  // Convert camelCase keys to snake_case for database
  const dbPayload = convertKeysToSnakeCase(payload);
  
  const { data, error } = await supabase.from("warehouses").update(dbPayload).eq("id", id).select().single();
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