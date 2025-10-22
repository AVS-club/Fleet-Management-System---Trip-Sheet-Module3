import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Filter, Calendar, TrendingUp, AlertTriangle, Download, ChevronDown, ExternalLink, Search, X, Check } from 'lucide-react';
import { Trip, Vehicle } from '@/types';
import { format, subDays, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EnhancedMileageChart');

interface EnhancedMileageChartProps {
  trips: Trip[];
  vehicles: Vehicle[];
}

interface Anomaly {
  trip_id: string;
  trip_serial_number: string;
  vehicle_registration: string;
  date: string;
  mileage: number;
  distance: number;
  fuel: number;
  issues: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium';
    message: string;
  }>;
}

// Client-side anomaly detection - only flag LOW mileage issues (real vehicle problems)
const detectClientSideAnomalies = (trips: Trip[], vehicles: Vehicle[]) => {
  const anomalies: any[] = [];
  
  // Filter valid trips (mileage > 0 and <= 30)
  const validTrips = trips.filter(t => t.calculated_kmpl && t.calculated_kmpl > 0 && t.calculated_kmpl <= 30);
  
  if (validTrips.length === 0) return anomalies;
  
  // Calculate average mileage from valid trips
  const avgMileage = validTrips.reduce((sum, t) => sum + (t.calculated_kmpl || 0), 0) / validTrips.length;
  
  trips.forEach(trip => {
    const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
    if (!vehicle || !trip.calculated_kmpl) return;
    
    const distance = trip.end_km - trip.start_km;
    const fuel = trip.fuel_quantity || 0;
    const kmpl = trip.calculated_kmpl;
    
    // Only detect LOW mileage anomalies (real vehicle problems)
    // Don't flag high mileage - those are data entry errors, not vehicle issues
    if (kmpl < avgMileage * 0.6 && kmpl > 0 && kmpl <= 30 && fuel > 0) {
      anomalies.push({
        anomaly_type: 'poor_efficiency',
        severity: kmpl < 5 ? 'critical' : kmpl < 8 ? 'high' : 'medium',
        trip_ids: [trip.id],
        trip_serials: [trip.trip_serial_number || 'N/A'],
        anomaly_details: {
          vehicle_registration: vehicle.registration_number,
          mileage: kmpl,
          distance: distance,
          fuel: fuel,
          average_mileage: avgMileage
        }
      });
    }
    
    // Flag data quality issues (negative distance, impossible values)
    if (distance < 0 || kmpl < 0) {
      anomalies.push({
        anomaly_type: 'negative_distance',
        severity: 'high',
        trip_ids: [trip.id],
        trip_serials: [trip.trip_serial_number || 'N/A'],
        anomaly_details: {
          vehicle_registration: vehicle.registration_number,
          mileage: kmpl,
          distance: distance,
          fuel: fuel
        }
      });
    }
  });
  
  return anomalies;
};

