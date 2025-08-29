import { supabase, isNetworkError } from '../utils/supabaseClient';
import { handleSupabaseError } from '../utils/errors';

/**
 * Helper to fetch rows for the authenticated user.
 * Handles network errors and unauthenticated states consistently.
 */
export async function fetchWithUser<T>(
  table: string,
  cols: string,
  orderColumn = 'created_at'
): Promise<T[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        console.warn(`Network error fetching user for ${table}, returning empty array`);
        return [];
      }
      handleSupabaseError(`get user for ${table}`, userError);
      return [];
    }

    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const query = supabase
      .from(table)
      .select(cols)
      .eq('added_by', user.id);
    if (orderColumn) {
      query.order(orderColumn, { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(`fetch ${table}`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn(`Network error fetching user for ${table}, returning empty array`);
      return [];
    }
    handleSupabaseError(`get user for ${table}`, error);
    return [];
  }
}
