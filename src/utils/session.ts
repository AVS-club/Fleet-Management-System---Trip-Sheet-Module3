import { supabase } from "./supabaseClient";

export type Role = "OWNER" | "ADD_ONLY";

export async function getRole(): Promise<Role> {
  const { data, error } = await supabase.from("profiles").select("role").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No profile found for user");
  return data.role as Role;
}