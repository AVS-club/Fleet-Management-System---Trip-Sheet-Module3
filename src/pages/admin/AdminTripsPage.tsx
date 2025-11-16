import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout'; 
import TripsTable from '../../components/admin/TripsTable';
import TripsSummary from '../../components/admin/TripsSummary';
import ExcelFormatTips from '../../components/admin/ExcelFormatTips';
import ExportOptionsModal, { ExportOptions } from '../../components/admin/ExportOptionsModal';
import { Trip, Vehicle, Driver, Warehouse, Destination } from '@/types';
import { getTrips, getVehicles, getWarehouses, getDestinations, updateTrip } from '../../utils/storage';
import { getDrivers } from '../../utils/api/drivers';
import { generateCSV, downloadCSV, parseCSV } from '../../utils/csvParser';
import { supabase } from '../../utils/supabaseClient';
import { forceDataRefresh, testDatabaseConnection, clearCacheAndRefresh } from '../../utils/forceDataRefresh';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subWeeks, subMonths, subYears } from 'date-fns';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X, RefreshCw, Search, FileText, Download, ChevronUp, Upload, SlidersHorizontal } from 'lucide-react';
import UnifiedSearchBar from '../../components/trips/UnifiedSearchBar';
import { comprehensiveSearchTrips, TripFilters } from '../../utils/tripSearch';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { fixAllExistingMileage, fixMileageForSpecificVehicle } from '../../utils/fixExistingMileage';
import { analyzeAllTrips } from '../../utils/mileageDiagnostics';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AdminTripsPage');

interface TripSummaryMetrics {
  totalExpenses: number;
  avgDistance: number;
  tripCount: number;
  meanMileage: number;
  topDriver: {
    id: string;
    name: string;
    totalDistance: number;
    tripCount: number;
  } | null;
  topVehicle: {
    id: string;
    registrationNumber: string;
    tripCount: number;
  } | null;
}

const AdminTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fixingMileage, setFixingMileage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const vehiclesMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const driversMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const destinationsMap = useMemo(() => new Map(destinations.map(d => [d.id, d.name])), [destinations]);
  
  // Date preset state
  const [datePreset, setDatePreset] = useState('allTime');

  // Infinite scroll state
  const tripsPerPage = 50; // load 50 trips per batch
  const [visibleTripCount, setVisibleTripCount] = useState(tripsPerPage);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const autoLoadLockRef = useRef(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);

  const [summaryMetrics, setSummaryMetrics] = useState<TripSummaryMetrics>({
    totalExpenses: 0,
    avgDistance: 0,
    tripCount: 0,
    meanMileage: 0,
    topDriver: null,
    topVehicle: null
  });

  // Filter state - no default date filter, loads all trips
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    vehicleId: '',
    driverId: '',
    warehouseId: '',
    tripType: '',
    search: ''
  });
  const [sortMode, setSortMode] = useState<'recent' | 'distance' | 'expense'>('recent');
  const [showImportTips, setShowImportTips] = useState(false);
  const sortOptions = [
    { value: 'recent', label: 'Newest first' },
    { value: 'distance', label: 'Longest distance' },
    { value: 'expense', label: 'Highest expense' }
  ];

  // Date preset options
  const datePresetOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'allTime', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Handle date preset changes
  useEffect(() => {
    // Only update dates if preset is not 'allTime' or 'custom'
    // 'allTime' means no date filter (empty dates)
    if (datePreset === 'allTime') {
      setFilters(prev => ({
        ...prev,
        dateRange: {
          start: '',
          end: ''
        }
      }));
      return;
    }
    
    if (datePreset === 'custom') {
      // Don't update dates for custom - user controls them manually
      return;
    }
    
    const today = new Date();
    let start: Date, end: Date;
    
    switch (datePreset) {
      case 'today':
        start = end = today;
        break;
      case 'yesterday':
        start = end = subDays(today, 1);
        break;
      case 'thisWeek':
        start = startOfWeek(today);
        end = endOfWeek(today);
        break;
      case 'lastWeek':
        start = startOfWeek(subWeeks(today, 1));
        end = endOfWeek(subWeeks(today, 1));
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'thisYear':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'lastYear':
        start = startOfYear(subYears(today, 1));
        end = endOfYear(subYears(today, 1));
        break;
      case 'last7':
        start = subDays(today, 6);
        end = today;
        break;
      case 'last30':
        start = subDays(today, 29);
        end = today;
        break;
      default:
        // Default to no date filter
        setFilters(prev => ({
          ...prev,
          dateRange: {
            start: '',
            end: ''
          }
        }));
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      }
    }));
  }, [datePreset]);

  // Fetch data on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setSummaryLoading(true);

        const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations()
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);
        setDestinations(destinationsData);

        // Fetch summary metrics
        await fetchSummaryMetrics();
        setLoading(false);
      } catch (error) {
        logger.error("Error fetching data:", error);
        setLoading(false);
        setSummaryLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enhanced refresh data function with force refresh capability
  const refreshData = async (forceRefresh = false) => {
    try {
      setRefreshing(true);
      
      if (forceRefresh) {
        logger.debug('Using force refresh...');
        const result = await forceDataRefresh();
        
        if (result.success) {
          // Get fresh data after force refresh
          const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
            getTrips(),
            getVehicles(),
            getDrivers(),
            getWarehouses(),
            getDestinations()
          ]);
          setTrips(tripsData);
          setVehicles(vehiclesData);
          setDrivers(driversData);
          setWarehouses(warehousesData);
          setDestinations(destinationsData);
          
          await fetchSummaryMetrics();
          toast.success(`Force refresh completed: ${result.tripsCount} trips, ${result.vehiclesCount} vehicles, ${result.driversCount} drivers`);
        } else {
          toast.error(`Force refresh failed: ${result.error}`);
        }
      } else {
        // Normal refresh
        const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations()
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);
        setDestinations(destinationsData);
        
        await fetchSummaryMetrics();
        toast.success("Data refreshed successfully");
      }
    } catch (error) {
      logger.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Test database connection
  const testConnection = async () => {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      toast.success("Database connection is working");
    } else {
      toast.error("Database connection failed - check console for details");
    }
  };

  // Clear cache and force refresh
  const clearCacheAndForceRefresh = async () => {
    const result = await clearCacheAndRefresh();
    if (result.success) {
      // Update local state
      const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
        getWarehouses(),
        getDestinations()
      ]);
      setTrips(tripsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setWarehouses(warehousesData);
      setDestinations(destinationsData);
      
      await fetchSummaryMetrics();
    }
  };

  // Fix mileage calculations for all trips
  const handleFixMileage = async () => {
    try {
      // Run diagnostics first to show preview
      const diagnostics = analyzeAllTrips(trips);

      let confirmMessage = 'This will recalculate mileage for all existing trips using the tank-to-tank method.\n\n';
      confirmMessage += `Trips to analyze: ${diagnostics.totalRefuelingTrips} refueling trips\n`;

      if (diagnostics.totalAnomalies > 0) {
        confirmMessage += `\nAnomalies detected:\n`;
        if (diagnostics.extremelyHighMileage > 0) {
          confirmMessage += `  - ${diagnostics.extremelyHighMileage} trips with extremely high mileage (>100 km/L)\n`;
        }
        if (diagnostics.veryHighMileage > 0) {
          confirmMessage += `  - ${diagnostics.veryHighMileage} trips with high mileage (>50 km/L)\n`;
        }
        if (diagnostics.partialRefills > 0) {
          confirmMessage += `  - ${diagnostics.partialRefills} possible partial refills\n`;
        }
        if (diagnostics.veryLowMileage > 0) {
          confirmMessage += `  - ${diagnostics.veryLowMileage} trips with very low mileage (<2 km/L)\n`;
        }
        confirmMessage += '\nDetailed diagnostics will be logged to console.\n';
      }

      confirmMessage += '\nThis may take a few minutes. Do you want to continue?';

      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) return;

      setFixingMileage(true);

      const result = await fixAllExistingMileage();
      if (result.success) {
        // Show detailed message with diagnostics
        const successMessage = result.message;
        if (result.diagnostics && result.diagnostics.totalAnomalies > 0) {
          toast.success(successMessage, { autoClose: 8000 });
        } else {
          toast.success(successMessage);
        }

        logger.info('Fix Mileage completed successfully');
        if (result.diagnostics) {
          logger.info(`Total anomalies found: ${result.diagnostics.totalAnomalies}`);
        }

        // Refresh the data to show updated mileage
        await refreshData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      logger.error('Error fixing mileage:', error);
      toast.error('Failed to fix mileage calculations');
    } finally {
      setFixingMileage(false);
    }
  };

  const buildSearchFilters = useCallback((): TripFilters => {
    const sortBy =
      sortMode === 'distance'
        ? 'distance-desc'
        : sortMode === 'expense'
          ? 'cost-desc'
          : 'date-desc';

    return {
      search: filters.search || undefined,
      vehicle: filters.vehicleId || undefined,
      driver: filters.driverId || undefined,
      warehouse: filters.warehouseId || undefined,
      dateRange: filters.dateRange.start || filters.dateRange.end ? 'custom' : 'all',
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end,
      sortBy
    };
  }, [filters, sortMode]);

  // Handle smart search with field selection
  const handleSmartSearch = async (searchTerm: string, searchField?: string) => {
    if (searchTerm.length < 2) {
      // Clear search if term is too short
      setSearchResult(null);
      return;
    }
    
    setIsSearching(true);
    try {
      const result = await comprehensiveSearchTrips(
        searchTerm,
        searchField,
        trips,
        vehicles,
        drivers,
        warehouses,
        buildSearchFilters(),
        { page: 1, limit: Math.max(visibleTripCount, tripsPerPage) }
      );
      
      setSearchResult(result);
      
      // Show appropriate message based on field
      if (result.totalCount === 0) {
        toast.info(`No trips found matching "${searchTerm}"${searchField ? ` in ${searchField}` : ''}`);
      } else {
        const fieldName = searchField ? ` in ${searchField}` : ' in all fields';
        toast.success(`Found ${result.totalCount} trips${fieldName}`);
      }
    } catch (error) {
      logger.error('Smart search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Filter trips based on current filters
  const filteredTrips = useMemo(() => {
    // If we have search results, use them instead of basic filtering
    if (searchResult && searchResult.trips) {
      return searchResult.trips;
    }
    
    const baseFiltered = trips.filter(trip => {
      // Search filter
      if (filters.search) {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        const driver = driversMap.get(trip.driver_id);
        
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          trip.trip_serial_number,
          vehicle?.registration_number,
          driver?.name,
        ].map(field => field?.toLowerCase());
        
        if (!searchFields.some(field => field?.includes(searchTerm))) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        const tripStartDate = new Date(trip.trip_start_date);
        if (tripStartDate < startDate) {
          return false;
        }
      }
      
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999); // End of day
        const tripEndDate = new Date(trip.trip_end_date);
        if (tripEndDate > endDate) {
          return false;
        }
      }

      // Vehicle filter
      if (filters.vehicleId && trip.vehicle_id !== filters.vehicleId) {
        return false;
      }

      // Driver filter
      if (filters.driverId && trip.driver_id !== filters.driverId) {
        return false;
      }

      // Warehouse filter
      if (filters.warehouseId && trip.warehouse_id !== filters.warehouseId) {
        return false;
      }

      // Trip type filter
      if (filters.tripType) {
        if (filters.tripType === 'two_way' && !(Array.isArray(trip.destinations) && trip.destinations.length > 1)) {
          return false;
        }
        if (filters.tripType === 'one_way' && !(Array.isArray(trip.destinations) && trip.destinations.length === 1)) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...baseFiltered];
    switch (sortMode) {
      case 'distance':
        sorted.sort((a, b) => {
          const distA = (a.end_km || 0) - (a.start_km || 0);
          const distB = (b.end_km || 0) - (b.start_km || 0);
          return distB - distA;
        });
        break;
      case 'expense':
        sorted.sort((a, b) => {
          const expenseA =
            (a.total_fuel_cost || 0) +
            (a.total_road_expenses || 0) +
            (a.unloading_expense || 0) +
            (a.driver_expense || 0) +
            (a.road_rto_expense || 0) +
            (a.breakdown_expense || 0) +
            (a.miscellaneous_expense || 0);
          const expenseB =
            (b.total_fuel_cost || 0) +
            (b.total_road_expenses || 0) +
            (b.unloading_expense || 0) +
            (b.driver_expense || 0) +
            (b.road_rto_expense || 0) +
            (b.breakdown_expense || 0) +
            (b.miscellaneous_expense || 0);
          return expenseB - expenseA;
        });
        break;
      case 'recent':
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.trip_start_date).getTime() - new Date(a.trip_start_date).getTime()
        );
    }

    return sorted;
  }, [trips, vehiclesMap, driversMap, filters, searchResult, sortMode]);

  const visibleTrips = useMemo(
    () => filteredTrips.slice(0, visibleTripCount),
    [filteredTrips, visibleTripCount]
  );
  const hasMoreTrips = visibleTripCount < filteredTrips.length;
  const showingCount = visibleTrips.length;
  const activeFilterCount = useMemo(
    () =>
      [filters.search, filters.vehicleId, filters.driverId, filters.warehouseId, filters.tripType]
        .filter(Boolean).length,
    [filters]
  );

  const loadMoreTrips = useCallback((autoTrigger = false) => {
    if (!hasMoreTrips) return;

    if (autoTrigger) {
      if (autoLoadLockRef.current) return;
      autoLoadLockRef.current = true;
    }

    setIsAutoLoading(true);
    setVisibleTripCount(prev => Math.min(prev + tripsPerPage, filteredTrips.length));
  }, [filteredTrips.length, hasMoreTrips, tripsPerPage]);

  const handleManualLoadMore = useCallback(() => loadMoreTrips(false), [loadMoreTrips]);

  useEffect(() => {
    if (autoLoadLockRef.current) {
      autoLoadLockRef.current = false;
    }
    if (isAutoLoading) {
      setIsAutoLoading(false);
    }
  }, [visibleTripCount, isAutoLoading]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMoreTrips(true);
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreTrips]);

  const calculateMetricsLocally = useCallback(() => {
    const filtered = filteredTrips;
    
    // Calculate total expenses
    const totalExpenses = filtered.reduce((sum, trip) => {
      const fuel = trip.total_fuel_cost || 0;
      const road = trip.total_road_expenses || 0;
      const unloading = trip.unloading_expense || 0;
      const driver = trip.driver_expense || 0;
      const rto = trip.road_rto_expense || 0;
      const breakdown = trip.breakdown_expense || 0;
      const misc = trip.miscellaneous_expense || 0;
      return sum + fuel + road + unloading + driver + rto + breakdown + misc;
    }, 0);
    
    // Calculate average distance
    const totalDistance = filtered.reduce((sum, trip) => 
      sum + (trip.end_km - trip.start_km), 0
    );
    const avgDistance = filtered.length > 0 ? totalDistance / filtered.length : 0;
    
    // Calculate mean mileage (only from trips with valid mileage)
    const tripsWithMileage = filtered.filter(trip => 
      trip.calculated_kmpl && trip.calculated_kmpl > 0
    );
    const meanMileage = tripsWithMileage.length > 0 ?
      tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length : 0;
    
    // Calculate top driver
    const driverStats: Record<string, any> = {};
    filtered.forEach(trip => {
      if (trip.driver_id) {
        if (!driverStats[trip.driver_id]) {
          const driver = driversMap.get(trip.driver_id);
          driverStats[trip.driver_id] = {
            id: trip.driver_id,
            name: driver?.name || 'Unknown',
            tripCount: 0,
            totalDistance: 0
          };
        }
        driverStats[trip.driver_id].tripCount++;
        driverStats[trip.driver_id].totalDistance += (trip.end_km - trip.start_km);
      }
    });
    
    // Calculate top vehicle
    const vehicleStats: Record<string, any> = {};
    filtered.forEach(trip => {
      if (trip.vehicle_id) {
        if (!vehicleStats[trip.vehicle_id]) {
          const vehicle = vehiclesMap.get(trip.vehicle_id);
          vehicleStats[trip.vehicle_id] = {
            id: trip.vehicle_id,
            registrationNumber: vehicle?.registration_number || 'Unknown',
            tripCount: 0
          };
        }
        vehicleStats[trip.vehicle_id].tripCount++;
      }
    });
    
    const topDriver = Object.values(driverStats)
      .sort((a, b) => b.tripCount - a.tripCount)[0] || null;
      
    const topVehicle = Object.values(vehicleStats)
      .sort((a, b) => b.tripCount - a.tripCount)[0] || null;
    
    setSummaryMetrics({
      totalExpenses,
      avgDistance,
      tripCount: filtered.length,
      meanMileage,
      topDriver,
      topVehicle
    });
  }, [filteredTrips, driversMap, vehiclesMap]);

  const fetchSummaryMetrics = useCallback(async () => {
    try {
      setSummaryLoading(true);
      
      // Ensure dates are properly formatted
      const startDate = filters.dateRange.start ? 
        new Date(filters.dateRange.start).toISOString() : null;
      const endDate = filters.dateRange.end ? 
        new Date(filters.dateRange.end + 'T23:59:59').toISOString() : null;
      
      const { data, error } = await supabase.rpc('get_trip_summary_metrics', {
        start_date: startDate,
        end_date: endDate,
        p_vehicle_id: filters.vehicleId || null,
        p_driver_id: filters.driverId || null,
        p_warehouse_id: filters.warehouseId || null,
        p_trip_type: filters.tripType || null
      });
      
      if (error) {
        logger.error("Error fetching summary metrics:", error);
        // Fallback to local calculation
        calculateMetricsLocally();
      } else if (data) {
        // Handle both array and object responses
        const metricsData = Array.isArray(data) ? data[0] : data;
        
        if (metricsData) {
          setSummaryMetrics({
            totalExpenses: metricsData.total_expenses || 0,
            avgDistance: metricsData.avg_distance || 0,
            tripCount: metricsData.trip_count || 0,
            meanMileage: metricsData.mean_mileage || 0,
            topDriver: metricsData.top_driver ? {
              id: metricsData.top_driver.id,
              name: metricsData.top_driver.name,
              totalDistance: metricsData.top_driver.totalDistance || 0,
              tripCount: metricsData.top_driver.tripCount || 0
            } : null,
            topVehicle: metricsData.top_vehicle ? {
              id: metricsData.top_vehicle.id,
              registrationNumber: metricsData.top_vehicle.registrationNumber,
              tripCount: metricsData.top_vehicle.tripCount || 0
            } : null
          });
        } else {
          calculateMetricsLocally();
        }
      }
    } catch (error) {
      logger.error("Exception fetching summary metrics:", error);
      calculateMetricsLocally();
    } finally {
      setSummaryLoading(false);
    }
  }, [filters, calculateMetricsLocally]);

  useEffect(() => {
    fetchSummaryMetrics();
  }, [fetchSummaryMetrics]);

  useEffect(() => {
    setVisibleTripCount(tripsPerPage);
  }, [filters, searchResult, trips.length, tripsPerPage, sortMode]);

  const handleUpdateTrip = async (tripId: string, updates: Partial<Trip>) => {
    const updatedTrip = await updateTrip(tripId, updates);
    if (updatedTrip) {
      setTrips(prev => 
        prev.map(trip => 
          trip.id === tripId ? updatedTrip : trip
        )
      );
      // Refresh summary metrics after update
      fetchSummaryMetrics();
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      // Delete the trip from Supabase
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) {
        throw new Error(`Failed to delete trip: ${error.message}`);
      }

      // If successful, update the trips list
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      toast.success('Trip deleted successfully');
      
      // Refresh summary metrics
      fetchSummaryMetrics();
    } catch (error) {
      logger.error("Error deleting trip:", error);
      toast.error(`Error deleting trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    // If manually changing dates, switch to custom preset
    if (newFilters.dateRange) {
      const hasDates = newFilters.dateRange.start || newFilters.dateRange.end;
      // If clearing dates (both empty), switch to allTime
      if (!hasDates && !newFilters.dateRange.start && !newFilters.dateRange.end) {
        setDatePreset('allTime');
      } else {
        setDatePreset('custom');
      }
    }
    
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      dateRange: {
        start: '',
        end: ''
      },
      vehicleId: '',
      driverId: '',
      warehouseId: '',
      tripType: '',
      search: ''
    });
    setDatePreset('allTime');
    setSearchResult(null); // Clear search results
  };

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFilters(prev => ({
      ...prev,
      search: value
    }));

    if (!value) {
      setSearchResult(null);
    }
  }, []);

  const handleSortChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortMode(event.target.value as 'recent' | 'distance' | 'expense');
  }, []);

  const openImportTipsModal = useCallback(() => setShowImportTips(true), []);
  const closeImportTipsModal = useCallback(() => setShowImportTips(false), []);
  const triggerFilePicker = useCallback(() => {
    setShowImportTips(false);
    importInputRef.current?.click();
  }, [importInputRef]);

  const getFiltersSummary = useCallback(() => {
    const parts: string[] = [];

    if (filters.dateRange.start && filters.dateRange.end) {
      parts.push(
        `Dates: ${format(new Date(filters.dateRange.start), 'dd MMM')} - ${format(
          new Date(filters.dateRange.end),
          'dd MMM'
        )}`
      );
    } else {
      parts.push('Dates: all');
    }

    if (filters.vehicleId) {
      const reg = vehiclesMap.get(filters.vehicleId)?.registration_number;
      parts.push(`Vehicle: ${reg || 'Selected'}`);
    } else {
      parts.push('Vehicle: all');
    }

    if (filters.driverId) {
      const name = driversMap.get(filters.driverId)?.name;
      parts.push(`Driver: ${name || 'Selected'}`);
    } else {
      parts.push('Driver: all');
    }

    if (filters.tripType) {
      parts.push(filters.tripType === 'two_way' ? 'Trip: two-way' : 'Trip: one-way');
    }

    if (filters.search) {
      parts.push(`Search: “${filters.search}”`);
    }

    const sortLabel =
      sortMode === 'distance'
        ? 'Sorting: longest distance'
        : sortMode === 'expense'
          ? 'Sorting: highest expense'
          : 'Sorting: newest trips';
    parts.push(sortLabel);

    return parts.join(' • ');
  }, [filters, vehiclesMap, driversMap, sortMode]);

  const handleExport = async () => {
    try {
      // Use filtered trips from the current view
      const tripsToExport = filteredTrips.length > 0 ? filteredTrips : trips;
      
      if (tripsToExport.length === 0) {
        toast.error('No trips available to export');
        return;
      }
      
      // Get destinations for name mapping
      const destinations = await getDestinations();
      const destinationMap = new Map(destinations.map(d => [d.id, d.name]));
      
      logger.debug('Exporting trips:', tripsToExport.length);
      
      const exportData = tripsToExport.map(trip => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        const driver = driversMap.get(trip.driver_id);
        const warehouse = warehouses.find(w => w.id === trip.warehouse_id);
        
        // Calculate distance
        const distance = (trip.end_km || 0) - (trip.start_km || 0);
        
        // Handle fuel calculations
        let fuelCost = trip.total_fuel_cost || 0;
        let fuelRatePerLiter = trip.fuel_rate_per_liter || 0;
        
        // Calculate fuel rate if we have cost and quantity
        if (fuelCost > 0 && trip.fuel_quantity > 0 && !fuelRatePerLiter) {
          fuelRatePerLiter = fuelCost / trip.fuel_quantity;
        }
        
        // If still no fuel rate but we have quantity, use default rate
        if (trip.fuel_quantity > 0 && !fuelRatePerLiter && fuelCost === 0) {
          fuelRatePerLiter = 93.33; // Average diesel price
          fuelCost = trip.fuel_quantity * fuelRatePerLiter;
        }
        
        // Calculate PROPER total expense INCLUDING all components
        const totalExpense = 
          (fuelCost || 0) +
          (trip.total_road_expenses || 0) +
          (trip.unloading_expense || 0) +
          (trip.driver_expense || 0) +
          (trip.road_rto_expense || 0) +
          (trip.breakdown_expense || 0) +
          (trip.miscellaneous_expense || 0);
        
        // Convert destination IDs to names
        let destinationNames = '';
        if (trip.destinations && Array.isArray(trip.destinations)) {
          destinationNames = trip.destinations
            .map(destId => {
              // Check if it's already a name or needs mapping
              if (typeof destId === 'string' && destId.includes('-')) {
                // It's a UUID, map it
                return destinationMap.get(destId) || 'Unknown';
              }
              return destId; // It's already a name
            })
            .join(', ');
        } else if (trip.destinations) {
          destinationNames = destinationMap.get(trip.destinations) || trip.destinations;
        }
        
        // Determine trip type correctly based on short_trip flag
        let tripType = 'One Way';
        if (trip.short_trip === true) {
          tripType = 'Return Trip';
        } else if (trip.return_trip === true) {
          tripType = 'Return Trip';
        } else if (Array.isArray(trip.destinations) && trip.destinations.length > 1) {
          tripType = 'Multi-Stop';
        }
        
        // Calculate mileage if not present
        let mileage = trip.calculated_kmpl || 0;
        if (!mileage && trip.fuel_quantity > 0) {
          mileage = distance / trip.fuel_quantity;
        }
        
        return {
          'TRIP ID': trip.trip_serial_number || '',
          'START DATE': trip.trip_start_date ? 
            new Date(trip.trip_start_date).toLocaleDateString('en-GB') : '',
          'END DATE': trip.trip_end_date ? 
            new Date(trip.trip_end_date).toLocaleDateString('en-GB') : '',
          'VEHICLE': vehicle?.registration_number || '',
          'DRIVER': driver?.name || '',
          'SOURCE WAREHOUSE': warehouse?.name || '',
          'DESTINATIONS': destinationNames || 'N/A',
          'START KM': trip.start_km || 0,
          'END KM': trip.end_km || 0,
          'DISTANCE (KM)': distance,
          'FUEL QUANTITY (L)': parseFloat(trip.fuel_quantity || 0).toFixed(2),
          'FUEL RATE (INR/L)': parseFloat(fuelRatePerLiter || 0).toFixed(2),
          'FUEL COST (INR)': parseFloat(fuelCost || 0).toFixed(2),
          'MILEAGE (km/L)': parseFloat(mileage || 0).toFixed(2),
          'ROAD EXPENSES (INR)': parseFloat(trip.total_road_expenses || 0).toFixed(2),
          'UNLOADING EXPENSE (INR)': parseFloat(trip.unloading_expense || 0).toFixed(2),
          'DRIVER EXPENSE (INR)': parseFloat(trip.driver_expense || 0).toFixed(2),
          'RTO EXPENSE (INR)': parseFloat(trip.road_rto_expense || 0).toFixed(2),
          'BREAKDOWN EXPENSE (INR)': parseFloat(trip.breakdown_expense || 0).toFixed(2),
          'MISC EXPENSE (INR)': parseFloat(trip.miscellaneous_expense || 0).toFixed(2),
          'TOTAL EXPENSE (INR)': parseFloat(totalExpense).toFixed(2),
          'TRIP TYPE': tripType,
          'BILLING TYPE': trip.billing_type || 'N/A',
          'INCOME (INR)': parseFloat(trip.income_amount || 0).toFixed(2),
          'NET PROFIT/LOSS (INR)': parseFloat((trip.income_amount || 0) - totalExpense).toFixed(2)
        };
      });
      
      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // Trip ID
        { wch: 12 }, // Start Date
        { wch: 12 }, // End Date
        { wch: 15 }, // Vehicle
        { wch: 25 }, // Driver
        { wch: 25 }, // Source Warehouse
        { wch: 35 }, // Destinations
        { wch: 10 }, // Start KM
        { wch: 10 }, // End KM
        { wch: 12 }, // Distance
        { wch: 14 }, // Fuel Quantity
        { wch: 12 }, // Fuel Rate
        { wch: 12 }, // Fuel Cost
        { wch: 12 }, // Mileage
        { wch: 14 }, // Road Expenses
        { wch: 16 }, // Unloading
        { wch: 14 }, // Driver Expense
        { wch: 12 }, // RTO
        { wch: 14 }, // Breakdown
        { wch: 12 }, // Misc
        { wch: 14 }, // Total Expense
        { wch: 12 }, // Trip Type
        { wch: 12 }, // Billing Type
        { wch: 12 }, // Income
        { wch: 16 }, // Net Profit/Loss
      ];
      worksheet['!cols'] = colWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips Report');
      
      const fileName = `trips-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success(`Successfully exported ${exportData.length} trips!`);
      
    } catch (error) {
      logger.error('Export failed:', error);
      toast.error('Failed to export trips. Please check console for details.');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      // Process imported data
      toast.info(`Imported ${data.length} trips. Processing...`);
      // You'd normally process these and add to the database
      // For now, we're just showing a success message
      toast.success(`Successfully processed ${data.length} trips`);
    } catch (error) {
      logger.error('Error importing file:', error);
      toast.error('Failed to import trips');
    }
  };

  const handleImportInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
      event.target.value = '';
    }
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <FileText className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Trip Management</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">View and manage all trip records</p>
      </div>

      {/* Filters + Summary */}
      {!loading && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>{showFilters ? 'Hide filters' : 'Filters'}</span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <p className="text-xs text-gray-500">
                  {getFiltersSummary()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {activeFilterCount > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
                <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {filteredTrips.length} matching trips
                </span>
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Sort by</span>
                  <div className="relative">
                    <select
                      value={sortMode}
                      onChange={handleSortChange}
                      className="appearance-none bg-transparent pr-6 text-xs font-semibold text-gray-700 focus:outline-none"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleImportInputChange}
              className="hidden"
              aria-label="Import trips file"
            />

            <TripsSummary
              trips={trips}
              vehicles={vehicles}
              drivers={drivers}
              loading={summaryLoading}
              metrics={summaryMetrics}
              className="mt-2"
              actionsSlot={(
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">Quick actions</p>
                    {refreshing && <span className="text-xs text-blue-600 animate-pulse">Refreshing...</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={clearFilters}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                      title="Clear filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => refreshData(false)}
                      disabled={refreshing}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
                      title="Refresh list"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                    <button
                      onClick={openImportTipsModal}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                      title="Import from Excel"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleExport}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition hover:border-blue-300"
                      title="Export current view"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            />

            {showFilters && (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  {/* Compact Search */}
                  <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quick Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filters.search}
                        onChange={handleSearchInputChange}
                        placeholder="Trip ID, driver, vehicle..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                  
                  {/* Date Range Start */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Start Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={filters.dateRange.start}
                        onChange={(e) => handleFiltersChange({ 
                          dateRange: { 
                            ...filters.dateRange, 
                            start: e.target.value 
                          } 
                        })}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Calendar className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                  
                  {/* Date Range End */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={filters.dateRange.end}
                        onChange={(e) => handleFiltersChange({ 
                          dateRange: { 
                            ...filters.dateRange, 
                            end: e.target.value 
                          } 
                        })}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Calendar className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                  
                  {/* Vehicle Select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Vehicle
                    </label>
                    <select
                      value={filters.vehicleId}
                      onChange={(e) => handleFiltersChange({ vehicleId: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Vehicles</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Driver Select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Driver
                    </label>
                    <select
                      value={filters.driverId}
                      onChange={(e) => handleFiltersChange({ driverId: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Drivers</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Warehouse Select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Warehouse
                    </label>
                    <select
                      value={filters.warehouseId}
                      onChange={(e) => handleFiltersChange({ warehouseId: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Warehouses</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Trip Type Select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Trip Type
                    </label>
                    <select
                      value={filters.tripType}
                      onChange={(e) => handleFiltersChange({ tripType: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="one_way">One Way</option>
                      <option value="two_way">Two Way</option>
                    </select>
                  </div>
                </div>
                
                {/* Active filters summary */}
                {(filters.search || filters.vehicleId || filters.driverId || filters.warehouseId || filters.tripType) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Active filters:</span>
                    <div className="flex flex-wrap gap-2">
                      {filters.search && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          Search: {filters.search}
                        </span>
                      )}
                      {filters.vehicleId && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          Vehicle: {vehicles.find(v => v.id === filters.vehicleId)?.registration_number}
                        </span>
                      )}
                      {filters.driverId && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          Driver: {drivers.find(d => d.id === filters.driverId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trip Table */}
      <TripsTable
        trips={visibleTrips}
        vehicles={vehicles}
        drivers={drivers}
        onUpdateTrip={handleUpdateTrip}
        onDeleteTrip={handleDeleteTrip}
      />

      <div className="mt-4 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{showingCount}</span> of{' '}
            <span className="font-semibold text-gray-900">{filteredTrips.length}</span> trips
          </p>
          {hasMoreTrips ? (
            <button
              onClick={handleManualLoadMore}
              disabled={isAutoLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:border-blue-200 disabled:opacity-60"
            >
              {isAutoLoading ? 'Loading...' : `Load ${tripsPerPage} more`}
            </button>
          ) : (
            <span className="text-xs font-semibold text-green-600">All trips loaded</span>
          )}
        </div>
        {hasMoreTrips && (
          <p className="text-xs text-gray-500 mt-1">Scroll down or tap load more to fetch the next batch.</p>
        )}
      </div>

      <div ref={loadMoreRef} className="h-2" aria-hidden="true" />

      {showImportTips && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/60 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-gray-900">Import checklist</p>
                <p className="text-sm text-gray-600">Skim these basics, then continue to choose your Excel file.</p>
              </div>
              <button
                onClick={closeImportTipsModal}
                className="rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900"
                aria-label="Close tips"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ExcelFormatTips className="mt-4" headerAction={null} />
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={triggerFilePicker} className="flex-1 sm:flex-none">
                Select file
              </Button>
              <Button variant="outline" onClick={closeImportTipsModal} className="flex-1 sm:flex-none">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportOptionsModal
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
          vehicles={vehicles}
          drivers={drivers}
          warehouses={warehouses}
        />
      )}
    </Layout>
  );
};

export default AdminTripsPage;




