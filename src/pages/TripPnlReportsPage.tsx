import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Trip, Vehicle, Driver, Warehouse } from '../types';
import { getTrips, getVehicles, getDrivers, getWarehouses } from '../utils/storage';
import { Calendar, ChevronDown, Filter, ChevronLeft, ChevronRight, X, RefreshCw, Search, Download, IndianRupee } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subWeeks, subMonths, subYears } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

const TripPnlReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Date preset state
  const [datePreset, setDatePreset] = useState('last30');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 25; // 25 trips per page

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    vehicleId: '',
    driverId: '',
    warehouseId: '',
    profitStatus: '',
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

  // P&L Summary Metrics
  const [pnlSummary, setPnlSummary] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    profitableTrips: 0,
    lossTrips: 0,
    breakEvenTrips: 0
  });

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
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate P&L summary metrics when filtered trips change
  useEffect(() => {
    calculatePnlSummary(filteredTrips);
  }, [filteredTrips]);

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
      
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate P&L summary
  const calculatePnlSummary = (trips: Trip[]) => {
    const summary = trips.reduce((acc, trip) => {
      // Only include trips with P&L data
      if (trip.income_amount !== undefined && trip.total_expense !== undefined) {
        acc.totalRevenue += Number(trip.income_amount) || 0;
        acc.totalExpense += Number(trip.total_expense) || 0;
        acc.netProfit += Number(trip.net_profit) || 0;
        
        if (trip.profit_status === 'profit') {
          acc.profitableTrips++;
        } else if (trip.profit_status === 'loss') {
          acc.lossTrips++;
        } else {
          acc.breakEvenTrips++;
        }
      }
      
      return acc;
    }, {
      totalRevenue: 0,
      totalExpense: 0,
      netProfit: 0,
      profitableTrips: 0,
      lossTrips: 0,
      breakEvenTrips: 0
    });
    
    setPnlSummary(summary);
  };

  // Filter trips based on current filters
  const filteredTrips = React.useMemo(() => {
    return trips.filter(trip => {
      // Skip trips without P&L data
      if (trip.income_amount === undefined || trip.total_expense === undefined) {
        return false;
      }
      
      // Search filter
      if (filters.search) {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        const driver = drivers.find(d => d.id === trip.driver_id);
        
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          trip.trip_serial_number,
          vehicle?.registration_number,
          driver?.name,
          trip.station,
          trip.net_profit?.toString()
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

      // Profit status filter
      if (filters.profitStatus && trip.profit_status !== filters.profitStatus) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());
  }, [trips, vehicles, drivers, filters]);

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

  // Handle filters change
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
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      dateRange: {
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      },
      vehicleId: '',
      driverId: '',
      warehouseId: '',
      profitStatus: '',
      search: ''
    });
    setDatePreset('last30');
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      
      // Prepare data for export
      const exportData = filteredTrips.map(trip => {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        const driver = drivers.find(d => d.id === trip.driver_id);
        const warehouse = warehouses.find(w => w.id === trip.warehouse_id);
        
        return {
          'Trip ID': trip.trip_serial_number,
          'Date': new Date(trip.trip_start_date).toLocaleDateString(),
          'Vehicle': vehicle?.registration_number || 'Unknown',
          'Driver': driver?.name || 'Unknown',
          'Distance': trip.end_km - trip.start_km,
          'Revenue': `₹${(trip.income_amount || 0).toLocaleString()}`,
          'Expenses': `₹${(trip.total_expense || 0).toLocaleString()}`,
          'Profit/Loss': `₹${(trip.net_profit || 0).toLocaleString()}`,
          'Profit per KM': `₹${trip.cost_per_km ? (trip.net_profit && trip.net_profit > 0 ? 
                           (trip.net_profit / (trip.end_km - trip.start_km)).toFixed(2) : 
                           '0.00') : '0.00'}`,
          'Status': trip.profit_status ? trip.profit_status.charAt(0).toUpperCase() + trip.profit_status.slice(1) : '-'
        };
      });
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trip P&L Report');
      
      // Generate file name with date range
      const startDate = format(new Date(filters.dateRange.start), 'yyyyMMdd');
      const endDate = format(new Date(filters.dateRange.end), 'yyyyMMdd');
      const fileName = `Trip_PnL_Report_${startDate}_to_${endDate}.xlsx`;
      
      // Export to Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
      
      toast.success(`Exported ${exportData.length} trips to Excel`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Get profit status color class
  const getProfitStatusColor = (status?: 'profit' | 'loss' | 'neutral') => {
    if (!status) return '';
    
    switch (status) {
      case 'profit':
        return 'text-success-600';
      case 'loss':
        return 'text-error-600';
      case 'neutral':
        return 'text-gray-500';
      default:
        return '';
    }
  };

  return (
    <Layout
      title="Trip P&L Report"
      subtitle="Analyze profitability of trips"
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/trips')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Trips
        </Button>
      }
    >
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 sticky top-16 z-10">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h3 className="text-lg font-medium">P&L Report Filters</h3>
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

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportExcel}
              icon={<Download className="h-4 w-4" />}
              isLoading={exportLoading}
            >
              Export Excel
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <Input
              placeholder="Search trips..."
              icon={<Search className="h-4 w-4" />}
              value={filters.search}
              onChange={e => handleFiltersChange({ search: e.target.value })}
              className="md:col-span-2"
            />
            
            {/* Date Preset Dropdown */}
            <Select
              options={datePresetOptions}
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
            />
            
            {/* Date Range */}
            {datePreset === 'custom' && (
              <>
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
              </>
            )}
            
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
            
            {/* Profit Status Dropdown */}
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'profit', label: 'Profit' },
                { value: 'loss', label: 'Loss' },
                { value: 'neutral', label: 'Break-even' }
              ]}
              value={filters.profitStatus}
              onChange={e => handleFiltersChange({ profitStatus: e.target.value })}
            />
          </div>
        )}

        {/* Filter Results Summary */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center bg-gray-50 p-3 rounded-lg">
          <span className="font-medium text-gray-600">Showing {filteredTrips.length} trips</span>
          <div className="flex flex-wrap gap-3 sm:ml-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="font-medium text-success-600">₹{pnlSummary.totalRevenue.toLocaleString()}</span>
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="font-medium text-error-600">₹{pnlSummary.totalExpense.toLocaleString()}</span>
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className={`font-medium ${pnlSummary.netProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                ₹{pnlSummary.netProfit.toLocaleString()}
              </span>
              <span>Net Profit</span>
            </div>
          </div>
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h3 className="text-xl font-bold text-gray-900">₹{pnlSummary.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="bg-green-50 p-2 rounded-full">
              <IndianRupee className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <h3 className="text-xl font-bold text-gray-900">₹{pnlSummary.totalExpense.toLocaleString()}</h3>
            </div>
            <div className="bg-red-50 p-2 rounded-full">
              <IndianRupee className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Profit/Loss</p>
              <h3 className={`text-xl font-bold ${pnlSummary.netProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                ₹{pnlSummary.netProfit.toLocaleString()}
              </h3>
            </div>
            <div className={`${pnlSummary.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} p-2 rounded-full`}>
              <IndianRupee className={`h-6 w-6 ${pnlSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* P&L Trip Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit/Loss
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit/KM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600">Loading trips...</span>
                    </div>
                  </td>
                </tr>
              ) : currentTrips.length > 0 ? (
                currentTrips.map((trip) => {
                  const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
                  const driver = drivers.find(d => d.id === trip.driver_id);
                  const distance = trip.end_km - trip.start_km;
                  const profitPerKm = distance > 0 && trip.net_profit ? trip.net_profit / distance : 0;

                  return (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {trip.trip_serial_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(trip.trip_start_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {vehicle?.registration_number || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {driver?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {distance.toLocaleString()} km
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-success-600">
                          ₹{(trip.income_amount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-error-600">
                          ₹{(trip.total_expense || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getProfitStatusColor(trip.profit_status)}`}>
                          ₹{(trip.net_profit || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getProfitStatusColor(trip.profit_status)}`}>
                          ₹{profitPerKm.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full 
                          ${trip.profit_status === 'profit' ? 'bg-success-100 text-success-800' : 
                            trip.profit_status === 'loss' ? 'bg-error-100 text-error-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {trip.profit_status ? trip.profit_status.charAt(0).toUpperCase() + trip.profit_status.slice(1) : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-500">
                    No trips with P&L data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </Layout>
  );
};

export default TripPnlReportsPage;