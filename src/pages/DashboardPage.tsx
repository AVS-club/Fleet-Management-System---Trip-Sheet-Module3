import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import DashboardHeader from '../components/layout/DashboardHeader';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import LoadingScreen from '../components/LoadingScreen';
import { getTrips, getVehicles, getVehicle, getVehicleStats } from '../utils/storage';
import { getDrivers, getDriver } from '../utils/api/drivers';
import { format } from 'date-fns';
import { Trip, Vehicle, Driver } from '@/types';
import { supabase } from '../utils/supabaseClient';
import { getUserActiveOrganization } from '../utils/supaHelpers';
import StatCard from '../components/ui/StatCard';
import EnhancedMileageChart from '../components/dashboard/EnhancedMileageChart';
import VehicleStatsList from '../components/dashboard/VehicleStatsList';
import RecentTripsTable from '../components/dashboard/RecentTripsTable';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import DashboardTip from '../components/dashboard/DashboardTip';
import EmptyState from '../components/dashboard/EmptyState';
import { BarChart, BarChart2, Calculator, Truck, Users, TrendingUp, CalendarRange, Fuel, AlertTriangle, IndianRupee, Bell, Lightbulb } from 'lucide-react';
import { getMileageInsights } from '../utils/mileageCalculator';
import { useQuery } from '@tanstack/react-query';
import { NumberFormatter } from '@/utils/numberFormatter';
import FleetIQScanner from '../components/FleetIQScanner';
import { createLogger } from '../utils/logger';

const logger = createLogger('DashboardPage');

// Comparison mode types
type ComparisonMode =
  | 'this-week'
  | 'last-7-days'
  | 'last-14-days'
  | 'last-30-days'
  | 'this-month'
  | 'full-month'
  | 'same-period'
  | 'this-quarter'
  | 'year-over-year';

