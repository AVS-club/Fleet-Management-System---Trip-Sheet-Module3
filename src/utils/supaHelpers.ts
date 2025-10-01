// src/utils/supaHelpers.ts

import { supabase } from './supabaseClient';

// Updated helper to use created_by and organization_id for multi-tenant architecture
export function withOwner<T extends Record<string, any>>(
  payload: T, 
  userId?: string | null,
  organizationId?: string | null
): T {
  return { 
    ...payload,
    created_by: userId ?? (payload as any).created_by,
    organization_id: organizationId ?? (payload as any).organization_id
  };
}

// Helper to get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// New helper function to get user's active organization
export async function getUserActiveOrganization(userId: string): Promise<string | null> {
  try {
    // First try to get from profiles.active_organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors
    
    if (!profileError && profile?.active_organization_id) {
      return profile.active_organization_id;
    }
    
    // Fallback: get first organization from organization_users
    const { data: membership, error: membershipError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors
    
    if (!membershipError && membership?.organization_id) {
      return membership.organization_id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user active organization:', error);
    return null;
  }
}