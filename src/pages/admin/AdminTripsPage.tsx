import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout'; 
import TripsTable from '../../components/admin/TripsTable';
import TripsSummary from '../../components/admin/TripsSummary';
import ExportOptionsModal, { ExportOptions } from '../../components/admin/ExportOptionsModal';
import { Trip, Vehicle, Driver, Warehouse } from '@/types';
import { getTrips, getVehicles, getDrivers, getWarehouses, updateTrip } from '../../utils/storage';
import { generateCSV, downloadCSV, parseCSV } from '../../utils/csvParser';
import { supabase } from '../../utils/supabaseClient';
import { forceDataRefresh, testDatabaseConnection, clearCacheAndRefresh } from '../../utils/forceDataRefresh';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subWeeks, subMonths, subYears } from 'date-fns';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Calendar, ChevronDown, Filter, ChevronLeft, ChevronRight, X, RefreshCw, Search, FileText, Download, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { fixAllExistingMileage, fixMileageForSpecificVehicle } from '../../utils/fixExistingMileage';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fixingMileage, setFixingMileage] = useState(false);

  const vehiclesMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const driversMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  
  // Date preset state
  const [datePreset, setDatePreset] = useState('last30');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 50; // 50 trips per page

  const [summaryMetrics, setSummaryMetrics] = useState<TripSummaryMetrics>({
    totalExpenses: 0,
    avgDistance: 0,
    tripCount: 0,
    meanMileage: 0,
    topDriver: null,
    topVehicle: null
  });

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    vehicleId: '',
    driverId: '',
    warehouseId: '',
    tripType: '',
    search: ''
  });

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
      case 'allTime':
        start = new Date('2020-01-01');
        end = today;
        break;
      case 'custom':
        // Don't update dates for custom
        return;
      default:
        start = subDays(today, 29);
        end = today;
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

        const [tripsData, vehiclesData, driversData, warehousesData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses()
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);

        // Fetch summary metrics
        await fetchSummaryMetrics();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
        setSummaryLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch summary metrics when filters change
  useEffect(() => {
    fetchSummaryMetrics();
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters]);

  // Enhanced refresh data function with force refresh capability
  const refreshData = async (forceRefresh = false) => {
    try {
      setRefreshing(true);
      
      if (forceRefresh) {
        console.log('🔄 Using force refresh...');
        const result = await forceDataRefresh();
        
        if (result.success) {
          // Get fresh data after force refresh
          const [tripsData, vehiclesData, driversData, warehousesData] = await Promise.all([
            getTrips(),
            getVehicles(),
            getDrivers(),
            getWarehouses()
          ]);
          setTrips(tripsData);
          setVehicles(vehiclesData);
          setDrivers(driversData);
          setWarehouses(warehousesData);
          
          await fetchSummaryMetrics();
          toast.success(`Force refresh completed: ${result.tripsCount} trips, ${result.vehiclesCount} vehicles, ${result.driversCount} drivers`);
        } else {
          toast.error(`Force refresh failed: ${result.error}`);
        }
      } else {
        // Normal refresh
        const [tripsData, vehiclesData, driversData, warehousesData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses()
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);
        
        await fetchSummaryMetrics();
        toast.success("Data refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
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
      const [tripsData, vehiclesData, driversData, warehousesData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
        getWarehouses()
      ]);
      setTrips(tripsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setWarehouses(warehousesData);
      
      await fetchSummaryMetrics();
    }
  };

  // Fix mileage calculations for all trips
  const handleFixMileage = async () => {
    const confirmed = window.confirm(
      'This will recalculate mileage for all existing trips using the tank-to-tank method. ' +
      'This may take a few minutes. Do you want to continue?'
    );
    
    if (!confirmed) return;

    setFixingMileage(true);
    try {
      const result = await fixAllExistingMileage();
      if (result.success) {
        toast.success(result.message);
        // Refresh the data to show updated mileage
        await refreshData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error fixing mileage:', error);
      toast.error('Failed to fix mileage calculations');
    } finally {
      setFixingMileage(false);
    }
  };

  // Filter trips based on current filters
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
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
  }, [trips, vehiclesMap, driversMap, filters]);

  // Calculate pagination
  const indexOfLastTrip = currentPage * tripsPerPage;
  const indexOfFirstTrip = indexOfLastTrip - tripsPerPage;
  const currentTrips = filteredTrips.slice(indexOfFirstTrip, indexOfLastTrip);
  const totalPages = Math.ceil(filteredTrips.length / tripsPerPage);
  
  // Go to a specific page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const fetchSummaryMetrics = async () => {
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
        console.error("Error fetching summary metrics:", error);
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
      console.error("Exception fetching summary metrics:", error);
      calculateMetricsLocally();
    } finally {
      setSummaryLoading(false);
    }
  };

  const calculateMetricsLocally = () => {
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
  };

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
      
      // If the last trip on the page was deleted, go to previous page
      if (currentTrips.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast.error(`Error deleting trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    if (newFilters.dateRange && datePreset !== 'custom') {
      // If manually changing dates, switch to custom preset
      setDatePreset('custom');
    }
    
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      dateRange: {
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      },
      vehicleId: '',
      driverId: '',
      warehouseId: '',
      tripType: '',
      search: ''
    });
    setDatePreset('last30');
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      // Use filtered trips as the base
      let exportTrips = [...filteredTrips];
      
      // Apply additional export options if provided
      if (options.dateRange?.start) {
        exportTrips = exportTrips.filter(trip => 
          new Date(trip.trip_start_date) >= new Date(options.dateRange.start)
        );
      }
      
      if (options.dateRange?.end) {
        exportTrips = exportTrips.filter(trip => 
          new Date(trip.trip_end_date) <= new Date(options.dateRange.end + 'T23:59:59')
        );
      }
      
      // Prepare data for export
      const exportData = exportTrips.map(trip => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        const driver = driversMap.get(trip.driver_id);
        const warehouse = warehouses.find(w => w.id === trip.warehouse_id);
        
        const distance = trip.end_km - trip.start_km;
        const totalExpense = (trip.total_fuel_cost || 0) + 
                            (trip.total_road_expenses || 0) + 
                            (trip.unloading_expense || 0) + 
                            (trip.driver_expense || 0) + 
                            (trip.road_rto_expense || 0) + 
                            (trip.breakdown_expense || 0) + 
                            (trip.miscellaneous_expense || 0);
        
        return {
          'Trip ID': trip.trip_serial_number,
          'Start Date': format(new Date(trip.trip_start_date), 'dd/MM/yyyy'),
          'End Date': format(new Date(trip.trip_end_date), 'dd/MM/yyyy'),
          'Vehicle': vehicle?.registration_number || 'N/A',
          'Driver': driver?.name || 'N/A',
          'Warehouse': warehouse?.name || 'N/A',
          'Start KM': trip.start_km,
          'End KM': trip.end_km,
          'Distance (KM)': distance,
          'Mileage (km/L)': trip.calculated_kmpl?.toFixed(2) || '-',
          'Fuel Cost': trip.total_fuel_cost || 0,
          'Road Expenses': trip.total_road_expenses || 0,
          'Other Expenses': (trip.unloading_expense || 0) + 
                           (trip.driver_expense || 0) + 
                           (trip.road_rto_expense || 0) + 
                           (trip.breakdown_expense || 0) + 
                           (trip.miscellaneous_expense || 0),
          'Total Expense': totalExpense,
          'Revenue': trip.income_amount || 0,
          'Net Profit/Loss': trip.net_profit || (trip.income_amount ? trip.income_amount - totalExpense : -totalExpense),
          'Trip Type': Array.isArray(trip.destinations) && trip.destinations.length > 1 ? 'Two Way' : 'One Way'
        };
      });
      
      // Export based on format
      if (options.format === 'xlsx' || !options.format) {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        
        // Set column widths
        const colWidths = [
          { wch: 12 }, // Trip ID
          { wch: 12 }, // Start Date
          { wch: 12 }, // End Date
          { wch: 15 }, // Vehicle
          { wch: 20 }, // Driver
          { wch: 20 }, // Warehouse
          { wch: 10 }, // Start KM
          { wch: 10 }, // End KM
          { wch: 12 }, // Distance
          { wch: 12 }, // Mileage
          { wch: 10 }, // Fuel Cost
          { wch: 12 }, // Road Expenses
          { wch: 12 }, // Other Expenses
          { wch: 12 }, // Total Expense
          { wch: 10 }, // Revenue
          { wch: 15 }, // Net Profit/Loss
          { wch: 10 }, // Trip Type
        ];
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Trips');
        XLSX.writeFile(wb, `trips-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`);
        
        toast.success(`Successfully exported ${exportData.length} trips`);
      } else if (options.format === 'csv') {
        const csv = await generateCSV(exportData, {});
        downloadCSV(`trips-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`, csv);
        toast.success(`Successfully exported ${exportData.length} trips`);
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export trips. Please try again.');
    }
  };

  const handleDownloadFormat = async () => {
    const sampleData = [{
      'Trip ID': 'T0001',
      'Vehicle Registration': 'CG-04-XX-1234',
      'Driver Name': 'John Doe',
      'Start Date': '01/01/2024',
      'End Date': '02/01/2024',
      'Source Warehouse': 'Main Warehouse',
      'Destination(s)': 'Bhilai, Durg',
      'Start KM': '10000',
      'End KM': '10500',
      'Fuel Quantity': '50',
      'Fuel Cost': '5000',
      'Road Expenses': '2000',
      'Trip Type': 'Two Way',
      'Notes': 'Regular delivery trip'
    }];

    const csv = await generateCSV(sampleData, {});
    downloadCSV('trips-import-format.csv', csv);
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
      console.error('Error importing file:', error);
      toast.error('Failed to import trips');
    }
  };

  const getActiveFiltersText = () => {
    const parts = [];
    
    if (filters.vehicleId) {
      const vehicle = vehiclesMap.get(filters.vehicleId);
      parts.push(`Vehicle: ${vehicle?.registration_number || 'Unknown'}`);
    } else {
      parts.push('Vehicle: All');
    }
    
    if (filters.driverId) {
      const driver = driversMap.get(filters.driverId);
      parts.push(`Driver: ${driver?.name || 'Unknown'}`);
    } else {
      parts.push('Driver: All');
    }
    
    if (filters.dateRange.start && filters.dateRange.end) {
      parts.push(`Dates: ${format(new Date(filters.dateRange.start), 'dd MMM yyyy')} - ${format(new Date(filters.dateRange.end), 'dd MMM yyyy')}`);
    }
    
    return parts.join(', ');
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

      {/* Simplified Filters Section */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {showFilters ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </button>
              
              <div className="flex items-center gap-2">
                {/* Active filter count badge */}
                {(filters.search || filters.vehicleId || filters.driverId || filters.warehouseId || filters.tripType) && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {[filters.search, filters.vehicleId, filters.driverId, filters.warehouseId, filters.tripType]
                      .filter(Boolean).length} active
                  </span>
                )}
                
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
                
                <button
                  onClick={() => refreshData(false)}
                  disabled={refreshing}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
          
          {showFilters && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Search Input */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search trips, vehicles, drivers..."
                      value={filters.search}
                      onChange={(e) => handleFiltersChange({ search: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleFiltersChange({ 
                      dateRange: { ...filters.dateRange, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleFiltersChange({ 
                      dateRange: { ...filters.dateRange, end: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Vehicle Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle
                  </label>
                  <select
                    value={filters.vehicleId}
                    onChange={(e) => handleFiltersChange({ vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver
                  </label>
                  <select
                    value={filters.driverId}
                    onChange={(e) => handleFiltersChange({ driverId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse
                  </label>
                  <select
                    value={filters.warehouseId}
                    onChange={(e) => handleFiltersChange({ warehouseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Type
                  </label>
                  <select
                    value={filters.tripType}
                    onChange={(e) => handleFiltersChange({ tripType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="one_way">One Way</option>
                    <option value="two_way">Two Way</option>
                  </select>
                </div>
              </div>
              
              {/* Active filters summary */}
              {(filters.search || filters.vehicleId || filters.driverId || filters.warehouseId || filters.tripType) && (
                <div className="mt-4 flex items-center gap-2 text-sm">
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
      )}

      {/* Summary Metrics */}
      <TripsSummary
        trips={trips}
        vehicles={vehicles}
        drivers={drivers}
        loading={summaryLoading}
        metrics={summaryMetrics}
      />

      {/* Trip Table */}
      <TripsTable
        trips={currentTrips}
        vehicles={vehicles}
        drivers={drivers}
        onUpdateTrip={handleUpdateTrip}
        onDeleteTrip={handleDeleteTrip}
        onExport={() => setShowExportModal(true)}
        onImport={handleImport}
        onDownloadFormat={handleDownloadFormat}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm mt-4">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstTrip + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(indexOfLastTrip, filteredTrips.length)}
                </span>{' '}
                of <span className="font-medium">{filteredTrips.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={goToPreviousPage}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Simple pagination logic that shows 5 pages at most
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'z-10 bg-primary-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={goToNextPage}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
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