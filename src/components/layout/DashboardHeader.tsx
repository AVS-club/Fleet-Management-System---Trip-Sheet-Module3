import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { differenceInDays } from 'date-fns';
import { TrendingUp, Truck, CheckCircle, Award, Users } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import { createLogger } from '../../utils/logger';
import { getUserActiveOrganization } from '../../utils/supaHelpers';

const logger = createLogger('DashboardHeader');

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  owner_id: string;
  created_at?: string;
}

interface DashboardHeaderProps {
  vehicleCount?: number;
  className?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ className = '' }) => {
  const { permissions } = usePermissions();
  const { t } = useTranslation();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [metrics, setMetrics] = useState({
    fleetSize: 0,
    driverCount: 0,
    tripsToday: 0,
    totalTrips: 0,
    onTimeRate: 95,
    activeDays: 0
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load organization - check organization_users first (for all users including data users)
      let org = null;
      
      // First try organization_users table (works for all users including data users)
      const { data: orgUserData } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(id, name, logo_url, created_at, tagline, owner_id)')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (orgUserData?.organizations) {
        org = orgUserData.organizations;
      } else {
        // Fallback: check if user is owner of any organization
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name, logo_url, created_at, tagline')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        org = Array.isArray(orgData) && orgData.length > 0 ? orgData[0] : null;
      }

      if (org) {
        setOrganization(org);
        setLogoError(false);
      } else if (permissions?.organizationName) {
        // ✅ USE PERMISSIONS AS FALLBACK if no org found
        setOrganization({
          id: permissions.organizationId || '',
          name: permissions.organizationName,
          owner_id: user.id
        } as Organization);
      }

      // Get organization ID for filtering
      const organizationId = await getUserActiveOrganization(user.id);
      if (!organizationId) {
        logger.warn('No organization selected for user');
        setLoading(false);
        return;
      }

      // Load fleet metrics
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get trip count using count query (no row limit)
      const { count: totalTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get earliest trip date separately
      const { data: earliestTrip } = await supabase
        .from('trips')
        .select('created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      const earliestTripDate = earliestTrip?.created_at || null;

      const today = new Date().toISOString().split('T')[0];
      const { count: todayTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', today);

      // Calculate active days from first trip
      let activeDays = 0;
      if (earliestTripDate) {
        activeDays = differenceInDays(new Date(), new Date(earliestTripDate));
      } else if (org?.created_at) {
        // Fallback to organization creation date
        activeDays = differenceInDays(new Date(), new Date(org.created_at));
      }

      setMetrics(prev => ({
        ...prev,
        fleetSize: vehicleCount || 0,
        driverCount: driverCount || 0,
        totalTrips: totalTrips || 0,
        tripsToday: todayTrips || 0,
        activeDays: activeDays
      }));
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [permissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm mb-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 ${className}`}>
      {/* Company branding header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sm:p-6 mb-3 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-4">
            {organization?.logo_url && !logoError && (
              <div className="relative flex items-center justify-center h-14 w-14 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                <img
                  src={organization.logo_url}
                  alt={organization?.name || 'Organization'}
                  className="h-13 w-13 object-contain p-0.5 filter drop-shadow-sm"
                  onError={() => {
                    setLogoError(true);
                  }}
                />
                {/* Subtle client company indicator */}
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border border-white dark:border-gray-900 shadow-sm"></div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {(() => {
                    const orgName = organization?.name || permissions?.organizationName || 'Dashboard';
                    // Temporary demo override: Replace "Shre Durga E.N.T." with "AVS Logistics"
                    if (orgName && (orgName.includes("Shre Durga") || orgName.includes("Shree Durga") || orgName.includes("Shridurga") || orgName.includes("E.N.T."))) {
                      return 'AVS Logistics';
                    }
                    return orgName;
                  })()}
                </h1>
                {/* Subtle "Powered by AVS" indicator */}
                <div className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 rounded-full border border-primary-200 dark:border-primary-700">
                  <div className="h-1.5 w-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-[10px] font-medium text-primary-700 dark:text-primary-300">Powered by AVS</span>
                </div>
              </div>
              {organization?.tagline && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{organization.tagline}</p>
              )}
            </div>
          </div>

          {/* Motivational metrics */}
          <div className="hidden md:flex items-center space-x-3 text-sm">
            <div className="flex items-center space-x-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg px-2 py-1">
              <Truck className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{metrics.fleetSize}</span>
            </div>
            <div className="flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg px-2 py-1">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{metrics.driverCount}</span>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 rounded-lg px-2 py-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.todayTrips', { count: metrics.tripsToday })}</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-2 py-1">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.totalTrips', { count: metrics.totalTrips })}</span>
            </div>
            <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg px-2 py-1">
              <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.activeDays', { count: metrics.activeDays })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile metrics */}
      <div className="md:hidden grid grid-cols-2 gap-1.5 text-sm">
        <div className="flex items-center space-x-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg px-2 py-1">
          <Truck className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <span className="font-semibold text-gray-700 dark:text-gray-100">{metrics.fleetSize}</span>
        </div>
        <div className="flex items-center space-x-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg px-2 py-1">
          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold text-gray-700 dark:text-gray-100">{metrics.driverCount}</span>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 rounded-lg px-2 py-1">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('dashboard.todayTrips', { count: metrics.tripsToday })}</span>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-2 py-1">
          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('dashboard.totalTrips', { count: metrics.totalTrips })}</span>
        </div>
        <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg px-2 py-1">
          <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('dashboard.activeDays', { count: metrics.activeDays })}</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
