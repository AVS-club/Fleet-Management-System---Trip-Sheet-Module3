import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Permissions, OrganizationUser, UserRole } from '../types/permissions';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePermissions');

export const usePermissions = (): {
  permissions: Permissions | null;
  loading: boolean;
  refetch: () => Promise<void>;
} => {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = async () => {
    const startTime = performance.now();
    setLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Single optimized query with proper left join
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select(`
          role,
          organization_id,
          organizations (
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      let organizationName = 'Organization';
      let userRole: UserRole = 'data_entry';
      let organizationId: string | null = null;

      if (orgError) {
        logger.error('Error fetching organization user:', orgError);
        
        // ✅ FALLBACK: If no organization_users record, check if user owns any organizations directly
        const { data: ownedOrg, error: ownedError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('owner_id', user.id)
          .single();

        if (!ownedError && ownedOrg) {
          organizationName = ownedOrg.name;
          userRole = 'owner';
          organizationId = ownedOrg.id;

          // ✅ AUTO-CREATE organization_users record
          const { error: createError } = await supabase
            .from('organization_users')
            .insert([{
              user_id: user.id,
              organization_id: ownedOrg.id,
              role: 'owner'
            }]);

          if (createError) {
            logger.error('Error auto-creating organization_users record:', createError);
          }
        }
      } else {
        // Safely extract organization name from organization_users
        organizationName = orgUser?.organizations?.name || 'Organization';
        userRole = orgUser?.role as UserRole || 'data_entry';
        organizationId = orgUser?.organization_id || null;
      }

      // Set permissions based on role
      const newPermissions: Permissions = {
        role: userRole,
        organizationId: organizationId,
        organizationName,
        canAccessDashboard: userRole !== 'data_entry',
        canAccessReports: userRole !== 'data_entry',
        canAccessAdmin: userRole === 'admin' || userRole === 'owner',
        canAccessAlerts: userRole !== 'data_entry',
        canViewDriverInsights: userRole !== 'data_entry',
        canViewVehicleOverview: userRole !== 'data_entry',
      };

      setPermissions(newPermissions);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Only log in development
      if (import.meta.env.DEV) {
        logger.debug(`✅ Permissions loaded in ${duration.toFixed(2)}ms`);
      }
      
    } catch (error) {
      logger.error('Failed to fetch user permissions:', error);
      
      // Set safe defaults on error
      setPermissions({
        role: 'data_entry',
        organizationId: null,
        organizationName: 'Organization',
        canAccessDashboard: false,
        canAccessReports: false,
        canAccessAdmin: false,
        canAccessAlerts: false,
        canViewDriverInsights: false,
        canViewVehicleOverview: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  return { permissions, loading, refetch: fetchUserPermissions };
};