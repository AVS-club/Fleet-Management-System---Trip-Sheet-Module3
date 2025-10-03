import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import DashboardHeader from '../components/layout/DashboardHeader';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { getTrips, getVehicles, getVehicle, getVehicleStats } from '../utils/storage';
import { getDrivers, getDriver } from '../utils/api/drivers';
import { format } from 'date-fns';
import { Trip, Vehicle, Driver } from '@/types';
import StatCard from '../components/ui/StatCard';
import MileageChart from '../components/dashboard/MileageChart';
import VehicleStatsList from '../components/dashboard/VehicleStatsList';
import RecentTripsTable from '../components/dashboard/RecentTripsTable';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import DashboardTip from '../components/dashboard/DashboardTip';
import EmptyState from '../components/dashboard/EmptyState';
import RealTimeAnalytics from '../components/analytics/RealTimeAnalytics';
import PredictiveMaintenance from '../components/analytics/PredictiveMaintenance';
import { BarChart, BarChart2, Calculator, Truck, Users, TrendingUp, CalendarRange, Fuel, AlertTriangle, IndianRupee, Bell, Lightbulb, LayoutDashboard, Activity, Wrench } from 'lucide-react';
import { getMileageInsights } from '../utils/mileageCalculator';
import { useQuery } from '@tanstack/react-query';
import { NumberFormatter } from '@/utils/numberFormatter';
import FleetIQScanner from '../components/FleetIQScanner';

