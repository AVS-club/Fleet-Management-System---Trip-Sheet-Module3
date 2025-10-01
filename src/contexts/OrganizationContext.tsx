import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getCurrentUserId } from '@/utils/supaHelpers';

interface OrganizationContextType {
  currentOrganizationId: string | null;
  setCurrentOrganization: (orgId: string) => Promise<void>;
  organizations: Array<{ id: string; name: string; role: string }>;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserOrganizations();
  }, []);

  const loadUserOrganizations = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      // Get user's organizations
      const { data: orgs, error } = await supabase
        .from('organization_users')
        .select('organization_id, role, organizations(id, name)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching organizations:', error);
        setLoading(false);
        return;
      }

      const formattedOrgs = orgs?.map(org => ({
        id: org.organization_id,
        name: org.organizations?.name || 'Unknown Organization',
        role: org.role
      })) || [];

      setOrganizations(formattedOrgs);
      
      // Get active organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', userId)
        .single();
      
      setCurrentOrganizationId(profile?.active_organization_id || formattedOrgs[0]?.id || null);
    } catch (error) {
      console.error('Error loading user organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentOrganization = async (orgId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      await supabase
        .from('profiles')
        .update({ active_organization_id: orgId })
        .eq('id', userId);
      
      setCurrentOrganizationId(orgId);
    } catch (error) {
      console.error('Error setting current organization:', error);
    }
  };

  return (
    <OrganizationContext.Provider value={{
      currentOrganizationId,
      setCurrentOrganization,
      organizations,
      loading
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
