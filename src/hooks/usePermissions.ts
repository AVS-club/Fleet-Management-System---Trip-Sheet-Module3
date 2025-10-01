import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Permissions, OrganizationUser, UserRole } from '../types/permissions';

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

      if (orgError) {
        console.error('Error fetching organization user:', orgError);
        throw orgError;
      }

      // Safely extract organization name
      const organizationName = orgUser?.organizations?.name || 'Organization';
      const userRole = orgUser?.role as UserRole || 'data_entry';

      // Set permissions based on role
      const newPermissions: Permissions = {
        role: userRole,
        organizationId: orgUser?.organization_id || null,
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
        console.log(`✅ Permissions loaded in ${duration.toFixed(2)}ms`);
      }
      
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      
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