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
          .from('organization_users')
          .select(`
            role,
            organization_id,
            organizations (
              name
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error || !orgUser) {
          console.error('Error fetching user organization:', error);
          console.log('User ID:', user.id);
          console.log('OrgUser data:', orgUser);
          setPermissions(null);
          setLoading(false);
          return;
        }

        console.log('Fetched orgUser:', orgUser);
        console.log('Organization name:', (orgUser.organizations as any)?.name);

        const role = orgUser.role as 'owner' | 'data_entry' | 'admin';
        const isOwner = role === 'owner';
        const isDataEntry = role === 'data_entry';
        const isAdmin = role === 'admin';

        setPermissions({
          userId: user.id,
          role,
          organizationId: orgUser.organization_id,
          organizationName: (orgUser.organizations as any)?.name || 'Shree Durga Ent.',
          isOwner,
          isDataEntry,
          canViewDashboard: isOwner || isAdmin,
          canViewPnL: isOwner,
          canViewAdmin: isOwner || isAdmin,
          canViewAlerts: isOwner || isAdmin,
          canViewDriverInsights: isOwner || isAdmin,
          canViewVehicleOverview: isOwner || isAdmin,
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