const DashboardPage: React.FC = () => {
  // ✅ ALL HOOKS FIRST - NO CONDITIONAL LOGIC YET
  const navigate = useNavigate();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'maintenance'>('overview');
  
  // Use React Query for better caching and performance
  const { data: trips = [], isLoading: tripsLoading, error: tripsError } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
  });

  const { data: drivers = [], isLoading: driversLoading, error: driversError } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
  });

  const loading = permissionsLoading || tripsLoading || vehiclesLoading || driversLoading;
  
  // Calculate stats with error handling and performance optimization
  const stats = useMemo(() => {
    if (!Array.isArray(trips) || trips.length === 0) {
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalFuel: 0,
        avgMileage: 0,
        tripsThisMonth: 0,
        lastTripDate: undefined,
        bestVehicle: null,
        bestVehicleMileage: 0,
        bestDriver: null,
        bestDriverMileage: 0,
        estimatedFuelSaved: 0,
        earliestTripDate: undefined,
        latestTripDate: undefined
      };
    }

    try {
      // Pre-calculate values to avoid repeated calculations
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let totalDistance = 0;
      let totalFuel = 0;
      let tripsWithKmpl = 0;
      let totalKmpl = 0;
      let tripsThisMonth = 0;
      const tripDates: number[] = [];
      
      // Single pass through trips for better performance
      for (const trip of trips) {
        // Distance calculation
        const distance = trip.end_km - trip.start_km;
        totalDistance += distance;
        
        // Fuel calculation
        totalFuel += trip.fuel_quantity || 0;
        
        // Mileage calculation
        if (trip.calculated_kmpl && trip.calculated_kmpl > 0) {
          tripsWithKmpl++;
          totalKmpl += trip.calculated_kmpl;
        }
        
        // Monthly trips
        const tripDate = new Date(trip.trip_start_date);
        if (tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear) {
          tripsThisMonth++;
        }
        
        // Date tracking
        tripDates.push(tripDate.getTime());
      }
      
      const avgMileage = tripsWithKmpl > 0 ? totalKmpl / tripsWithKmpl : 0;
      const mileageInsights = getMileageInsights(trips);
      
      const earliestTripDate = tripDates.length > 0 ? new Date(Math.min(...tripDates)) : undefined;
      const latestTripDate = tripDates.length > 0 ? new Date(Math.max(...tripDates)) : undefined;
      
      return {
        totalTrips: trips.length,
        totalDistance,
        totalFuel,
        avgMileage,
        tripsThisMonth,
        lastTripDate: tripDates.length > 0 ? new Date(Math.max(...tripDates)) : undefined,
        bestVehicle: null,
        bestVehicleMileage: mileageInsights.bestVehicleMileage,
        bestDriver: null,
        bestDriverMileage: mileageInsights.bestDriverMileage,
        estimatedFuelSaved: mileageInsights.estimatedFuelSaved,
        earliestTripDate,
        latestTripDate
      };
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalFuel: 0,
        avgMileage: 0,
        tripsThisMonth: 0,
        lastTripDate: undefined,
        bestVehicle: null,
        bestVehicleMileage: 0,
        bestDriver: null,
        bestDriverMileage: 0,
        estimatedFuelSaved: 0,
        earliestTripDate: undefined,
        latestTripDate: undefined
      };
    }
  }, [trips]);

  // Get best performers with React Query for better caching
  const mileageInsights = useMemo(() => getMileageInsights(trips), [trips]);
  
  const { data: bestVehicle } = useQuery({
    queryKey: ['vehicle', mileageInsights.bestVehicle],
    queryFn: () => getVehicle(mileageInsights.bestVehicle!),
    enabled: !!mileageInsights.bestVehicle,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: bestDriver } = useQuery({
    queryKey: ['driver', mileageInsights.bestDriver],
    queryFn: () => getDriver(mileageInsights.bestDriver!),
    enabled: !!mileageInsights.bestDriver,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // ✅ THEN PERMISSION CHECKS AFTER ALL HOOKS
  if (permissionsLoading) {
    return <div>Loading...</div>;
  }

  // Redirect data entry users to vehicles page - FIXED: use correct permission property
  if (!permissions?.canAccessDashboard) {
    return <Navigate to="/vehicles" replace />;
  }
  
  const handleSelectTrip = (trip: Trip) => {
    navigate(`/trips/${trip.id}`);
  };
  
  const handleDataPointClick = (tripId: string) => {
    navigate(`/trips/${tripId}`);
  };
  
  const handleSelectVehicle = (vehicle: Vehicle) => {
    navigate(`/vehicles/${vehicle.id}`);
  };

  // Check if we have enough data to show insights
  const hasEnoughData = Array.isArray(trips) && trips.length > 0;
  const hasRefuelingData = Array.isArray(trips) && trips.some(trip => trip.fuel_quantity);
  
  // Handle errors
  const hasError = tripsError || vehiclesError || driversError;
  
  if (hasError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-500 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-display font-semibold tracking-tight-plus">Error Loading Dashboard</h3>
            <p className="text-sm font-sans text-gray-600 dark:text-gray-400">
              There was an error loading your dashboard data. Please try refreshing the page.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
          <p className="text-sm font-sans text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      ) : (
      <div className="space-y-4">
        {/* Page Header */}
        <DashboardHeader vehicleCount={vehicles.filter(v => v.status !== 'archived').length} />
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-6">
          <div className="flex space-x-2">
            {(['overview', 'analytics', 'maintenance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-sans font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && <LayoutDashboard className="h-4 w-4 mr-2 inline" />}
                {tab === 'analytics' && <Activity className="h-4 w-4 mr-2 inline" />}
                {tab === 'maintenance' && <Wrench className="h-4 w-4 mr-2 inline" />}
                {t(`dashboard.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-2 mb-6">
                <BarChart2 className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-display font-semibold tracking-tight-plus text-gray-900">{t('dashboard.keyMetrics')}</h2>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate("/trips")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/trips")}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 hover:shadow-md transition-all"
          >
            <StatCard
              title={t('dashboard.totalTrips')}
              value={stats.totalTrips}
              icon={<BarChart className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
              trend={stats.tripsThisMonth > 0 ? {
                value: 12,
                label: t('dashboard.vsLastMonth'),
                isPositive: true
              } : undefined}
            />
          </div>

          <div
            onClick={() => navigate("/trips")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/trips")}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 hover:shadow-md transition-all"
          >
            <StatCard
              title={t('dashboard.totalDistance')}
              value={NumberFormatter.large(stats.totalDistance)}
              className={
                stats.avgMileage > 4.0
                  ? "bg-emerald-50"
                  : stats.avgMileage >= 3.0 && stats.avgMileage <= 4.0
                  ? "bg-orange-50"
                  : stats.avgMileage < 3.0 && stats.avgMileage > 0
                  ? "bg-red-50"
                  : ""
              }
              subtitle="km"
              icon={<TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
            />
          </div>

          {hasRefuelingData ? (
            <>
              <div>
                <StatCard
                  title={t('dashboard.averageMileage')}
                  value={stats.avgMileage ? NumberFormatter.display(stats.avgMileage, 2) : "-"}
                  className={
                    stats.avgMileage > 4.0
                      ? "bg-emerald-50"
                      : stats.avgMileage >= 3.0 && stats.avgMileage <= 4.0
                      ? "bg-orange-50"
                      : stats.avgMileage < 3.0 && stats.avgMileage > 0
                      ? "bg-red-50"
                      : ""
                  }
                  subtitle="km/L"
                  icon={<Calculator className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
                />
              </div>
              
              <div>
                <StatCard
                  title={t('dashboard.totalFuelUsed')}
                  value={NumberFormatter.large(stats.totalFuel)}
                  subtitle="L"
                  icon={<Fuel className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
                />
              </div>
            </>
          ) : (
            <div
              onClick={() => navigate("/trips")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/trips")}
              className="col-span-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 hover:shadow-md transition-all bg-slate-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center"
            >
              <Fuel className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
              <div>
                <h3 className="text-sm font-sans font-medium text-gray-700 dark:text-gray-300">Fuel Insights</h3>
                <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-1">
                  Mileage and fuel consumption insights will appear after trips with refueling are logged.
                </p>
              </div>
            </div>
          )}
              </div>
            </div>

            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            {/* Performance Highlights */}
            {hasRefuelingData && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                <div className="flex items-center space-x-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-success-600" />
                  <h2 className="text-lg font-display font-semibold tracking-tight-plus text-gray-900">{t('dashboard.performanceHighlights')}</h2>
                </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {bestVehicle && (
              <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-display font-medium tracking-tight-plus text-gray-900 dark:text-gray-100">{t('dashboard.bestVehicle')}</h3>
                  <Truck className="h-6 w-6 text-success-500 dark:text-success-400" />
                </div>
                <div className="mt-3 sm:mt-4">
                  <p className="text-xl sm:text-2xl font-display font-bold tracking-tight-plus text-gray-900 dark:text-gray-100">{bestVehicle.registration_number}</p>
                  <p className="text-xs sm:text-sm font-sans text-gray-500 dark:text-gray-400">{bestVehicle.make} {bestVehicle.model}</p>
                  <p className="mt-1 sm:mt-2 text-success-600 dark:text-success-400 font-sans font-medium text-sm sm:text-base">
                    {stats.bestVehicleMileage?.toFixed(2)} km/L
                  </p>
                </div>
              </div>
            )}

            {bestDriver && (
              <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-display font-medium tracking-tight-plus text-gray-900 dark:text-gray-100">{t('dashboard.bestDriver')}</h3>
                  <Users className="h-6 w-6 text-success-500 dark:text-success-400" />
                </div>
                <div className="mt-3 sm:mt-4">
                  <p className="text-xl sm:text-2xl font-display font-bold tracking-tight-plus text-gray-900 dark:text-gray-100">{bestDriver.name}</p>
                  <p className="text-xs sm:text-sm font-sans text-gray-500 dark:text-gray-400">{t('dashboard.license')}: {bestDriver.license_number}</p>
                  <p className="mt-1 sm:mt-2 text-success-600 dark:text-success-400 font-sans font-medium text-sm sm:text-base">
                    {stats.bestDriverMileage?.toFixed(2)} km/L
                  </p>
                </div>
              </div>
            )}

              </div>
              </div>
            )}
            
            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            {/* Detailed Analytics Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-6">
                <BarChart className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-display font-semibold tracking-tight-plus text-gray-900">Detailed Analytics</h2>
              </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <MileageChart trips={trips} onDataPointClick={handleDataPointClick} />
          </div>
          
          <div
            onClick={() => navigate("/vehicles")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/vehicles")}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 hover:shadow-md transition-all bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <VehicleStatsList vehicles={vehicles} onSelectVehicle={handleSelectVehicle} />
          </div>
        </div>

        <hr className="my-6 border-gray-200 dark:border-gray-700" />

        {/* Tip Section */}
        {hasEnoughData && (
          <div className="max-w-4xl">
            <h2 className="text-xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100 mb-3 flex items-center border-l-2 border-blue-500 pl-2">
              <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
              Quick Tip
            </h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
              <DashboardTip 
                title="Did you know?"
                content="You can track insurance, permit, and PUC expiry reminders for every vehicle."
                link={{
                  text: "Go to Vehicles → Edit → Enable Reminders",
                  url: "/vehicles"
                }}
              />
            </div>
                </div>
            )}
            </div>

            {/* Empty Dashboard State */}
            {!hasEnoughData && (
              <div className="mt-6">
                <EmptyState 
                  type="generic"
                  message="Start by adding vehicles and recording trips to unlock insights and analytics on your fleet performance."
                  showAction={true}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <RealTimeAnalytics />
        )}

        {activeTab === 'maintenance' && (
          <PredictiveMaintenance />
        )}
      </div>
      )}
      
      {/* FleetIQ Scanner - Always visible */}
      <FleetIQScanner />
    </Layout>
  );
};

export default DashboardPage;