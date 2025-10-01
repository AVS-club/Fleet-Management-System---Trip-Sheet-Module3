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

                // First try to get organization user data
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
          console.error('Error fetching user organization:', error);
          console.log('User ID:', user.id);
          console.log('OrgUser data:', orgUser);
          
          setPermissions(null);
          setLoading(false);
          return;
        }

                console.log('Fetched orgUser:', orgUser);
                console.log('Organization data:', orgUser.organizations);
                console.log('Organization name:', (orgUser.organizations as any)?.name);

                const role = orgUser.role as 'owner' | 'data_entry' | 'admin';
                const isOwner = role === 'owner';
                const isDataEntry = role === 'data_entry';
                const isAdmin = role === 'admin';

                // Extract organization name with fallback
                let organizationName = 'Shree Durga Ent.'; // Default fallback
                
                if (orgUser.organizations && (orgUser.organizations as any).name) {
                  organizationName = (orgUser.organizations as any).name;
                } else if (orgUser.organization_id) {
                  // If join failed, fetch organization name directly
                  try {
                    const { data: orgData, error: orgError } = await supabase
                      .from('organizations')
                      .select('name')
                      .eq('id', orgUser.organization_id)
                      .single();
                    
                    if (!orgError && orgData && orgData.name) {
                      organizationName = orgData.name;
                      console.log('Fetched organization name directly:', organizationName);
                    } else {
                      console.error('Error fetching organization name directly:', orgError);
                    }
                  } catch (directFetchError) {
                    console.error('Exception fetching organization name directly:', directFetchError);
                  }
                }

                console.log('Final organization name:', organizationName);

        setPermissions({
          userId: user.id,
          role,
          organizationId: orgUser.organization_id,
          organizationName,
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