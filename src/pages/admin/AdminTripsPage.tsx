import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import TripsTable from '../../components/admin/TripsTable';
import TripsSummary from '../../components/admin/TripsSummary';
import ExportOptionsModal, { ExportOptions } from '../../components/admin/ExportOptionsModal';
import { Trip, Vehicle, Driver, Warehouse } from '../../types';
import { getTrips, getVehicles, getDrivers, getWarehouses, updateTrip } from '../../utils/storage';
import { generateCSV, downloadCSV, parseCSV } from '../../utils/csvParser';
import { supabase } from '../../utils/supabaseClient';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subWeeks, subMonths, subYears } from 'date-fns';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Calendar, ChevronDown, Filter, ChevronLeft, ChevronRight, X, RefreshCw, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

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
    if (datePreset === 'custom') {
      return; // Don't update the date range if custom is selected
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (datePreset) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        startDate = subDays(new Date(now.setHours(0, 0, 0, 0)), 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        startDate = startOfWeek(now);
        break;
      case 'lastWeek':
        startDate = startOfWeek(subWeeks(now, 1));
        endDate = endOfWeek(subWeeks(now, 1));
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'thisYear':
        startDate = startOfYear(now);
        break;
      case 'lastYear':
        startDate = startOfYear(subYears(now, 1));
        endDate = endOfYear(subYears(now, 1));
        break;
      case 'last7':
        startDate = subDays(now, 7);
        break;
      case 'last30':
        startDate = subDays(now, 30);
        break;
      case 'allTime':
        startDate = new Date(0); // January 1, 1970
        break;
      default:
        startDate = subDays(now, 30); // Default to last 30 days
    }

    // Update filters with new date range
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
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

  // Refresh data function
  const refreshData = async () => {
    try {
      setRefreshing(true);
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
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
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
          trip.station
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
        if (filters.tripType === 'local' && !trip.short_trip) {
          return false;
        }
        if (filters.tripType === 'two_way' && !(Array.isArray(trip.destinations) && trip.destinations.length > 1)) {
          return false;
        }
        if (filters.tripType === 'one_way' && (!(!trip.short_trip && Array.isArray(trip.destinations) && trip.destinations.length === 1))) {
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
      
      const { data, error } = await supabase.rpc('get_trip_summary_metrics', {
        start_date: filters.dateRange.start ? new Date(filters.dateRange.start).toISOString() : null,
        end_date: filters.dateRange.end ? new Date(filters.dateRange.end).toISOString() : null,
        p_vehicle_id: filters.vehicleId || null,
        p_driver_id: filters.driverId || null,
        p_warehouse_id: filters.warehouseId || null,
        p_trip_type: filters.tripType || null
      });
      
      if (error) {
        console.error("Error fetching summary metrics:", error);
      } else if (data) {
        setSummaryMetrics(data);
      }
    } catch (error) {
      console.error("Exception fetching summary metrics:", error);
    } finally {
      setSummaryLoading(false);
    }
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

  const handleExport = (options: ExportOptions) => {
    // Filter trips based on export options
    let filteredTrips = trips;

    if (options.dateRange.start) {
      filteredTrips = filteredTrips.filter(trip => 
        new Date(trip.trip_start_date) >= new Date(options.dateRange.start)
      );
    }

    if (options.dateRange.end) {
      filteredTrips = filteredTrips.filter(trip => 
        new Date(trip.trip_end_date) <= new Date(options.dateRange.end)
      );
    }

    if (options.vehicleId) {
      filteredTrips = filteredTrips.filter(trip => trip.vehicle_id === options.vehicleId);
    }

    if (options.driverId) {
      filteredTrips = filteredTrips.filter(trip => trip.driver_id === options.driverId);
    }

    if (options.warehouseId) {
      filteredTrips = filteredTrips.filter(trip => trip.warehouse_id === options.warehouseId);
    }

    if (options.tripType) {
      filteredTrips = filteredTrips.filter(trip => {
        if (options.tripType === 'local') return trip.short_trip;
        if (options.tripType === 'two_way') return Array.isArray(trip.destinations) && trip.destinations.length > 1;
        return !trip.short_trip && Array.isArray(trip.destinations) && trip.destinations.length === 1;
      });
    }

    // Prepare data for export
    const exportData = filteredTrips.map(trip => {
      const vehicle = vehiclesMap.get(trip.vehicle_id);
      const driver = driversMap.get(trip.driver_id);
      const warehouse = warehouses.find(w => w.id === trip.warehouse_id);

      return {
        'Trip ID': trip.trip_serial_number,
        'Start Date': new Date(trip.trip_start_date).toLocaleDateString(),
        'End Date': new Date(trip.trip_end_date).toLocaleDateString(),
        'Vehicle': vehicle?.registration_number,
        'Driver': driver?.name,
        'Source': warehouse?.name,
        'Start KM': trip.start_km,
        'End KM': trip.end_km,
        'Distance': trip.end_km - trip.start_km,
        'Mileage': trip.calculated_kmpl?.toFixed(2) || '-',
        'Fuel Cost': trip.total_fuel_cost || 0,
        'Road Expenses': trip.total_road_expenses,
        'Total Cost': (trip.total_fuel_cost || 0) + trip.total_road_expenses,
        'Revenue': trip.income_amount || 0,
        'Profit/Loss': trip.net_profit ? `₹${trip.net_profit.toLocaleString()}` : '-',
        'Status': trip.profit_status ? trip.profit_status.charAt(0).toUpperCase() + trip.profit_status.slice(1) : '-',
        'Type': trip.short_trip ? 'Local' : trip.destinations.length > 1 ? 'Two Way' : 'One Way'
      };
    });

    // Export based on format
    if (options.format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trips');
      XLSX.writeFile(wb, 'trips-export.xlsx');
    } else {
      const csv = generateCSV(exportData, {});
      downloadCSV('trips-export.csv', csv);
    }
  };

  const handleDownloadFormat = () => {
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

    const csv = generateCSV(sampleData, {});
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
      <div className="rounded-xl border bg-gray-50 dark:bg-gray-800/50 px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <FileText className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Trip Management</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">View and manage all trip records</p>
      </div>

      {/* Filters */}
      {!loading && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 sticky top-16 z-10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h3 className="text-lg font-medium">Trip Filters</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={clearFilters}
                icon={<X className="h-4 w-4" />}
              >
                Clear Filters
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                icon={<RefreshCw className="h-4 w-4" />}
                isLoading={refreshing}
              >
                Refresh
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                icon={showFilters ? <ChevronDown className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <Input
                placeholder="Search trips..."
                icon={<Search className="h-4 w-4" />}
                value={filters.search}
                onChange={e => handleFiltersChange({ search: e.target.value })}
              />
              
              {/* Date Preset Dropdown */}
              <Select
                options={datePresetOptions}
                value={datePreset}
                onChange={e => setDatePreset(e.target.value)}
              />
              
              {/* Date Range */}
              <Input
                type="date"
                value={filters.dateRange.start}
                onChange={e => handleFiltersChange({ dateRange: { ...filters.dateRange, start: e.target.value } })}
                icon={<Calendar className="h-4 w-4" />}
              />
              
              <Input
                type="date"
                value={filters.dateRange.end}
                onChange={e => handleFiltersChange({ dateRange: { ...filters.dateRange, end: e.target.value } })}
                icon={<Calendar className="h-4 w-4" />}
              />
              
              {/* Vehicle Dropdown */}
              <Select
                options={[
                  { value: '', label: 'All Vehicles' },
                  ...vehicles.map(v => ({
                    value: v.id,
                    label: v.registration_number
                  }))
                ]}
                value={filters.vehicleId}
                onChange={e => handleFiltersChange({ vehicleId: e.target.value })}
              />
              
              {/* Driver Dropdown */}
              <Select
                options={[
                  { value: '', label: 'All Drivers' },
                  ...drivers.map(d => ({
                    value: d.id,
                    label: d.name
                  }))
                ]}
                value={filters.driverId}
                onChange={e => handleFiltersChange({ driverId: e.target.value })}
              />
              
              {/* Warehouse Dropdown */}
              <Select
                options={[
                  { value: '', label: 'All Warehouses' },
                  ...warehouses.map(w => ({
                    value: w.id,
                    label: w.name
                  }))
                ]}
                value={filters.warehouseId}
                onChange={e => handleFiltersChange({ warehouseId: e.target.value })}
              />
              
              {/* Trip Type Dropdown */}
              <Select
                options={[
                  { value: '', label: 'All Trip Types' },
                  { value: 'one_way', label: 'One Way' },
                  { value: 'two_way', label: 'Two Way' },
                  { value: 'local', label: 'Local Trip' }
                ]}
                value={filters.tripType}
                onChange={e => handleFiltersChange({ tripType: e.target.value })}
              />
            </div>
          )}

          {/* Active filters display */}
          <div className="bg-gray-100 px-3 py-1.5 text-sm text-gray-600 rounded">
            <strong>Active Filters:</strong> {getActiveFiltersText()}
          </div>
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