const EnhancedMileageChart: React.FC<EnhancedMileageChartProps> = ({ trips, vehicles }) => {
  const navigate = useNavigate();
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(['all']);
  const [dateRange, setDateRange] = useState<string>('30days');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showAverageDropdown, setShowAverageDropdown] = useState(false);
  const [averageType, setAverageType] = useState<'overall' | 'perVehicle' | 'rolling7'>('overall');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');

  // Get unique vehicles from the vehicles prop
  const vehicleOptions = useMemo(() => {
    return ['all', ...vehicles.map(v => v.registration_number)];
  }, [vehicles]);

  // Filter vehicles based on search term
  const filteredVehicleOptions = useMemo(() => {
    if (!vehicleSearchTerm) return vehicleOptions;
    return vehicleOptions.filter(vehicle => 
      vehicle.toLowerCase().includes(vehicleSearchTerm.toLowerCase())
    );
  }, [vehicleOptions, vehicleSearchTerm]);

  // Helper functions for vehicle selection
  const selectAllVehicles = () => {
    setSelectedVehicles(['all']);
  };

  const clearAllVehicles = () => {
    setSelectedVehicles([]);
  };

  const toggleVehicle = (vehicle: string) => {
    if (vehicle === 'all') {
      setSelectedVehicles(['all']);
    } else {
      setSelectedVehicles(prev => {
        if (prev.includes('all')) {
          return [vehicle];
        } else if (prev.includes(vehicle)) {
          const newSelection = prev.filter(v => v !== vehicle);
          return newSelection.length === 0 ? ['all'] : newSelection;
        } else {
          return [...prev, vehicle];
        }
      });
    }
  };

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = now;

    switch (dateRange) {
      case '7days':
        start = subDays(now, 7);
        break;
      case '14days':
        start = subDays(now, 14);
        break;
      case '30days':
        start = subDays(now, 30);
        break;
      case '60days':
        start = subDays(now, 60);
        break;
      case '90days':
        start = subDays(now, 90);
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          start = startOfDay(parseISO(customDateStart));
          end = endOfDay(parseISO(customDateEnd));
        }
        break;
    }

    return { startDate: start, endDate: end };
  }, [dateRange, customDateStart, customDateEnd]);

  // Filter trips based on selections
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Filter by vehicle
      if (!selectedVehicles.includes('all')) {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        if (!vehicle || !selectedVehicles.includes(vehicle.registration_number)) {
          return false;
        }
      }

      // Filter by date
      const tripDate = parseISO(trip.trip_end_date);
      if (isBefore(tripDate, startDate) || isAfter(tripDate, endDate)) {
        return false;
      }

      // Only include trips with calculated mileage
      return trip.calculated_kmpl !== undefined && trip.calculated_kmpl !== null;
    });
  }, [trips, vehicles, selectedVehicles, startDate, endDate]);

  // Fetch anomalies from database with more sensitive criteria
  const { data: anomaliesData } = useQuery({
    queryKey: ['mileage-anomalies', selectedVehicles, startDate, endDate],
    queryFn: async () => {
      const vehicleId = selectedVehicles.includes('all') 
        ? null 
        : vehicles.find(v => selectedVehicles.includes(v.registration_number))?.id;

      // First try the database function
      const { data: dbAnomalies, error: dbError } = await supabase.rpc('analyze_value_anomalies', {
        p_vehicle_id: vehicleId,
        p_date_from: format(startDate, 'yyyy-MM-dd'),
        p_date_to: format(endDate, 'yyyy-MM-dd'),
        p_include_edge_cases: true
      });

      if (dbError) {
        logger.error('Error fetching anomalies from DB:', dbError);
      }

      // Also run client-side enhanced anomaly detection for more sensitive criteria
      const clientAnomalies = detectClientSideAnomalies(filteredTrips, vehicles);
      
      // Combine and deduplicate anomalies
      const allAnomalies = [...(dbAnomalies || []), ...clientAnomalies];
      return allAnomalies;
    },
    enabled: trips.length > 0 && filteredTrips.length > 0
  });

  // Helper function to get anomaly message - only low mileage issues
  const getAnomalyMessage = useCallback((type: string): string => {
    const messages: Record<string, string> = {
      'poor_efficiency': 'Low fuel efficiency - check vehicle condition',
      'negative_distance': 'Invalid odometer readings',
      'impossible_speed': 'Unrealistic speed detected'
    };
    return messages[type] || 'Vehicle performance issue detected';
  }, []);

  // Process anomalies from database response and group by vehicle - only mileage related
  const anomalies = useMemo(() => {
    if (!anomaliesData) return [];

    const processed: Anomaly[] = [];

    anomaliesData.forEach((anomalyGroup: any) => {
      const { anomaly_type, severity, trip_ids, trip_serials, anomaly_details } = anomalyGroup;

      // Only process low mileage anomalies (real vehicle problems)
      const lowMileageTypes = [
        'poor_efficiency', 
        'negative_distance',
        'impossible_speed'
      ];

      if (!lowMileageTypes.includes(anomaly_type)) {
        return; // Skip high mileage anomalies (data entry errors)
      }

      // Map each trip in this anomaly group
      trip_ids?.forEach((tripId: string, index: number) => {
        const trip = filteredTrips.find(t => t.id === tripId);
        if (!trip) return;

        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        
        processed.push({
          trip_id: tripId,
          trip_serial_number: trip_serials?.[index] || trip.trip_serial_number || 'N/A',
          vehicle_registration: vehicle?.registration_number || 'Unknown',
          date: format(parseISO(trip.trip_end_date), 'dd MMM yyyy'),
          mileage: trip.calculated_kmpl || 0,
          distance: trip.end_km - trip.start_km,
          fuel: trip.fuel_quantity || 0,
          issues: [{
            type: anomaly_type,
            severity: severity as 'critical' | 'high' | 'medium',
            message: getAnomalyMessage(anomaly_type)
          }]
        });
      });
    });

    // Group anomalies by vehicle registration
    const groupedByVehicle = processed.reduce((acc, anomaly) => {
      const vehicle = anomaly.vehicle_registration;
      if (!acc[vehicle]) {
        acc[vehicle] = [];
      }
      acc[vehicle].push(anomaly);
      return acc;
    }, {} as Record<string, Anomaly[]>);

    // Flatten back to array but sorted by vehicle
    return Object.keys(groupedByVehicle)
      .sort()
      .flatMap(vehicle => groupedByVehicle[vehicle]);
  }, [anomaliesData, filteredTrips, vehicles, getAnomalyMessage]);

  // Calculate average mileage
  const averageMileage = useMemo(() => {
    if (filteredTrips.length === 0) return 0;

    if (averageType === 'overall') {
      const sum = filteredTrips.reduce((acc, trip) => acc + (trip.calculated_kmpl || 0), 0);
      return (sum / filteredTrips.length).toFixed(2);
    } else if (averageType === 'perVehicle') {
      const vehicleAverages: Record<string, { sum: number; count: number }> = {};
      
      filteredTrips.forEach(trip => {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        if (!vehicle) return;
        
        const key = vehicle.registration_number;
        if (!vehicleAverages[key]) {
          vehicleAverages[key] = { sum: 0, count: 0 };
        }
        vehicleAverages[key].sum += trip.calculated_kmpl || 0;
        vehicleAverages[key].count += 1;
      });
      
      return vehicleAverages;
    } else if (averageType === 'rolling7') {
      const last7Days = filteredTrips.slice(-7);
      if (last7Days.length === 0) return '0.00';
      const sum = last7Days.reduce((acc, trip) => acc + (trip.calculated_kmpl || 0), 0);
      return (sum / last7Days.length).toFixed(2);
    }

    return 0;
  }, [filteredTrips, averageType, vehicles]);

  // Prepare chart data with anomaly indicators
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, any>>();

    filteredTrips.forEach(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      if (!vehicle) return;

      const dateKey = format(parseISO(trip.trip_end_date), 'dd/MM');
      const vehicleKey = vehicle.registration_number;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey });
      }

      const dateEntry = dateMap.get(dateKey)!;
      
      // Check if this trip has anomalies
      const tripAnomalies = anomalies.filter(a => a.trip_id === trip.id);
      const hasAnomaly = tripAnomalies.length > 0;
      const anomalySeverity = hasAnomaly ? tripAnomalies[0].issues[0]?.severity : null;
      
      // Calculate average if multiple trips on same day
      const actualMileage = trip.calculated_kmpl || 0;
      const displayMileage = Math.min(actualMileage, 30); // Cap at 30 for display
      
      if (dateEntry[vehicleKey]) {
        dateEntry[vehicleKey] = (dateEntry[vehicleKey] + displayMileage) / 2;
      } else {
        dateEntry[vehicleKey] = displayMileage;
      }
      
      // Store actual mileage for tooltip
      dateEntry[`${vehicleKey}_actual`] = actualMileage;
      dateEntry[`${vehicleKey}_hasError`] = actualMileage > 30;
      
      // Add anomaly metadata
      dateEntry[`${vehicleKey}_anomaly`] = hasAnomaly;
      dateEntry[`${vehicleKey}_severity`] = anomalySeverity;
      dateEntry[`${vehicleKey}_tripId`] = trip.id;
    });

    return Array.from(dateMap.values())
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      });
  }, [filteredTrips, vehicles, anomalies]);

  // Check if any data exceeds 30 km/L
  const hasDataErrors = useMemo(() => {
    return filteredTrips.some(trip => (trip.calculated_kmpl || 0) > 30);
  }, [filteredTrips]);

  // Get unique vehicle registrations for chart lines
  const chartVehicles = useMemo(() => {
    const vehicleSet = new Set<string>();
    filteredTrips.forEach(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      if (vehicle) vehicleSet.add(vehicle.registration_number);
    });
    return Array.from(vehicleSet);
  }, [filteredTrips, vehicles]);


  const exportAnomalies = () => {
    const csv = [
      ['Trip ID', 'Vehicle', 'Date', 'Mileage (km/L)', 'Distance (km)', 'Fuel (L)', 'Issues', 'Severity'],
      ...anomalies.map(a => [
        a.trip_serial_number,
        a.vehicle_registration,
        a.date,
        a.mileage.toFixed(2),
        a.distance.toFixed(0),
        a.fuel.toFixed(1),
        a.issues.map(i => i.message).join('; '),
        a.issues[0]?.severity || 'medium'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mileage_anomalies_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAnomalyClick = (tripId: string) => {
    navigate(`/trips/${tripId}`);
  };

  // Custom dot component for anomaly indicators
  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    const hasAnomaly = payload[`${dataKey}_anomaly`];
    const severity = payload[`${dataKey}_severity`];
    const tripId = payload[`${dataKey}_tripId`];
    
    if (!hasAnomaly) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill={colors[chartVehicles.indexOf(dataKey) % colors.length]}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => tripId && navigate(`/trips`, { state: { highlightTripId: tripId } })}
        />
      );
    }
    
    // Anomaly indicator with different colors based on severity
    const anomalyColor = severity === 'critical' ? '#ef4444' : 
                        severity === 'high' ? '#f59e0b' : '#3b82f6';
    
    return (
      <g>
        {/* Outer ring for anomaly */}
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="none"
          stroke={anomalyColor}
          strokeWidth={3}
          style={{ cursor: 'pointer' }}
          onClick={() => tripId && navigate(`/trips`, { state: { highlightTripId: tripId } })}
        />
        {/* Inner dot */}
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill={anomalyColor}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => tripId && navigate(`/trips`, { state: { highlightTripId: tripId } })}
        />
        {/* Alert icon for critical anomalies */}
        {severity === 'critical' && (
          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            fontSize="10"
            fill={anomalyColor}
            fontWeight="bold"
            style={{ cursor: 'pointer' }}
            onClick={() => tripId && navigate(`/trips`, { state: { highlightTripId: tripId } })}
          >
            ⚠
          </text>
        )}
      </g>
    );
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-6 border border-gray-200 dark:border-gray-700">
      {/* Header with Filters */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mileage Trends
          </h2>

          {/* Average Display with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAverageDropdown(!showAverageDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {averageType === 'overall' ? 'Overall Average' :
                    averageType === 'perVehicle' ? 'Per Vehicle' :
                      'Rolling 7-Day'}
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {typeof averageMileage === 'object' ?
                    'View Details' :
                    `${averageMileage} km/L`
                  }
                </div>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showAverageDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setAverageType('overall');
                      setShowAverageDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                  >
                    Overall Average
                  </button>
                  <button
                    onClick={() => {
                      setAverageType('rolling7');
                      setShowAverageDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                  >
                    Rolling 7-Day Average
                  </button>
                  <button
                    onClick={() => {
                      setAverageType('perVehicle');
                      setShowAverageDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                  >
                    Per Vehicle Average
                  </button>
                </div>

                {typeof averageMileage === 'object' && (
                  <div className="border-t dark:border-gray-700 p-3">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Per Vehicle:</h4>
                    {Object.entries(averageMileage).map(([vehicle, data]) => (
                      <div key={vehicle} className="flex justify-between text-sm py-1">
                        <span className="text-gray-700 dark:text-gray-300">{vehicle}</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {(data.sum / data.count).toFixed(2)} km/L
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Enhanced Vehicle Selector */}
          <div className="relative flex-1 max-w-md">
            <button
              onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
              className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">🚗</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {selectedVehicles.includes('all')
                    ? `All Vehicles (${vehicles.length})`
                    : `${selectedVehicles.length} of ${vehicles.length} selected`}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showVehicleDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showVehicleDropdown && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vehicles..."
                      value={vehicleSearchTerm}
                      onChange={(e) => setVehicleSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={selectAllVehicles}
                    className="flex-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllVehicles}
                    className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                {/* Vehicle List */}
                <div className="overflow-y-auto max-h-64">
                  {filteredVehicleOptions.map(vehicle => (
                    <button
                      key={vehicle}
                      onClick={() => toggleVehicle(vehicle)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedVehicles.includes(vehicle)
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedVehicles.includes(vehicle) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {vehicle === 'all' ? 'All Vehicles' : vehicle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium">
                {dateRange === 'custom' ? 'Custom Range' :
                  dateRange.replace('days', ' Days')}
              </span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>

            {showDateDropdown && (
              <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 px-2">Quick Options</div>
                  {['7days', '14days', '30days', '60days', '90days'].map(option => (
                    <button
                      key={option}
                      onClick={() => {
                        setDateRange(option);
                        setShowDateDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                    >
                      Last {option.replace('days', ' Days')}
                    </button>
                  ))}

                  <div className="border-t dark:border-gray-700 mt-2 pt-2">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 px-2">Custom Range</div>
                    <div className="px-2 space-y-2">
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                        className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 rounded text-sm"
                        placeholder="Start Date"
                      />
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                        className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 rounded text-sm"
                        placeholder="End Date"
                      />
                      <button
                        onClick={() => {
                          if (customDateStart && customDateEnd) {
                            setDateRange('custom');
                            setShowDateDropdown(false);
                          }
                        }}
                        disabled={!customDateStart || !customDateEnd}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Chart */}
      <div className="mb-4 sm:mb-6" style={{ height: '500px' }}>
        {/* Data Error Warning */}
        {hasDataErrors && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Some entries exceed 30 km/L (verify data entry)
              </span>
            </div>
          </div>
        )}
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#d1d5db' }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: '#d1d5db' }}
                tick={{ fontSize: 10 }}
                domain={[0, 30]}  // Max 30 km/L
                ticks={[0, 5, 10, 15, 20, 25, 30]}
                label={{
                  value: 'Mileage (km/L)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fontWeight: 600 }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => `${value.toFixed(2)} km/L`}
              />
              {chartVehicles.map((vehicle, index) => (
                <Line
                  key={vehicle}
                  type="monotone"
                  dataKey={vehicle}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={<CustomDot />}
                  activeDot={{ r: 5 }}
                  name={vehicle}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data available for the selected period</p>
            </div>
          </div>
        )}
        
        {/* Compact Info Section */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Selected Vehicles: {selectedVehicles.includes('all') ? 'All' : selectedVehicles.length} of {vehicles.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Click chart points to view trip details • Hover for vehicle info
          </div>
        </div>
      </div>

      {/* Anomaly Legend */}
      {anomalies.length > 0 && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Vehicle Performance Issues:</h4>
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 border border-white"></div>
              <span className="text-gray-600 dark:text-gray-400">Critical: {'<'}5 km/L</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-orange-500 border border-white"></div>
              <span className="text-gray-600 dark:text-gray-400">High: {'<'}8 km/L</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500 border border-white"></div>
              <span className="text-gray-600 dark:text-gray-400">Medium: {'<'}60% of average</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-500 border border-white"></div>
              <span className="text-gray-600 dark:text-gray-400">Data Quality Issues</span>
            </div>
          </div>
        </div>
      )}

      {/* Anomalies Section - Grouped by Vehicle */}
      {anomalies.length > 0 && (
        <div className="border-t dark:border-gray-700 pt-4 sm:pt-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Mileage Anomalies ({anomalies.length})
              </h3>
            </div>
            <button
              onClick={exportAnomalies}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
            Click any entry to review trip data
          </div>

          <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
            {(() => {
              // Group anomalies by vehicle
              const groupedByVehicle = anomalies.reduce((acc, anomaly) => {
                const vehicle = anomaly.vehicle_registration;
                if (!acc[vehicle]) {
                  acc[vehicle] = [];
                }
                acc[vehicle].push(anomaly);
                return acc;
              }, {} as Record<string, Anomaly[]>);

              return Object.entries(groupedByVehicle).map(([vehicle, vehicleAnomalies]) => (
                <div key={vehicle} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 border-b dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {vehicle} ({vehicleAnomalies.length} anomalies)
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {vehicleAnomalies.map((anomaly, index) => (
                      <div
                        key={index}
                        className="p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b dark:border-gray-700 last:border-b-0"
                        onClick={() => handleAnomalyClick(anomaly.trip_id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {anomaly.trip_serial_number}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">{anomaly.date}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            </div>
                            <div className="text-xs sm:text-sm mb-1">
                              <span className="font-medium">Mileage:</span> {anomaly.mileage.toFixed(2)} km/L
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {anomaly.issues.map((issue, idx) => (
                                <span
                                  key={idx}
                                  className={`px-1.5 py-0.5 text-xs rounded-full ${issue.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      issue.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}
                                >
                                  {issue.message}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${anomaly.issues.some(i => i.severity === 'critical')
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : anomaly.issues.some(i => i.severity === 'high')
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                              {anomaly.issues.some(i => i.severity === 'critical') ? 'Critical' :
                                anomaly.issues.some(i => i.severity === 'high') ? 'High' : 'Medium'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {anomalies.length === 0 && filteredTrips.length > 0 && (
        <div className="border-t dark:border-gray-700 pt-6">
          <div className="text-center text-gray-500 dark:text-gray-400 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No vehicle performance issues detected</p>
            <p className="text-sm mt-1">Your fleet is performing well! ✓</p>
          </div>
          
          {/* Demo section to show how vehicle performance issues would appear */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              💡 Vehicle Performance Monitoring
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              The system detects only real vehicle performance issues:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 border border-white"></div>
                <span className="text-blue-700 dark:text-blue-300">Critical: {'<'}5 km/L</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-orange-500 border border-white"></div>
                <span className="text-blue-700 dark:text-blue-300">High: {'<'}8 km/L</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500 border border-white"></div>
                <span className="text-blue-700 dark:text-blue-300">Medium: {'<'}60% of average</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-500 border border-white"></div>
                <span className="text-blue-700 dark:text-blue-300">Data Quality Issues</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 sm:mt-3">
              High mileage values are capped at 30 km/L to prevent chart distortion.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMileageChart;

