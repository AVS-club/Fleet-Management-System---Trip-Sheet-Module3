import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { TrendingUp, Truck, CheckCircle, Award } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';

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
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [metrics, setMetrics] = useState({
    fleetSize: 0,
    tripsToday: 0,
    totalTrips: 0,
    onTimeRate: 95,
    activeDays: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load organization - get the most recent one for this user
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, logo_url, created_at, tagline')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const org = Array.isArray(orgData) && orgData.length > 0 ? orgData[0] : null;
      
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

      // Load fleet metrics
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id);

      // Get trip count and earliest trip date in a single query
      const { data: tripStats } = await supabase
        .from('trips')
        .select('created_at')
        .eq('created_by', user.id);

      const totalTrips = tripStats?.length || 0;
      const earliestTripDate = tripStats && tripStats.length > 0 
        ? tripStats.reduce((earliest: string, trip: { created_at: string }) => 
            new Date(trip.created_at) < new Date(earliest) ? trip.created_at : earliest, 
            tripStats[0].created_at
          )
        : null;

      const today = new Date().toISOString().split('T')[0];
      const { count: todayTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
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
        totalTrips: totalTrips || 0,
        tripsToday: todayTrips || 0,
        activeDays: activeDays
      }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className={`rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 ${className}`}>
      {/* Company branding header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {organization?.logo_url && !logoError && (
              <div className="relative flex items-center justify-center h-14 w-14 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200">
                <img 
                  src={organization.logo_url} 
                  alt={organization.name}
                  className="h-13 w-13 object-contain p-0.5 filter drop-shadow-sm"
                  onError={() => {
                    setLogoError(true);
                  }}
                />
                {/* Subtle client company indicator */}
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border border-white shadow-sm"></div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  {organization?.name || permissions?.organizationName || 'Dashboard'}
                </h1>
                {/* Subtle "Powered by AVS" indicator */}
                <div className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 rounded-full border border-primary-200">
                  <div className="h-1.5 w-1.5 bg-primary-500 rounded-full"></div>
                  <span className="text-[10px] font-medium text-primary-700">Powered by AVS</span>
                </div>
              </div>
              {organization?.tagline && (
                <p className="text-sm text-gray-600 mt-1">{organization.tagline}</p>
              )}
            </div>
          </div>
          
          {/* Motivational metrics */}
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 bg-primary-50 rounded-lg px-2 py-1">
              <Truck className="h-4 w-4 text-primary-600" />
              <span className="text-gray-600">Fleet:</span>
              <span className="font-semibold text-primary-700">{metrics.fleetSize} vehicles</span>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-2 py-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-gray-600">Today:</span>
              <span className="font-semibold text-green-700">{metrics.tripsToday} trips</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-2 py-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold text-blue-700">{metrics.totalTrips.toLocaleString()} trips</span>
            </div>
            <div className="flex items-center space-x-2 bg-yellow-50 rounded-lg px-2 py-1">
              <Award className="h-4 w-4 text-yellow-600" />
              <span className="text-gray-600">Active:</span>
              <span className="font-semibold text-yellow-700">{metrics.activeDays} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile metrics */}
      <div className="md:hidden grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center space-x-2 bg-primary-50 rounded-lg px-2 py-1">
          <Truck className="h-4 w-4 text-primary-600" />
          <span className="font-medium">{metrics.fleetSize} vehicles</span>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-2 py-1">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="font-medium">{metrics.tripsToday} trips today</span>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-2 py-1">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{metrics.totalTrips.toLocaleString()} total trips</span>
        </div>
        <div className="flex items-center space-x-2 bg-yellow-50 rounded-lg px-2 py-1">
          <Award className="h-4 w-4 text-yellow-600" />
          <span className="font-medium">{metrics.activeDays} active days</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;