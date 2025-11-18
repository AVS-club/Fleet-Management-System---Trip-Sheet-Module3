import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, Download, ChevronDown, ExternalLink, Search, Check } from 'lucide-react';
import { Trip, Vehicle } from '@/types';
import { format, subDays, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { createLogger } from '../../utils/logger';
import { getTags } from '../../utils/api/tags';

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

// Helper function to calculate median
const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Helper function to calculate standard deviation
const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
};


// Enhanced client-side anomaly detection with statistical methods
const detectClientSideAnomalies = (trips: Trip[], vehicles: Vehicle[], vehicleTagsMap?: Map<string, string[]>) => {
  const anomalies: any[] = [];
  
  // Filter valid trips (mileage > 0 and <= 35)
  const validTrips = trips.filter(t => t.calculated_kmpl && t.calculated_kmpl > 0 && t.calculated_kmpl <= 35);
  
  if (validTrips.length === 0) return anomalies;
  
  // Group trips by vehicle tags for statistical analysis
  const tripsByVehicleType = new Map<string, Trip[]>();
  const mileageByVehicleType = new Map<string, number[]>();
  
  validTrips.forEach(trip => {
    const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
    if (!vehicle) return;
    
    // Get vehicle tags - use first tag as primary grouping
    const tags = vehicleTagsMap?.get(vehicle.id) || [];
    const groupKey = tags.length > 0 ? tags[0] : 'untagged';
    
    if (!tripsByVehicleType.has(groupKey)) {
      tripsByVehicleType.set(groupKey, []);
      mileageByVehicleType.set(groupKey, []);
    }
    
    tripsByVehicleType.get(groupKey)!.push(trip);
    mileageByVehicleType.get(groupKey)!.push(trip.calculated_kmpl || 0);
  });
  
  // Calculate statistics for each vehicle type
  const statsByType = new Map<string, { median: number; mean: number; stdDev: number }>();
  
  mileageByVehicleType.forEach((mileages, vehicleType) => {
    const median = calculateMedian(mileages);
    const mean = mileages.reduce((sum, m) => sum + m, 0) / mileages.length;
    const stdDev = calculateStandardDeviation(mileages, mean);
    
    statsByType.set(vehicleType, { median, mean, stdDev });
  });
  
  // Also calculate overall statistics
  const allMileages = validTrips.map(t => t.calculated_kmpl || 0);
  const overallMedian = calculateMedian(allMileages);
  const overallMean = allMileages.reduce((sum, m) => sum + m, 0) / allMileages.length;
  const overallStdDev = calculateStandardDeviation(allMileages, overallMean);
  
  // Detect anomalies for each trip
  trips.forEach(trip => {
    const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
    if (!vehicle || !trip.calculated_kmpl) return;
    
    const distance = trip.end_km - trip.start_km;
    const fuel = trip.fuel_quantity || 0;
    const kmpl = trip.calculated_kmpl;
    
    // Get vehicle tags for grouping
    const tags = vehicleTagsMap?.get(vehicle.id) || [];
    const vehicleType = tags.length > 0 ? tags[0] : 'untagged';
    const stats = statsByType.get(vehicleType) || { median: overallMedian, mean: overallMean, stdDev: overallStdDev };
    
    // 1. Data entry errors (mileage > 35)
    if (kmpl > 35) {
      anomalies.push({
        anomaly_type: 'data_entry_error',
        severity: 'high',
        trip_ids: [trip.id],
        trip_serials: [trip.trip_serial_number || 'N/A'],
        anomaly_details: {
          vehicle_registration: vehicle.registration_number,
          mileage: kmpl,
          distance: distance,
          fuel: fuel,
          expected_range: `${stats.median.toFixed(1)} ± ${(2 * stats.stdDev).toFixed(1)} km/L`,
          deviation: `${((kmpl - stats.median) / stats.stdDev).toFixed(1)}σ`
        }
      });
    }
    // 2. Statistical outliers (beyond 2 standard deviations)
    else if (kmpl > 0 && Math.abs(kmpl - stats.median) > 2 * stats.stdDev) {
      const isHigh = kmpl > stats.median;
      anomalies.push({
        anomaly_type: 'statistical_outlier',
        severity: Math.abs(kmpl - stats.median) > 3 * stats.stdDev ? 'high' : 'medium',
        trip_ids: [trip.id],
        trip_serials: [trip.trip_serial_number || 'N/A'],
        anomaly_details: {
          vehicle_registration: vehicle.registration_number,
          mileage: kmpl,
          distance: distance,
          fuel: fuel,
          vehicle_type: vehicleType,
          median: stats.median,
          deviation: `${((kmpl - stats.median) / stats.stdDev).toFixed(1)}σ`,
          direction: isHigh ? 'above' : 'below'
        }
      });
    }
    // 3. Poor efficiency (below 60% of vehicle type median)
    else if (kmpl < stats.median * 0.6 && kmpl > 0 && fuel > 0) {
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
          vehicle_type: vehicleType,
          expected_median: stats.median,
          percentage_of_median: ((kmpl / stats.median) * 100).toFixed(0)
        }
      });
    }
    
    // 4. Data quality issues (negative distance, impossible values)
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>('30days');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showAverageDropdown, setShowAverageDropdown] = useState(false);
  const [averageType, setAverageType] = useState<'overall' | 'perVehicle' | 'rolling7'>('overall');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [showLegend, setShowLegend] = useState(true);

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      try {
        const data = await getTags();
        return data || [];
      } catch (error) {
        logger.error('Error fetching tags:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch vehicle-tag mappings
  const { data: vehicleTagsData } = useQuery({
    queryKey: ['vehicle-tags'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vehicle_tags')
          .select('vehicle_id, tag_id, tags(name, slug)');
        
        if (error) {
          logger.error('Error fetching vehicle tags:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        logger.error('Exception fetching vehicle tags:', err);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Create a map of vehicle ID to tag names (only mileage tags starting with "M ")
  const vehicleTagsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    
    vehicleTagsData?.forEach((vt: any) => {
      const vehicleId = vt.vehicle_id;
      const tagName = vt.tags?.name;
      
      if (!map.has(vehicleId)) {
        map.set(vehicleId, []);
      }
      
      // Only include tags that start with "M " for mileage grouping
      if (tagName && tagName.startsWith('M ')) {
        map.get(vehicleId)!.push(tagName);
      }
    });
    
    return map;
  }, [vehicleTagsData]);

  // Get unique vehicles from the vehicles prop
  const vehicleOptions = useMemo(() => {
    return ['all', ...vehicles.map(v => v.registration_number)];
  }, [vehicles]);

  // Get tag options - only tags starting with "M " for mileage grouping
  const mileageTags = useMemo(() => {
    return tags
      .filter(t => t.name.startsWith('M '))
      .map(t => t.name)
      .sort();
  }, [tags]);

  // Find the busiest tag in the last 10 days
  useEffect(() => {
    if (mileageTags.length > 0 && selectedTags.length === 0 && trips.length > 0) {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const recentTrips = trips.filter(trip => {
        const tripDate = new Date(trip.trip_end_date);
        return tripDate >= tenDaysAgo;
      });
      
      // Count trips and distance by tag
      const tagStats = new Map<string, { trips: number; distance: number }>();
      
      recentTrips.forEach(trip => {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        if (!vehicle) return;
        
        const vehicleTags = vehicleTagsMap.get(vehicle.id) || [];
        vehicleTags.forEach(tag => {
          if (!tagStats.has(tag)) {
            tagStats.set(tag, { trips: 0, distance: 0 });
          }
          const stats = tagStats.get(tag)!;
          stats.trips++;
          stats.distance += (trip.end_km - trip.start_km);
        });
      });
      
      // Find tag with most activity (distance)
      let maxTag = mileageTags[0];
      let maxDistance = 0;
      
      tagStats.forEach((stats, tag) => {
        if (stats.distance > maxDistance && mileageTags.includes(tag)) {
          maxDistance = stats.distance;
          maxTag = tag;
        }
      });
      
      // Set the busiest tag as selected
      if (maxTag) {
        setSelectedTags([maxTag]);
      }
    }
  }, [mileageTags, trips, vehicles, vehicleTagsMap, selectedTags.length]);

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

  // Helper functions for tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        // If deselecting the last tag, don't allow empty selection
        const newSelection = prev.filter(t => t !== tag);
        return newSelection.length === 0 ? prev : newSelection;
      } else {
        // Single selection mode - replace previous selection
        return [tag];
      }
    });
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

      // Filter by tags (always filter, no 'all' option)
      if (selectedTags.length > 0) {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        if (!vehicle) return false;
        
        const vehicleTags = vehicleTagsMap.get(vehicle.id) || [];
        const hasSelectedTag = selectedTags.some(tag => vehicleTags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      // Filter by date
      const tripDate = parseISO(trip.trip_end_date);
      if (isBefore(tripDate, startDate) || isAfter(tripDate, endDate)) {
        return false;
      }

      // Only include trips with calculated mileage
      return trip.calculated_kmpl !== undefined && trip.calculated_kmpl !== null;
    });
  }, [trips, vehicles, selectedVehicles, selectedTags, startDate, endDate, vehicleTagsMap]);

  // Separate trips for chart display (exclude extreme outliers)
  const chartTrips = useMemo(() => {
    return filteredTrips.filter(trip => {
      const kmpl = trip.calculated_kmpl || 0;
      // Exclude statistical outliers from chart display to prevent distortion
      // They will still be shown in anomalies section
      if (kmpl > 25) return false; // Hide extreme high values
      return kmpl > 0;
    });
  }, [filteredTrips]);

  // Track outliers for special display
  const outlierTrips = useMemo(() => {
    return filteredTrips.filter(trip => {
      const kmpl = trip.calculated_kmpl || 0;
      return kmpl > 25 && kmpl <= 35;
    });
  }, [filteredTrips]);

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
      const clientAnomalies = detectClientSideAnomalies(filteredTrips, vehicles, vehicleTagsMap);
      
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
      'impossible_speed': 'Unrealistic speed detected',
      'data_entry_error': 'Impossible mileage value (>35 km/L)',
      'statistical_outlier': 'Unusual mileage compared to similar vehicles'
    };
    return messages[type] || 'Vehicle performance issue detected';
  }, []);

  // Process anomalies from database response and group by vehicle - only mileage related
  const anomalies = useMemo(() => {
    if (!anomaliesData) return [];

    const processed: Anomaly[] = [];

    anomaliesData.forEach((anomalyGroup: any) => {
      const { anomaly_type, severity, trip_ids, trip_serials, anomaly_details } = anomalyGroup;

      // Process all anomaly types including data entry errors
      const validTypes = [
        'poor_efficiency', 
        'negative_distance',
        'impossible_speed',
        'data_entry_error',
        'statistical_outlier'
      ];

      if (!validTypes.includes(anomaly_type)) {
        return; // Skip unknown anomaly types
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

    chartTrips.forEach(trip => {
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
      const displayMileage = Math.min(actualMileage, 35); // Cap at 35 for display
      
      if (dateEntry[vehicleKey]) {
        dateEntry[vehicleKey] = (dateEntry[vehicleKey] + displayMileage) / 2;
      } else {
        dateEntry[vehicleKey] = displayMileage;
      }
      
      // Store actual mileage for tooltip
      dateEntry[`${vehicleKey}_actual`] = actualMileage;
      dateEntry[`${vehicleKey}_hasError`] = actualMileage > 35;
      
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
  }, [chartTrips, vehicles, anomalies]);

  // Check if any data exceeds 35 km/L
  const hasDataErrors = useMemo(() => {
    return filteredTrips.some(trip => (trip.calculated_kmpl || 0) > 35);
  }, [filteredTrips]);

  // Get unique vehicle registrations for chart lines
  const chartVehicles = useMemo(() => {
    const vehicleSet = new Set<string>();
    chartTrips.forEach(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      if (vehicle) vehicleSet.add(vehicle.registration_number);
    });
    return Array.from(vehicleSet);
  }, [chartTrips, vehicles]);

  // Calculate dynamic Y-axis domain based on data (excluding outliers)
  const yAxisDomain = useMemo(() => {
    if (chartTrips.length === 0) return [0, 20];
    
    const mileages = chartTrips
      .map(t => t.calculated_kmpl || 0)
      .filter(m => m > 0 && m <= 25); // Cap at 25 for better visualization
    
    if (mileages.length === 0) return [0, 20];
    
    const minMileage = Math.min(...mileages);
    const maxMileage = Math.max(...mileages);
    
    // Add 10% padding
    const padding = (maxMileage - minMileage) * 0.1;
    const domainMin = Math.max(0, Math.floor(minMileage - padding));
    const domainMax = Math.min(25, Math.ceil(maxMileage + padding));
    
    return [domainMin, domainMax];
  }, [chartTrips]);

  // Generate smart Y-axis ticks based on domain
  const yAxisTicks = useMemo(() => {
    const [min, max] = yAxisDomain;
    const range = max - min;
    
    // Determine tick interval based on range
    let interval;
    if (range <= 5) interval = 1;
    else if (range <= 10) interval = 2;
    else if (range <= 20) interval = 5;
    else interval = 10;
    
    const ticks = [];
    for (let i = Math.ceil(min / interval) * interval; i <= max; i += interval) {
      ticks.push(i);
    }
    
    return ticks;
  }, [yAxisDomain]);


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

  // Custom dot component for clickable points
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
          r={4}
          fill={colors[chartVehicles.indexOf(dataKey) % colors.length]}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => tripId && navigate(`/trips/${tripId}`)}
          onMouseEnter={(e) => {
            e.currentTarget.setAttribute('r', '6');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.setAttribute('r', '4');
          }}
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
          onClick={() => tripId && navigate(`/trips/${tripId}`)}
          onMouseEnter={(e) => {
            e.currentTarget.setAttribute('r', '8');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.setAttribute('r', '6');
          }}
        />
        {/* Inner dot */}
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={anomalyColor}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => tripId && navigate(`/trips/${tripId}`)}
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
            onClick={() => tripId && navigate(`/trips/${tripId}`)}
          >
            ⚠
          </text>
        )}
      </g>
    );
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

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

        {/* Mileage Tag Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Filter by Type:</span>
          {mileageTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            const vehicleCount = vehicles.filter(v => vehicleTagsMap.get(v.id)?.includes(tag)).length;
            
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tag.substring(2)} ({vehicleCount})
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="ml-auto px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {showLegend ? 'Hide' : 'Show'} Legend
            </button>
          )}
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
        {/* Outlier Warning */}
        {outlierTrips.length > 0 && (
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {outlierTrips.length} trips with mileage {'>'}25 km/L hidden from chart (see anomalies below)
              </span>
            </div>
          </div>
        )}
        
        {selectedTags.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a vehicle type to view mileage trends</p>
              <p className="text-sm">Choose from the tags above to see performance data</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
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
                domain={yAxisDomain}
                ticks={yAxisTicks}
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
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '8px'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} km/L`,
                  name
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                cursor={{ strokeDasharray: '3 3' }}
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
                  hide={!showLegend && index > 5}  // Hide excess lines if legend is hidden
                />
              ))}
              {showLegend && chartVehicles.length > 0 && (
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="line"
                  wrapperStyle={{ fontSize: '10px' }}
                />
              )}
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
        {selectedTags.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Vehicles</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {chartVehicles.length} active
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Avg Mileage</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {typeof averageMileage === 'number' ? `${averageMileage} km/L` : 'Calculating...'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Data Points</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {chartTrips.length} trips
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Period</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {dateRange === 'custom' ? 'Custom' : `Last ${dateRange.replace('days', ' days')}`}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              💡 Click any data point to view trip details
            </div>
          </div>
        )}
      </div>


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
              // Group anomalies by type first
              const groupedByType = anomalies.reduce((acc, anomaly) => {
                const type = anomaly.issues[0]?.type || 'unknown';
                if (!acc[type]) {
                  acc[type] = [];
                }
                acc[type].push(anomaly);
                return acc;
              }, {} as Record<string, Anomaly[]>);

              // Define type order and styling
              const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
                'data_entry_error': { 
                  label: 'Data Entry Errors', 
                  color: 'text-purple-700 dark:text-purple-400',
                  bgColor: 'bg-purple-50 dark:bg-purple-900/20',
                  icon: '📊'
                },
                'statistical_outlier': { 
                  label: 'Statistical Outliers', 
                  color: 'text-blue-700 dark:text-blue-400',
                  bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                  icon: '📈'
                },
                'poor_efficiency': { 
                  label: 'Poor Efficiency', 
                  color: 'text-orange-700 dark:text-orange-400',
                  bgColor: 'bg-orange-50 dark:bg-orange-900/20',
                  icon: '⚠️'
                },
                'negative_distance': { 
                  label: 'Data Quality Issues', 
                  color: 'text-red-700 dark:text-red-400',
                  bgColor: 'bg-red-50 dark:bg-red-900/20',
                  icon: '🚫'
                }
              };

              const typeOrder = ['data_entry_error', 'statistical_outlier', 'poor_efficiency', 'negative_distance'];
              const sortedTypes = Object.keys(groupedByType).sort((a, b) => {
                const indexA = typeOrder.indexOf(a);
                const indexB = typeOrder.indexOf(b);
                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
              });

              return sortedTypes.map(type => {
                const typeAnomalies = groupedByType[type];
                const config = typeConfig[type] || {
                  label: type,
                  color: 'text-gray-700 dark:text-gray-400',
                  bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                  icon: '📄'
                };

                return (
                  <div key={type} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className={`${config.bgColor} px-3 py-2 border-b dark:border-gray-700`}>
                      <h4 className={`text-sm font-semibold ${config.color} flex items-center gap-2`}>
                        <span className="text-base">{config.icon}</span>
                        {config.label} ({typeAnomalies.length})
                      </h4>
                    </div>
                    <div className="space-y-1">
                      {typeAnomalies.map((anomaly, index) => (
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
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {anomaly.vehicle_registration}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-500">{anomaly.date}</span>
                                <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-1">
                                <div>
                                  <span className="font-medium text-gray-600 dark:text-gray-400">Mileage:</span>{' '}
                                  <span className="font-semibold">{anomaly.mileage.toFixed(2)} km/L</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600 dark:text-gray-400">Distance:</span>{' '}
                                  <span className="font-semibold">{anomaly.distance.toFixed(0)} km</span>
                                </div>
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
                );
              });
            })()}
          </div>
        </div>
      )}

      {anomalies.length === 0 && filteredTrips.length > 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-lg">No anomalies detected</p>
          <p className="text-sm mt-1">Your fleet is performing within expected parameters ✓</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedMileageChart;

