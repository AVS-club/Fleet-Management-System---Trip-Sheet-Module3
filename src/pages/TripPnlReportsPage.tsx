import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Trip, Vehicle, Driver, Warehouse } from '../types';
import { getTrips, getVehicles, getDrivers, getWarehouses } from '../utils/storage';
import { 
  Calendar, 
  ChevronDown, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RefreshCw, 
  Search, 
  Download, 
  IndianRupee,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  BarChart2,
  Target
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subWeeks, subMonths, subYears, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

interface PnLSummary {
  totalTrips: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  avgCostPerKm: number;
  profitableTrips: number;
  lossTrips: number;
}

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

interface DatePreset {
  label: string;
  getValue: () => { startDate: Date; endDate: Date };
}

const TripPnlReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedProfitStatus, setSelectedProfitStatus] = useState('');
  const [selectedDatePreset, setSelectedDatePreset] = useState('alltime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const datePresetOptions: DatePreset[] = [
    {
      label: 'Last 7 days',
      getValue: () => ({
        startDate: subDays(new Date(), 7),
        endDate: new Date()
      })
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        startDate: subDays(new Date(), 30),
        endDate: new Date()
      })
    },
    {
      label: 'This week',
      getValue: () => ({
        startDate: startOfWeek(new Date()),
        endDate: endOfWeek(new Date())
      })
    },
    {
      label: 'Last week',
      getValue: () => ({
        startDate: startOfWeek(subWeeks(new Date(), 1)),
        endDate: endOfWeek(subWeeks(new Date(), 1))
      })
    },
    {
      label: 'This month',
      getValue: () => ({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date())
      })
    },
    {
      label: 'Last month',
      getValue: () => ({
        startDate: startOfMonth(subMonths(new Date(), 1)),
        endDate: endOfMonth(subMonths(new Date(), 1))
      })
    },
    {
      label: 'This year',
      getValue: () => ({
        startDate: startOfYear(new Date()),
        endDate: endOfYear(new Date())
      })
    },
    {
      label: 'Last year',
      getValue: () => ({
        startDate: startOfYear(subYears(new Date(), 1)),
        endDate: endOfYear(subYears(new Date(), 1))
      })
    },
    {
      label: 'All Time',
      getValue: () => ({
        startDate: new Date('2020-01-01'),
        endDate: new Date()
      })
    }
  ];

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
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tripSummaryMetrics = useMemo((): TripSummaryMetrics => {
    const tripsArray = Array.isArray(trips) ? trips : [];
    const totalTrips = tripsArray.length;
    const totalDistance = tripsArray.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
    const totalExpenses = tripsArray.reduce((sum, trip) => sum + (trip.total_expense || 0), 0);
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
    
    // Calculate mean mileage from trips with valid kmpl
    const tripsWithMileage = tripsArray.filter(trip => trip.calculated_kmpl && !trip.short_trip);
    const meanMileage = tripsWithMileage.length > 0 
      ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length 
      : 0;
    
    // Find top driver by trip count
    const driverStats: Record<string, { tripCount: number; totalDistance: number; name: string }> = {};
    tripsArray.forEach(trip => {
      if (trip.driver_id) {
        if (!driverStats[trip.driver_id]) {
          const driver = drivers.find(d => d.id === trip.driver_id);
          driverStats[trip.driver_id] = {
            tripCount: 0,
            totalDistance: 0,
            name: driver?.name || 'Unknown'
          };
        }
        driverStats[trip.driver_id].tripCount++;
        driverStats[trip.driver_id].totalDistance += (trip.end_km - trip.start_km);
      }
    });
    
    const topDriver = Object.entries(driverStats)
      .sort((a, b) => b[1].tripCount - a[1].tripCount)[0];
    
    // Find top vehicle by trip count
    const vehicleStats: Record<string, { tripCount: number; registrationNumber: string }> = {};
    tripsArray.forEach(trip => {
      if (trip.vehicle_id) {
        if (!vehicleStats[trip.vehicle_id]) {
          const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
          vehicleStats[trip.vehicle_id] = {
            tripCount: 0,
            registrationNumber: vehicle?.registration_number || 'Unknown'
          };
        }
        vehicleStats[trip.vehicle_id].tripCount++;
      }
    });
    
    const topVehicle = Object.entries(vehicleStats)
      .sort((a, b) => b[1].tripCount - a[1].tripCount)[0];
    
    return {
      totalExpenses,
      avgDistance,
      tripCount: totalTrips,
      meanMileage,
      topDriver: topDriver ? {
        id: topDriver[0],
        name: topDriver[1].name,
        totalDistance: topDriver[1].totalDistance,
        tripCount: topDriver[1].tripCount
      } : null,
      topVehicle: topVehicle ? {
        id: topVehicle[0],
        registrationNumber: topVehicle[1].registrationNumber,
        tripCount: topVehicle[1].tripCount
      } : null
    };
  }, [trips, vehicles, drivers]);

  const dateRange = useMemo(() => {
    if (selectedDatePreset === 'custom') {
      return {
        startDate: customStartDate ? parseISO(customStartDate) : subDays(new Date(), 30),
        endDate: customEndDate ? parseISO(customEndDate) : new Date()
      };
    } else {
      const preset = datePresetOptions.find(option => option.label.toLowerCase().replace(/\s+/g, '') === selectedDatePreset);
      return preset ? preset.getValue() : datePresetOptions[1].getValue();
    }
  }, [selectedDatePreset, customStartDate, customEndDate]);

  // Filter trips based on current filters
  const filteredTrips = useMemo(() => {
    const filtered = trips.filter(trip => {
      // Date range filter
      const tripDate = parseISO(trip.trip_start_date);
      if (tripDate < dateRange.startDate || tripDate > dateRange.endDate) {
        return false;
      }

      // Search filter
      if (
        searchTerm &&
        !(trip.trip_serial_number || "").toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Vehicle filter
      if (selectedVehicle && trip.vehicle_id !== selectedVehicle) {
        return false;
      }

      // Driver filter
      if (selectedDriver && trip.driver_id !== selectedDriver) {
        return false;
      }

      // Warehouse filter
      if (selectedWarehouse && trip.warehouse_id !== selectedWarehouse) {
        return false;
      }

      // Profit status filter
      if (selectedProfitStatus && trip.profit_status !== selectedProfitStatus) {
        return false;
      }

      return true;
    });
    
    // Recalculate financial values for each filtered trip
    return filtered.map(trip => {
      // Calculate total expense from individual components
      const calculatedTotalExpense = (
        Number(trip.total_fuel_cost || 0) +
        Number(trip.unloading_expense || 0) +
        Number(trip.driver_expense || 0) +
        Number(trip.road_rto_expense || 0) +
        Number(trip.miscellaneous_expense || 0) +
        Number(trip.breakdown_expense || 0)
      );
      
      // Calculate income (skip if no income data)
      const income = Number(trip.income_amount) || 0;
      
      // Calculate net profit (only if income exists)
      const calculatedNetProfit = income > 0 ? income - calculatedTotalExpense : -calculatedTotalExpense;
      
      // Calculate cost per km
      const distance = (Number(trip.end_km) || 0) - (Number(trip.start_km) || 0);
      const calculatedCostPerKm = distance > 0 ? calculatedTotalExpense / distance : 0;
      
      // Determine profit status
      let calculatedProfitStatus: 'profit' | 'loss' | 'neutral';
      if (income > 0) {
        if (calculatedNetProfit > 0) {
          calculatedProfitStatus = 'profit';
        } else if (calculatedNetProfit < 0) {
          calculatedProfitStatus = 'loss';
        } else {
          calculatedProfitStatus = 'neutral';
        }
      } else {
        // If no income, default to loss since we have expenses
        calculatedProfitStatus = calculatedTotalExpense > 0 ? 'loss' : 'neutral';
      }
      
      // Return trip with recalculated financial values
      return {
        ...trip,
        total_expense: calculatedTotalExpense,
        net_profit: calculatedNetProfit,
        cost_per_km: calculatedCostPerKm,
        profit_status: calculatedProfitStatus
      };
    });
  }, [trips, dateRange, searchTerm, selectedVehicle, selectedDriver, selectedWarehouse, selectedProfitStatus]);

  // Calculate P&L summary directly from filtered trips
  const pnlSummary = useMemo((): PnLSummary => {
    const summary = filteredTrips.reduce((acc, trip) => {
      const income = Number(trip.income_amount) || 0;
      
      // Calculate total expense from individual components using total_fuel_cost
      const calculatedTotalExpense = (
        Number(trip.total_fuel_cost || 0) +
        Number(trip.unloading_expense || 0) +
        Number(trip.driver_expense || 0) +
        Number(trip.road_rto_expense || 0) +
        Number(trip.miscellaneous_expense || 0) +
        Number(trip.breakdown_expense || 0)
      );
      
      // Calculate profit from income minus calculated expenses
      const calculatedProfit = income - calculatedTotalExpense;
      
      // Calculate cost per km from calculated expenses
      const distance = (Number(trip.end_km) || 0) - (Number(trip.start_km) || 0);
      const calculatedCostPerKm = distance > 0 ? calculatedTotalExpense / distance : 0;

      acc.totalIncome += income;
      acc.totalExpense += calculatedTotalExpense;
      acc.netProfit += calculatedProfit;
      acc.avgCostPerKm += calculatedCostPerKm;

      // Determine profit status based on calculated profit
      if (calculatedProfit > 0) {
        acc.profitableTrips++;
      } else if (calculatedProfit < 0) {
        acc.lossTrips++;
      }

      return acc;
    }, {
      totalTrips: filteredTrips.length,
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      profitMargin: 0,
      avgCostPerKm: 0,
      profitableTrips: 0,
      lossTrips: 0
    });

    summary.avgCostPerKm = filteredTrips.length > 0 ? summary.avgCostPerKm / filteredTrips.length : 0;
    summary.profitMargin = summary.totalIncome > 0 ? (summary.netProfit / summary.totalIncome) * 100 : 0;

    return summary;
  }, [filteredTrips]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicle('');
    setSelectedDriver('');
    setSelectedWarehouse('');
    setSelectedProfitStatus('');
    setSelectedDatePreset('alltime');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const exportToExcel = () => {
    const exportData = filteredTrips.map(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      const driver = drivers.find(d => d.id === trip.driver_id);
      const warehouse = warehouses.find(w => w.id === trip.warehouse_id);

      return {
        'Trip ID': trip.trip_serial_number,
        'Date': format(parseISO(trip.trip_start_date), 'dd/MM/yyyy'),
        'Vehicle': vehicle?.registration_number || 'N/A',
        'Driver': driver?.name || 'N/A',
        'Warehouse': warehouse?.name || 'N/A',
        'Income (₹)': trip.income_amount || 0,
        'Total Expense (₹)': trip.total_expense || 0,
        'Net Profit (₹)': trip.net_profit || 0,
        'Cost per KM (₹)': trip.cost_per_km || 0,
        'Profit Status': trip.profit_status || 'N/A',
        'Billing Type': trip.billing_type || 'N/A',
        'Freight Rate': trip.freight_rate || 0,
        'Distance (KM)': (trip.end_km || 0) - (trip.start_km || 0)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trip P&L Report');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = `trip-pnl-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    saveAs(data, fileName);
    
    toast.success('Report exported successfully');
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.registration_number || 'N/A';
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || 'N/A';
  };

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || 'N/A';
  };

  const getProfitStatusColor = (status: string) => {
    switch (status) {
      case 'profit':
        return 'text-green-600 bg-green-50';
      case 'loss':
        return 'text-red-600 bg-red-50';
      case 'neutral':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Layout title="Trip P&L Report" subtitle="Analyze profitability of trips">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Trip P&L Report"
      subtitle="Analyze profitability of trips"
      actions={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportToExcel}
            icon={<Download className="h-4 w-4" />}
            disabled={filteredTrips.length === 0}
          >
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/trips')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Trips
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalIncome.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expense</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalExpense.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold flex items-center ${
                  pnlSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.netProfit.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {pnlSummary.profitMargin.toFixed(1)}% margin
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                pnlSummary.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <DollarSign className={`h-6 w-6 ${
                  pnlSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900">{pnlSummary.totalTrips}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {pnlSummary.profitableTrips} profitable, {pnlSummary.lossTrips} loss
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center border-l-2 border-blue-500 pl-2">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                icon={<X className="h-4 w-4" />}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />}
              >
                {showFilters ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Trip ID
                </label>
                <Input
                  type="text"
                  placeholder="Enter trip ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <Select
                  value={selectedDatePreset}
                  onChange={(e) => setSelectedDatePreset(e.target.value)}
                  options={[
                    ...datePresetOptions.map(option => ({
                      value: option.label.toLowerCase().replace(/\s+/g, ''),
                      label: option.label
                    })),
                    { value: 'custom', label: 'Custom Range' }
                  ]}
                />
              </div>

              {selectedDatePreset === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle
                </label>
                <Select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  options={[
                    { value: '', label: 'All Vehicles' },
                    ...vehicles.map(vehicle => ({
                      value: vehicle.id,
                      label: vehicle.registration_number
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver
                </label>
                <Select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  options={[
                    { value: '', label: 'All Drivers' },
                    ...drivers.map(driver => ({
                      value: driver.id,
                      label: driver.name
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse
                </label>
                <Select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  options={[
                    { value: '', label: 'All Warehouses' },
                    ...warehouses.map(warehouse => ({
                      value: warehouse.id,
                      label: warehouse.name
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profit Status
                </label>
                <Select
                  value={selectedProfitStatus}
                  onChange={(e) => setSelectedProfitStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'profit', label: 'Profit' },
                    { value: 'loss', label: 'Loss' },
                    { value: 'neutral', label: 'Neutral' }
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Trips Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Trip Details ({filteredTrips.length} trips)
            </h3>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters to see more results.</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trip Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle & Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Financial Summary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trip.trip_serial_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(parseISO(trip.trip_start_date), 'dd MMM yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {((trip.end_km || 0) - (trip.start_km || 0))} km
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getVehicleName(trip.vehicle_id)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getDriverName(trip.driver_id)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getWarehouseName(trip.warehouse_id)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Income:</span>
                            <span className="font-medium text-green-600">
                              ₹{(trip.income_amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Expense:</span>
                            <span className="font-medium text-red-600">
                              ₹{(trip.total_expense || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t pt-1">
                            <span className="text-gray-900">Profit:</span>
                            <span className={
                              (trip.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }>
                              ₹{(trip.net_profit || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getProfitStatusColor(trip.profit_status || '')
                        }`}>
                          {trip.profit_status || 'N/A'}
                        </span>
                        {trip.billing_type && (
                          <div className="text-xs text-gray-500 mt-1">
                            {trip.billing_type}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TripPnlReportsPage;