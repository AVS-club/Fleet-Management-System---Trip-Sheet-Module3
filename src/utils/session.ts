import { supabase } from "./supabaseClient";

export type Role = "OWNER" | "ADD_ONLY" | "MANAGER" | "STAFF" | "VIEWER";

export async function getRole(): Promise<Role> {
  const { data, error } = await supabase.from("profiles").select("role").single();
  if (error) throw error;
  return data.role as Role;
}