interface ComparisonModeOption {
  value: ComparisonMode;
  label: string;
  shortLabel: string;
  group: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

const DashboardPage: React.FC = () => {
  // ALL HOOKS FIRST - NO CONDITIONAL LOGIC YET
  const navigate = useNavigate();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('this-month');

  const comparisonModeOptions: ComparisonModeOption[] = [
    // Weekly comparisons
    { value: 'this-week', label: 'This Week vs Last Week', shortLabel: 'vs last week', group: 'weekly' },
    { value: 'last-7-days', label: 'Last 7 Days vs Previous 7', shortLabel: 'vs prev 7 days', group: 'weekly' },
    { value: 'last-14-days', label: 'Last 14 Days vs Previous 14', shortLabel: 'vs prev 14 days', group: 'weekly' },

    // Monthly comparisons
    { value: 'this-month', label: 'This Month vs Same Period Last Month', shortLabel: 'vs last month', group: 'monthly' },
    { value: 'full-month', label: 'This Month vs Full Last Month', shortLabel: 'vs last month (full)', group: 'monthly' },
    { value: 'last-30-days', label: 'Last 30 Days vs Previous 30', shortLabel: 'vs prev 30 days', group: 'monthly' },
    { value: 'same-period', label: 'Same Days Last Month', shortLabel: 'vs same days', group: 'monthly' },

    // Quarterly & Yearly
    { value: 'this-quarter', label: 'This Quarter vs Last Quarter', shortLabel: 'vs last quarter', group: 'quarterly' },
    { value: 'year-over-year', label: 'This Month vs Same Month Last Year', shortLabel: 'vs last year', group: 'yearly' },
  ];

  // Use React Query for better caching and performance
  const { data: trips = [], isLoading: tripsLoading, error: tripsError } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    enabled: !permissionsLoading && permissions?.canAccessDashboard === true,
  });

  // Get total trip count separately (no row limit)
  const { data: totalTripsCount = 0, isLoading: totalTripsCountLoading } = useQuery({
    queryKey: ['totalTripsCount'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const organizationId = await getUserActiveOrganization(user.id);
      if (!organizationId) return 0;

      const { count } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
    enabled: !permissionsLoading && permissions?.canAccessDashboard === true,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
    enabled: !permissionsLoading && permissions?.canAccessDashboard === true,
  });

  const { data: drivers = [], isLoading: driversLoading, error: driversError } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
  });

  const loading = permissionsLoading || tripsLoading || vehiclesLoading || driversLoading || totalTripsCountLoading;

  // Helper function to get start of week (Monday)
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  };

  // Helper function to get start of quarter
  const getStartOfQuarter = (date: Date): Date => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
  };

  // Helper function to calculate date ranges based on comparison mode
  const getDateRanges = (mode: ComparisonMode) => {
    const now = new Date();

    switch (mode) {
      case 'this-week': {
        // Current: This week (Monday to now)
        // Previous: Last week (Monday to Sunday)
        const currentWeekStart = getStartOfWeek(now);
        const currentWeekEnd = now;

        const prevWeekEnd = new Date(currentWeekStart.getTime() - 1);
        const prevWeekStart = getStartOfWeek(prevWeekEnd);

        return {
          currentStart: currentWeekStart,
          currentEnd: currentWeekEnd,
          prevStart: prevWeekStart,
          prevEnd: prevWeekEnd,
        };
      }

      case 'last-7-days': {
        // Current: Last 7 days
        // Previous: 7 days before that
        const currentEnd = now;
        const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevEnd = new Date(currentStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        return {
          currentStart,
          currentEnd,
          prevStart,
          prevEnd,
        };
      }

      case 'last-14-days': {
        // Current: Last 14 days
        // Previous: 14 days before that
        const currentEnd = now;
        const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const prevEnd = new Date(currentStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

        return {
          currentStart,
          currentEnd,
          prevStart,
          prevEnd,
        };
      }

      case 'last-30-days': {
        // Current: Last 30 days
        // Previous: 30 days before that
        const currentEnd = now;
        const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const prevEnd = new Date(currentStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

        return {
          currentStart,
          currentEnd,
          prevStart,
          prevEnd,
        };
      }

      case 'this-month': {
        // Current: Current month, days 1 to current day
        // Previous: Previous month, days 1 to same day number
        const currentDay = now.getDate();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = now;

        const prevMonth = now.getMonth() - 1;
        const prevYear = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const prevMonthActual = prevMonth < 0 ? 11 : prevMonth;

        const daysInPrevMonth = new Date(prevYear, prevMonthActual + 1, 0).getDate();
        const comparisonDay = Math.min(currentDay, daysInPrevMonth);

        const prevMonthStart = new Date(prevYear, prevMonthActual, 1);
        const prevMonthEnd = new Date(prevYear, prevMonthActual, comparisonDay, 23, 59, 59);

        return {
          currentStart: currentMonthStart,
          currentEnd: currentMonthEnd,
          prevStart: prevMonthStart,
          prevEnd: prevMonthEnd,
        };
      }

      case 'full-month': {
        // Current: Current month to date
        // Previous: Entire previous month
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = now;
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        return {
          currentStart: currentMonthStart,
          currentEnd: currentMonthEnd,
          prevStart: prevMonthStart,
          prevEnd: prevMonthEnd,
        };
      }

      case 'same-period': {
        // Current: Current month, days 1 to current day
        // Previous: Previous month, days 1 to same day number (same as this-month but kept for backward compatibility)
        return getDateRanges('this-month');
      }

      case 'this-quarter': {
        // Current: This quarter to date
        // Previous: Last quarter (full)
        const currentQuarterStart = getStartOfQuarter(now);
        const currentQuarterEnd = now;

        const prevQuarterEnd = new Date(currentQuarterStart.getTime() - 1);
        const prevQuarterStart = getStartOfQuarter(prevQuarterEnd);

        return {
          currentStart: currentQuarterStart,
          currentEnd: currentQuarterEnd,
          prevStart: prevQuarterStart,
          prevEnd: prevQuarterEnd,
        };
      }

      case 'year-over-year': {
        // Current: Current month to date
        // Previous: Same month last year (same period)
        const currentDay = now.getDate();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = now;

        const prevYear = now.getFullYear() - 1;
        const prevYearMonth = now.getMonth();
        const daysInPrevYearMonth = new Date(prevYear, prevYearMonth + 1, 0).getDate();
        const comparisonDay = Math.min(currentDay, daysInPrevYearMonth);

        const prevMonthStart = new Date(prevYear, prevYearMonth, 1);
        const prevMonthEnd = new Date(prevYear, prevYearMonth, comparisonDay, 23, 59, 59);

        return {
          currentStart: currentMonthStart,
          currentEnd: currentMonthEnd,
          prevStart: prevMonthStart,
          prevEnd: prevMonthEnd,
        };
      }

      default:
        return getDateRanges('this-month');
    }
  };

  // Calculate stats with error handling and performance optimization
  const stats = useMemo(() => {
    if (!Array.isArray(trips) || trips.length === 0) {
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalFuel: 0,
        avgMileage: 0,
        tripsThisMonth: 0,
        tripsLastMonth: 0,
        distanceThisMonth: 0,
        distanceLastMonth: 0,
        avgMileageThisMonth: 0,
        avgMileageLastMonth: 0,
        fuelThisMonth: 0,
        fuelLastMonth: 0,
        tripsChangePercent: 0,
        distanceChangePercent: 0,
        avgMileageChangePercent: 0,
        fuelChangePercent: 0,
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
      // Get date ranges based on selected comparison mode
      const dateRanges = getDateRanges(comparisonMode);

      let totalDistance = 0;
      let totalFuel = 0;
      let tripsWithKmpl = 0;
      let totalKmpl = 0;
      let tripsThisMonth = 0;
      let tripsLastMonth = 0;
      let distanceThisMonth = 0;
      let distanceLastMonth = 0;
      let fuelThisMonth = 0;
      let fuelLastMonth = 0;
      let mileageThisMonthTotal = 0;
      let mileageThisMonthCount = 0;
      let mileageLastMonthTotal = 0;
      let mileageLastMonthCount = 0;
      const tripDates: number[] = [];

      for (const trip of trips) {
        const distance = trip.end_km - trip.start_km;
        totalDistance += distance;

        const fuelQuantity = trip.fuel_quantity || 0;
        totalFuel += fuelQuantity;

        if (trip.calculated_kmpl && trip.calculated_kmpl > 0) {
          tripsWithKmpl++;
          totalKmpl += trip.calculated_kmpl;
        }

        const tripDate = new Date(trip.trip_start_date);
        const tripTime = tripDate.getTime();

        // Check if trip falls in current period
        if (tripTime >= dateRanges.currentStart.getTime() && tripTime <= dateRanges.currentEnd.getTime()) {
          tripsThisMonth++;
          distanceThisMonth += distance;
          fuelThisMonth += fuelQuantity;

          if (trip.calculated_kmpl && trip.calculated_kmpl > 0) {
            mileageThisMonthCount++;
            mileageThisMonthTotal += trip.calculated_kmpl;
          }
        }
        // Check if trip falls in previous period
        else if (tripTime >= dateRanges.prevStart.getTime() && tripTime <= dateRanges.prevEnd.getTime()) {
          tripsLastMonth++;
          distanceLastMonth += distance;
          fuelLastMonth += fuelQuantity;

          if (trip.calculated_kmpl && trip.calculated_kmpl > 0) {
            mileageLastMonthCount++;
            mileageLastMonthTotal += trip.calculated_kmpl;
          }
        }

        tripDates.push(tripTime);
      }

      const avgMileage = tripsWithKmpl > 0 ? totalKmpl / tripsWithKmpl : 0;
      const avgMileageThisMonth = mileageThisMonthCount > 0 ? mileageThisMonthTotal / mileageThisMonthCount : 0;
      const avgMileageLastMonth = mileageLastMonthCount > 0 ? mileageLastMonthTotal / mileageLastMonthCount : 0;

      const calculateChangePercent = (currentValue: number, previousValue: number) => {
        if (previousValue === 0) {
          return 0;
        }
        return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      };

      const mileageInsights = getMileageInsights(trips);
      const earliestTripDate = tripDates.length > 0 ? new Date(Math.min(...tripDates)) : undefined;
      const latestTripDate = tripDates.length > 0 ? new Date(Math.max(...tripDates)) : undefined;

      return {
        totalTrips: totalTripsCount,
        totalDistance,
        totalFuel,
        avgMileage,
        tripsThisMonth,
        tripsLastMonth,
        distanceThisMonth,
        distanceLastMonth,
        avgMileageThisMonth,
        avgMileageLastMonth,
        fuelThisMonth,
        fuelLastMonth,
        tripsChangePercent: calculateChangePercent(tripsThisMonth, tripsLastMonth),
        distanceChangePercent: calculateChangePercent(distanceThisMonth, distanceLastMonth),
        avgMileageChangePercent: calculateChangePercent(avgMileageThisMonth, avgMileageLastMonth),
        fuelChangePercent: calculateChangePercent(fuelThisMonth, fuelLastMonth),
        lastTripDate: latestTripDate,
        bestVehicle: null,
        bestVehicleMileage: mileageInsights.bestVehicleMileage,
        bestDriver: null,
        bestDriverMileage: mileageInsights.bestDriverMileage,
        estimatedFuelSaved: mileageInsights.estimatedFuelSaved,
        earliestTripDate,
        latestTripDate
      };
    } catch (error) {
      logger.error('Error calculating dashboard stats:', error);
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalFuel: 0,
        avgMileage: 0,
        tripsThisMonth: 0,
        tripsLastMonth: 0,
        distanceThisMonth: 0,
        distanceLastMonth: 0,
        avgMileageThisMonth: 0,
        avgMileageLastMonth: 0,
        fuelThisMonth: 0,
        fuelLastMonth: 0,
        tripsChangePercent: 0,
        distanceChangePercent: 0,
        avgMileageChangePercent: 0,
        fuelChangePercent: 0,
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
  }, [trips, comparisonMode]);

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

  // Early return for loading state
  if (permissionsLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  // Early redirect for data entry users before any data processing
  // This prevents flash of unauthorized content
  if (permissions && !permissions.canAccessDashboard) {
    return <Navigate to="/vehicles" replace />;
  }
  
  // If permissions are loaded but null, something went wrong
  if (!permissionsLoading && !permissions) {
    return <Navigate to="/login" replace />;
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

  // Helper to format date for tooltip
  const formatDateForTooltip = (date: Date): string => {
    return format(date, 'MMM d, yyyy');
  };

  // Helper to build date range tooltip text
  const getDateRangeTooltip = (): string => {
    const ranges = getDateRanges(comparisonMode);

    const currentPeriod = `Current: ${formatDateForTooltip(ranges.currentStart)} - ${formatDateForTooltip(ranges.currentEnd)}`;
    const previousPeriod = `Previous: ${formatDateForTooltip(ranges.prevStart)} - ${formatDateForTooltip(ranges.prevEnd)}`;

    return `${currentPeriod}\n${previousPeriod}`;
  };

  const buildTrend = (percent?: number | null) => {
    if (percent === null || percent === undefined || Number.isNaN(percent)) {
      return undefined;
    }

    const currentMode = comparisonModeOptions.find(m => m.value === comparisonMode);
    const label = currentMode?.shortLabel || 'vs last month';

    return {
      value: Number(percent.toFixed(1)),
      label: label,
      isPositive: percent >= 0,
      dateRangeTooltip: getDateRangeTooltip(),
    };
  };
  
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

        {/* Dashboard Content */}
        {/* Key Metrics Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <BarChart2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-display font-semibold tracking-tight-plus text-gray-900">{t('dashboard.keyMetrics')}</h2>
            </div>
            {/* Comparison Mode Selector - Compact & Mobile-Friendly */}
            <div className="flex items-center space-x-2">
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
                className="text-xs sm:text-sm font-sans border border-gray-300 dark:border-gray-600 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors cursor-pointer"
                title="Select comparison period"
              >
                <optgroup label="Weekly">
                  {comparisonModeOptions.filter(opt => opt.group === 'weekly').map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Monthly">
                  {comparisonModeOptions.filter(opt => opt.group === 'monthly').map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Quarterly">
                  {comparisonModeOptions.filter(opt => opt.group === 'quarterly').map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Yearly">
                  {comparisonModeOptions.filter(opt => opt.group === 'yearly').map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div key={comparisonMode} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => navigate("/trips")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/trips")}
              className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 hover:shadow-md transition-all"
            >
              <StatCard
                title={t('dashboard.totalTripsLabel')}
                value={stats.totalTrips}
                icon={<BarChart className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
                trend={buildTrend(stats.tripsChangePercent)}
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
                trend={buildTrend(stats.distanceChangePercent)}
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
                    trend={buildTrend(stats.avgMileageChangePercent)}
                    icon={<Calculator className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
                  />
                </div>

                <div>
                  <StatCard
                    title={t('dashboard.totalFuelUsed')}
                    value={NumberFormatter.large(stats.totalFuel)}
                    subtitle="L"
                    trend={buildTrend(stats.fuelChangePercent)}
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

        <hr className="my-4 sm:my-6 border-gray-200 dark:border-gray-700" />

        {/* Detailed Analytics Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-6">
          <div className="flex items-center space-x-2 mb-4 sm:mb-6">
            <BarChart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-display font-semibold tracking-tight-plus text-gray-900">Detailed Analytics</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 xl:gap-6">
            {/* Left column - Stats */}
            <div className="xl:col-span-1 order-2 xl:order-1">
              <div
                onClick={() => navigate("/vehicles")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/vehicles")}
                className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 hover:shadow-md transition-all bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <VehicleStatsList vehicles={vehicles} trips={trips} onSelectVehicle={handleSelectVehicle} />
              </div>
            </div>
            
            {/* Right column - Enhanced Chart (now takes full width) */}
            <div className="xl:col-span-2 order-1 xl:order-2">
              <EnhancedMileageChart 
                trips={trips}
                vehicles={vehicles}
              />
            </div>
          </div>
        </div>

        <hr className="my-4 sm:my-6 border-gray-200 dark:border-gray-700" />

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
                  text: "Go to Vehicles -> Edit -> Enable Reminders",
                  url: "/vehicles"
                }}
              />
            </div>
          </div>
        )}

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
      </div>
      )}
      
      {/* FleetIQ Scanner - Always visible */}
      <FleetIQScanner />
    </Layout>
  );
};

export default DashboardPage;
