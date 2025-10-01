import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface UserPermissions {
  userId: string;
  role: 'owner' | 'data_entry' | 'admin' | null;
  organizationId: string;
  organizationName: string;
  isOwner: boolean;
  isDataEntry: boolean;
  canViewDashboard: boolean;
  canViewPnL: boolean;
  canViewAdmin: boolean;
  canViewAlerts: boolean;
  canViewDriverInsights: boolean;
  canViewVehicleOverview: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermissions(null);
          setLoading(false);
          return;
        }

        const { data: orgUser, error } = await supabase
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

        if (error || !orgUser) {
          setPermissions(null);
          setLoading(false);
          return;
        }

        const role = orgUser.role as 'owner' | 'data_entry' | 'admin';
        const isOwner = role === 'owner';
        const isDataEntry = role === 'data_entry';

        setPermissions({
          userId: user.id,
          role,
          organizationId: orgUser.organization_id,
          organizationName: (orgUser.organizations as any)?.name || 'Unknown Organization',
          isOwner,
          isDataEntry,
          canViewDashboard: isOwner,
          canViewPnL: isOwner,
          canViewAdmin: isOwner,
          canViewAlerts: isOwner,
          canViewDriverInsights: isOwner,
          canViewVehicleOverview: isOwner,
        });
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, loading };
};
