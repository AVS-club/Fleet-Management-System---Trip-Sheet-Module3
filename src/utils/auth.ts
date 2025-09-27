import { supabase } from './supabaseClient';

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
  try {
    // First, get the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, username, owner_email')
      .eq('username', credentials.organizationUsername.toLowerCase())
      .eq('is_active', true)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found or inactive');
    }

    // Login with the organization's email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: org.owner_email,
      password: credentials.password
    });

    if (error) throw error;

    // Store organization context
    localStorage.setItem('current_organization', JSON.stringify({
      id: org.id,
      name: org.name,
      username: credentials.organizationUsername
    }));

    return { user: data.user, organization: org };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
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
    console.error('Logout error:', error);
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
    console.error('Error getting user organization:', error);
    return null;
  }
};
