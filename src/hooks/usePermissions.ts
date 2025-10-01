import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export interface UserPermissions {
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
          .maybeSingle();        if (error || !orgUser) {
          setPermissions(null);
          setLoading(false);
          return;
        }

        const role = orgUser.role as 'owner' | 'data_entry' | 'admin';
        const isOwner = role === 'owner';
        const role = orgUser.role as 'owner' | 'data_entry' | 'admin';
        const isOwner = role === 'owner';
        const isDataEntry = role === 'data_entry';
        const isAdmin = role === 'admin';

        setPermissions({
          userId: user.id,
          role,
          organizationId: orgUser.organization_id,
          organizationName: (orgUser.organizations as any)?.name || 'Unknown Organization',
          isOwner,
          isDataEntry,
          canViewDashboard: isOwner || isAdmin,
          canViewPnL: isOwner,
          canViewAdmin: isOwner || isAdmin,
          canViewAlerts: isOwner || isAdmin,
          canViewDriverInsights: isOwner || isAdmin || isDataEntry,
          canViewVehicleOverview: isOwner || isAdmin || isDataEntry,
        });        console.error('Error fetching permissions:', error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, loading };
};
