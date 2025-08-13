import { supabase } from "./supabaseClient";

export type Role = "OWNER" | "ADD_ONLY";

/**
 * Returns the current user's role.
 * - If not signed in -> throws 'UNAUTHENTICATED'
 * - If signed in but no profile -> creates ADD_ONLY profile automatically
 */
export async function getRole(): Promise<Role> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw userErr;
  if (!user) throw new Error("UNAUTHENTICATED");

  // Try to get profile
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profErr) throw profErr;

  if (prof?.role) return prof.role as Role;

  // No profile row yet — bootstrap as ADD_ONLY
  const { data: inserted, error: insErr } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, role: "ADD_ONLY" })
    .select("role")
    .single();

  if (insErr) throw insErr;
  return inserted.role as Role;
}