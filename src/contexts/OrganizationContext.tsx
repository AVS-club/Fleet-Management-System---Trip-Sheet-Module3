import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getCurrentUserId } from '@/utils/supaHelpers';
import { createLogger } from '../utils/logger';

const logger = createLogger('OrganizationContext');

interface OrganizationContextType {
  currentOrganizationId: string | null;
  setCurrentOrganization: (orgId: string) => Promise<void>;
  organizations: Array<{ id: string; name: string; role: string }>;
  loading: boolean;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

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

      // Get user's organizations from organization_users table
      const { data: orgs, error } = await supabase
        .from('organization_users')
        .select('organization_id, role, organizations(id, name)')
        .eq('user_id', userId);

      if (error) {
        logger.error('Error fetching organizations:', error);
        setLoading(false);
        return;
      }

      let formattedOrgs = orgs?.map(org => ({
        id: org.organization_id,
        name: org.organizations?.name || 'Unknown Organization',
        role: org.role
      })) || [];

      // ✅ FALLBACK: If no organizations found in organization_users, check if user owns any organizations directly
      if (formattedOrgs.length === 0) {
        const { data: ownedOrgs, error: ownedError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('owner_id', userId);

        if (!ownedError && ownedOrgs && ownedOrgs.length > 0) {
          formattedOrgs = ownedOrgs.map(org => ({
            id: org.id,
            name: org.name,
            role: 'owner'
          }));

          // ✅ AUTO-CREATE organization_users record for the owned organization
          const orgToCreate = ownedOrgs[0]; // Use the first owned organization
          const { error: createError } = await supabase
            .from('organization_users')
            .insert([{
              user_id: userId,
              organization_id: orgToCreate.id,
              role: 'owner'
            }]);

          if (createError) {
            logger.error('Error auto-creating organization_users record:', createError);
          }
        }
      }

      setOrganizations(formattedOrgs);
      
      // Get active organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', userId)
        .single();
      
      setCurrentOrganizationId(profile?.active_organization_id || formattedOrgs[0]?.id || null);
    } catch (error) {
      logger.error('Error loading user organizations:', error);
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
      logger.error('Error setting current organization:', error);
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

// eslint-disable-next-line react-refresh/only-export-components
export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
