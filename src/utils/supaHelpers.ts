// src/utils/supaHelpers.ts

import { supabase } from './supabaseClient';

// Updated helper to use created_by for trips table
export function withOwner<T extends Record<string, any>>(payload: T, userId?: string | null): T {
  // Set created_by for trips table to match RLS policies
  return { created_by: userId ?? (payload as any).created_by, ...payload };
}

// Helper to get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}