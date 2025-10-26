import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('auth');

interface LoginCredentials {
  organizationUsername: string;
  password: string;
}

interface Organization {
  id: string;
  name: string;
  username: string;
  owner_email: string;
}

export const loginWithOrganization = async (credentials: LoginCredentials) => {
  // Just use email directly - no organization lookup
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.organizationUsername.includes('@') 
      ? credentials.organizationUsername 
      : credentials.organizationUsername + '@gmail.com', // Add domain if missing
    password: credentials.password
  });

  if (error) throw error;

  // After login, get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', data.user.id)
    .single();

  localStorage.setItem('current_organization', JSON.stringify(org));
  
  return { user: data.user, organization: org };
};

export const getCurrentOrganization = (): Organization | null => {
  const stored = localStorage.getItem('current_organization');
  return stored ? JSON.parse(stored) : null;
};

export const getCurrentOrganizationId = (): string | null => {
  const org = getCurrentOrganization();
  return org?.id || null;
};

export const getCurrentOrganizationName = (): string | null => {
  const org = getCurrentOrganization();
  return org?.name || null;
};

export const logout = async () => {
  try {
    localStorage.removeItem('current_organization');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    logger.error('Logout error:', error);
    throw error;
  }
};

// Helper function to check if user belongs to organization
export const getUserOrganization = async (userId: string): Promise<Organization | null> => {
  try {
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        organization_id,
        organizations!inner(id, name, username, owner_email)
      `)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (error || !data) return null;

    return {
      id: data.organizations.id,
      name: data.organizations.name,
      username: data.organizations.username,
      owner_email: data.organizations.owner_email
    };
  } catch (error) {
    logger.error('Error getting user organization:', error);
    return null;
  }
};
