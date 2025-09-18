// src/utils/supaHelpers.ts

import { supabase } from './supabaseClient';

// Minimal helper to force created_by when inserting
export function withOwner<T extends Record<string, any>>(payload: T, userId?: string | null): T {
  // If backend trigger fails for any reason, we still set it
  return { added_by: userId ?? (payload as any).added_by, ...payload };
}

// Helper to get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}