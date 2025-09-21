import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { TrendingUp, Truck, CheckCircle, Award } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

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

      // Load organization
      const { data: org } = await supabase
        .from('organizations')
        .select('name, logo_url, created_at, tagline')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (org) {
        setOrganization(org);
        setLogoError(false);
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
    <div className={`mb-6 ${className}`}>
      {/* Company branding header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {organization?.logo_url && !logoError && (
              <img 
                src={organization.logo_url} 
                alt={organization.name}
                className="h-12 w-12 rounded-lg object-contain border border-gray-200"
                onError={() => {
                  setLogoError(true);
                }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {organization?.name || 'Dashboard'}
              </h1>
              {organization?.tagline && (
                <p className="text-sm text-gray-600 mt-1">{organization.tagline}</p>
              )}
            </div>
          </div>
          
          {/* Motivational metrics */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 bg-primary-50 rounded-lg px-3 py-2">
              <Truck className="h-4 w-4 text-primary-600" />
              <span className="text-gray-600">Fleet:</span>
              <span className="font-semibold text-primary-700">{metrics.fleetSize} vehicles</span>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-gray-600">Today:</span>
              <span className="font-semibold text-green-700">{metrics.tripsToday} trips</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-3 py-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold text-blue-700">{metrics.totalTrips.toLocaleString()} trips</span>
            </div>
            <div className="flex items-center space-x-2 bg-yellow-50 rounded-lg px-3 py-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <span className="text-gray-600">Active:</span>
              <span className="font-semibold text-yellow-700">{metrics.activeDays} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile metrics */}
      <div className="md:hidden grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2 bg-primary-50 rounded-lg px-3 py-2">
          <Truck className="h-4 w-4 text-primary-600" />
          <span className="font-medium">{metrics.fleetSize} vehicles</span>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="font-medium">{metrics.tripsToday} trips today</span>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-3 py-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{metrics.totalTrips.toLocaleString()} total trips</span>
        </div>
        <div className="flex items-center space-x-2 bg-yellow-50 rounded-lg px-3 py-2">
          <Award className="h-4 w-4 text-yellow-600" />
          <span className="font-medium">{metrics.activeDays} active days</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;