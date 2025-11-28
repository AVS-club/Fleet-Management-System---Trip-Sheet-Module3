import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Fuel,
  MapPin,
  Users,
  Truck
} from 'lucide-react';
import { Trip, Vehicle, Driver } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { getTrips, getVehicles } from '../../utils/storage';
import { getDrivers } from '../../utils/api/drivers';
import { supabase } from '../../utils/supabaseClient';

interface RealTimeMetrics {
  activeTrips: number;
  vehiclesInUse: number;
  driversOnDuty: number;
  totalDistanceToday: number;
  fuelConsumedToday: number;
  averageMileage: number;
  alertsCount: number;
  maintenanceDue: number;
}

interface TrendData {
  period: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'stable';
}

interface PredictiveInsight {
  type: 'maintenance' | 'fuel' | 'route' | 'driver' | 'vehicle';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  timeframe: string;
}

interface DuplicateRouteSummary {
  route: string;
  count: number;
}

const RealTimeAnalytics: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper functions - moved before their usage to avoid hoisting issues
  const getTimeframeMs = (timeframe: string): number => {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  };

  const getTimeframePeriods = (timeframe: string) => {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return [
          { label: 'Now', offset: 0, duration: 10 * 60 * 1000 },
          { label: '10m ago', offset: 10 * 60 * 1000, duration: 10 * 60 * 1000 },
          { label: '20m ago', offset: 20 * 60 * 1000, duration: 10 * 60 * 1000 },
          { label: '30m ago', offset: 30 * 60 * 1000, duration: 10 * 60 * 1000 },
          { label: '40m ago', offset: 40 * 60 * 1000, duration: 10 * 60 * 1000 },
          { label: '50m ago', offset: 50 * 60 * 1000, duration: 10 * 60 * 1000 }
        ];
      case '6h':
        return [
          { label: 'Now', offset: 0, duration: 60 * 60 * 1000 },
          { label: '1h ago', offset: 60 * 60 * 1000, duration: 60 * 60 * 1000 },
          { label: '2h ago', offset: 2 * 60 * 60 * 1000, duration: 60 * 60 * 1000 },
          { label: '3h ago', offset: 3 * 60 * 60 * 1000, duration: 60 * 60 * 1000 },
          { label: '4h ago', offset: 4 * 60 * 60 * 1000, duration: 60 * 60 * 1000 },
          { label: '5h ago', offset: 5 * 60 * 60 * 1000, duration: 60 * 60 * 1000 }
        ];
      default:
        return [];
    }
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data with React Query - only when authenticated
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: isAuthenticated, // Only run when authenticated
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    refetchInterval: 60000, // Refetch every minute
    enabled: isAuthenticated, // Only run when authenticated
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
    refetchInterval: 60000, // Refetch every minute
    enabled: isAuthenticated, // Only run when authenticated
  });

  const loading = tripsLoading || vehiclesLoading || driversLoading;

  // Calculate real-time metrics
  const realTimeMetrics = useMemo((): RealTimeMetrics => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timeframeStart = new Date(now.getTime() - getTimeframeMs(selectedTimeframe));

    // Active trips (currently in progress)
    const activeTrips = trips.filter(trip => {
      const startDate = new Date(trip.trip_start_date);
      const endDate = new Date(trip.trip_end_date);
      return startDate <= now && endDate >= now;
    }).length;

    // Vehicles in use
    const vehiclesInUse = new Set(
      trips
        .filter(trip => {
          const startDate = new Date(trip.trip_start_date);
          const endDate = new Date(trip.trip_end_date);
          return startDate <= now && endDate >= now;
        })
        .map(trip => trip.vehicle_id)
    ).size;

    // Drivers on duty
    const driversOnDuty = new Set(
      trips
        .filter(trip => {
          const startDate = new Date(trip.trip_start_date);
          const endDate = new Date(trip.trip_end_date);
          return startDate <= now && endDate >= now;
        })
        .map(trip => trip.driver_id)
    ).size;

    // Today's metrics
    const todayTrips = trips.filter(trip => {
      const tripDate = new Date(trip.trip_start_date);
      return tripDate >= today;
    });

    const totalDistanceToday = todayTrips.reduce((sum, trip) => 
      sum + (trip.end_km - trip.start_km), 0
    );

    const fuelConsumedToday = todayTrips.reduce((sum, trip) => 
      sum + (trip.fuel_quantity || 0), 0
    );

    const tripsWithMileage = todayTrips.filter(trip => trip.calculated_kmpl && trip.calculated_kmpl > 0);
    const averageMileage = tripsWithMileage.length > 0
      ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length
      : 0;

    // Alerts and maintenance (simplified)
    const alertsCount = 0; // Would be calculated from actual alerts
    const maintenanceDue = vehicles.filter(v => v.status === 'maintenance').length;

    return {
      activeTrips,
      vehiclesInUse,
      driversOnDuty,
      totalDistanceToday,
      fuelConsumedToday,
      averageMileage,
      alertsCount,
      maintenanceDue
    };
  }, [trips, vehicles, selectedTimeframe]);

  // Calculate trends
  const trends = useMemo((): TrendData[] => {
    const now = new Date();
    const periods = getTimeframePeriods(selectedTimeframe);
    
    return periods.map(period => {
      const periodStart = new Date(now.getTime() - period.offset);
      const periodEnd = new Date(now.getTime() - (period.offset - period.duration));
      
      const periodTrips = trips.filter(trip => {
        const tripDate = new Date(trip.trip_start_date);
        return tripDate >= periodStart && tripDate < periodEnd;
      });

      const distance = periodTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
      
      return {
        period: period.label,
        value: distance,
        change: 0, // Would calculate actual change
        changeType: 'stable' as const
      };
    });
  }, [trips, selectedTimeframe]);

  // Generate predictive insights
  const predictiveInsights = useMemo((): PredictiveInsight[] => {
    const insights: PredictiveInsight[] = [];

    // Maintenance insights
    const vehiclesNeedingMaintenance = vehicles.filter(v => {
      // Simplified logic - would use actual maintenance data
      return v.current_odometer > 100000;
    });

    if (vehiclesNeedingMaintenance.length > 0) {
      insights.push({
        type: 'maintenance',
        title: 'Maintenance Due Soon',
        description: `${vehiclesNeedingMaintenance.length} vehicles approaching maintenance intervals`,
        confidence: 85,
        impact: 'medium',
        recommendation: 'Schedule preventive maintenance to avoid breakdowns',
        timeframe: 'Next 2 weeks'
      });
    }

    // Fuel efficiency insights
    const lowEfficiencyTrips = trips.filter(trip => 
      trip.calculated_kmpl && trip.calculated_kmpl < 3.0
    );

    if (lowEfficiencyTrips.length > 5) {
      insights.push({
        type: 'fuel',
        title: 'Fuel Efficiency Alert',
        description: 'Multiple trips showing below-average fuel efficiency',
        confidence: 75,
        impact: 'high',
        recommendation: 'Review driving patterns and vehicle maintenance',
        timeframe: 'Immediate attention'
      });
    }

    // Route optimization insights
    const duplicateRoutes = findDuplicateRoutes(trips);
    if (duplicateRoutes.length > 0) {
      insights.push({
        type: 'route',
        title: 'Route Optimization Opportunity',
        description: 'Multiple vehicles traveling similar routes',
        confidence: 90,
        impact: 'medium',
        recommendation: 'Consider route consolidation to reduce costs',
        timeframe: 'Next planning cycle'
      });
    }

    return insights;
  }, [trips, vehicles]);

  function findDuplicateRoutes(trips: Trip[]): DuplicateRouteSummary[] {
    const routeMap = new Map<string, DuplicateRouteSummary>();
    trips.forEach(trip => {
      const key = `${trip.destination}-${trip.warehouse_id}`;
      const existing = routeMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        routeMap.set(key, { route: key, count: 1 });
      }
    });
    return Array.from(routeMap.values()).filter(route => route.count > 1);
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Truck className="h-5 w-5" />;
      case 'fuel': return <Fuel className="h-5 w-5" />;
      case 'route': return <MapPin className="h-5 w-5" />;
      case 'driver': return <Users className="h-5 w-5" />;
      case 'vehicle': return <Truck className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Real-Time Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Live fleet monitoring and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {currentTime.toLocaleTimeString()}
          </div>
          <div className="flex space-x-2">
            {(['1h', '6h', '24h', '7d'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Trips</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {realTimeMetrics.activeTrips}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Currently in progress
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vehicles in Use</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {realTimeMetrics.vehiclesInUse}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Truck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {((realTimeMetrics.vehiclesInUse / vehicles.length) * 100).toFixed(1)}% utilization
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Drivers on Duty</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {realTimeMetrics.driversOnDuty}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Active drivers
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Distance Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {realTimeMetrics.totalDistanceToday.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Kilometers traveled
          </p>
        </div>
      </div>

      {/* Predictive Insights */}
      {predictiveInsights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Predictive Insights
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered recommendations based on current data patterns
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {predictiveInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(insight.impact)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm mt-1 opacity-90">{insight.description}</p>
                      <p className="text-sm mt-2 font-medium">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                      <p className="text-xs mt-1 opacity-75">
                        Timeframe: {insight.timeframe}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-xs font-medium">
                      {insight.confidence}% confidence
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                      {insight.impact} impact
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Activity Trends ({selectedTimeframe})
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Trend visualization would be implemented here</p>
            <p className="text-sm">Using a charting library like Recharts or Chart.js</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalytics;
