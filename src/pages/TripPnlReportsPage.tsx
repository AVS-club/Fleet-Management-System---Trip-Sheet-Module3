import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePermissions } from '../hooks/usePermissions';
import { Trip, Vehicle, Driver, Warehouse } from '@/types';
import { getTrips, getVehicles, getWarehouses } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
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
  Target,
  Eye,
  Printer,
  ArrowUpDown,
  MoreHorizontal,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subWeeks, subMonths, subYears, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

interface PnLSummary {
  totalTrips: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  avgCostPerKm: number;
  profitableTrips: number;
  lossTrips: number;
  previousPeriodIncome?: number;
  previousPeriodExpense?: number;
  previousPeriodProfit?: number;
  incomeGrowth?: number;
  expenseGrowth?: number;
  profitGrowth?: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface TrendData {
  date: string;
  income: number;
  expense: number;
  profit: number;
  trips: number;
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
  const { permissions, loading: permissionsLoading } = usePermissions();
  
  // Add error state for debugging
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
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
  
  // Enhanced UI state
  const [showCharts, setShowCharts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Trip>('trip_start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);

  // Permission checks will be moved after all hooks

  // ...rest of component logic

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
      setError(null);
      setDebugInfo(null);
      
      console.log('Loading PNL Reports data...');

      const [tripsData, vehiclesData, driversData, warehousesData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
        getWarehouses()
      ]);
      
      console.log('Data loaded successfully:', {
        trips: tripsData.length,
        vehicles: vehiclesData.length,
        drivers: driversData.length,
        warehouses: warehousesData.length
      });
      
      setTrips(tripsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error("Error fetching PNL Reports data:", error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setDebugInfo({
        error: error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
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
    const tripsWithMileage = tripsArray.filter(trip => trip.calculated_kmpl);
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
    try {
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
    
    return filtered;
    } catch (error) {
      console.error('Error filtering trips:', error);
      return [];
    }
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

  // Prepare chart data
  const chartData = useMemo(() => {
    try {
      // Profit/Loss distribution pie chart
      const profitLossData: ChartData[] = [
        { name: 'Profitable Trips', value: pnlSummary.profitableTrips, color: '#10B981' },
        { name: 'Loss Trips', value: pnlSummary.lossTrips, color: '#EF4444' }
      ];

    // Monthly trend data
    const monthlyTrend: TrendData[] = [];
    const monthlyData = new Map<string, { income: number; expense: number; profit: number; trips: number }>();
    
    filteredTrips.forEach(trip => {
      const month = format(parseISO(trip.trip_start_date), 'MMM yyyy');
      const income = Number(trip.income_amount) || 0;
      const expense = Number(trip.total_expense) || 0;
      const profit = income - expense;
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { income: 0, expense: 0, profit: 0, trips: 0 });
      }
      
      const data = monthlyData.get(month)!;
      data.income += income;
      data.expense += expense;
      data.profit += profit;
      data.trips += 1;
    });

    monthlyData.forEach((data, month) => {
      monthlyTrend.push({
        date: month,
        income: data.income,
        expense: data.expense,
        profit: data.profit,
        trips: data.trips
      });
    });

    // Vehicle performance data
    const vehiclePerformance: ChartData[] = [];
    const vehicleData = new Map<string, { profit: number; trips: number }>();
    
    filteredTrips.forEach(trip => {
      const vehicleId = trip.vehicle_id;
      const vehicleName = getVehicleName(vehicleId);
      const income = Number(trip.income_amount) || 0;
      const expense = Number(trip.total_expense) || 0;
      const profit = income - expense;
      
      if (!vehicleData.has(vehicleId)) {
        vehicleData.set(vehicleId, { profit: 0, trips: 0 });
      }
      
      const data = vehicleData.get(vehicleId)!;
      data.profit += profit;
      data.trips += 1;
    });

    vehicleData.forEach((data, vehicleId) => {
      const vehicleName = getVehicleName(vehicleId);
      vehiclePerformance.push({
        name: vehicleName,
        value: data.profit,
        color: data.profit >= 0 ? '#10B981' : '#EF4444'
      });
    });

      return {
        profitLossData,
        monthlyTrend: monthlyTrend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        vehiclePerformance: vehiclePerformance.slice(0, 10) // Top 10 vehicles
      };
    } catch (error) {
      console.error('Error preparing chart data:', error);
      // Return empty data structure to prevent crashes
      return {
        profitLossData: [],
        monthlyTrend: [],
        vehiclePerformance: []
      };
    }
  }, [filteredTrips, pnlSummary]);

  // Pagination
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTrips.slice(startIndex, endIndex);
  }, [filteredTrips, currentPage, itemsPerPage]);

  // Sorting
  const sortedTrips = useMemo(() => {
    return [...paginatedTrips].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [paginatedTrips, sortField, sortDirection]);

  // ✅ PERMISSION CHECKS AFTER ALL HOOKS
  if (permissionsLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  // Redirect non-owner users - FIXED: use correct permission property
  if (!permissions?.canAccessReports) {
    return <Navigate to="/vehicles" replace />;
  }

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicle('');
    setSelectedDriver('');
    setSelectedWarehouse('');
    setSelectedProfitStatus('');
    setSelectedDatePreset('alltime');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  const handleSort = (field: keyof Trip) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowTripModal(true);
  };

  const printReport = () => {
    window.print();
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

  // Show error state if there's an error
  if (error) {
    return (
      <Layout title="Trip P&L Report" subtitle="Analyze profitability of trips">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-800">Error Loading PNL Reports</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            
            {debugInfo && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-red-600 mb-2">
                  Debug Information
                </summary>
                <pre className="text-xs bg-red-100 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setError(null);
                  setDebugInfo(null);
                  fetchData();
                }}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/trips')}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Back to Trips
              </Button>
            </div>
          </div>
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
            onClick={() => setShowCharts(!showCharts)}
            icon={showCharts ? <BarChart3 className="h-4 w-4" /> : <LineChart className="h-4 w-4" />}
          >
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </Button>
          <Button
            variant="outline"
            onClick={printReport}
            icon={<Printer className="h-4 w-4" />}
            disabled={filteredTrips.length === 0}
          >
            Print
          </Button>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center mb-2">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalIncome.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">+12.5%</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Expense</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center mb-2">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalExpense.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-red-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">+8.2%</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold flex items-center mb-2 ${
                  pnlSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.netProfit.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center ${pnlSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{pnlSummary.profitMargin.toFixed(1)}%</span>
                  </div>
                  <span className="text-xs text-gray-500">margin</span>
                </div>
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">{pnlSummary.totalTrips}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-blue-600">
                    <Activity className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">
                      {((pnlSummary.profitableTrips / pnlSummary.totalTrips) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">success rate</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-blue-600" />
                  Monthly Trend
                </h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `₹${value.toLocaleString('en-IN')}`, 
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stackId="1" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      stackId="2" 
                      stroke="#EF4444" 
                      fill="#EF4444" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit/Loss Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-green-600" />
                  Trip Distribution
                </h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData.profitLossData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.profitLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vehicle Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                  Vehicle Performance
                </h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData.vehiclePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Profit']}
                    />
                    <Bar dataKey="value" fill="#8884d8">
                      {chartData.vehiclePerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

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
                inputSize="sm"
                onClick={clearFilters}
                icon={<X className="h-4 w-4" />}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                inputSize="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Filters:</span>
              <button
                onClick={() => setSelectedProfitStatus('profit')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedProfitStatus === 'profit'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Profitable Only
              </button>
              <button
                onClick={() => setSelectedProfitStatus('loss')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedProfitStatus === 'loss'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Loss Only
              </button>
              <button
                onClick={() => setSelectedDatePreset('last7days')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDatePreset === 'last7days'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setSelectedDatePreset('last30days')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDatePreset === 'last30days'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setSelectedDatePreset('thismonth')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDatePreset === 'thismonth'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Trip Details ({filteredTrips.length} trips)
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <Select
                    value={itemsPerPage.toString()}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' }
                    ]}
                    inputSize="sm"
                  />
                </div>
              </div>
            </div>
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('trip_serial_number')}
                    >
                      <div className="flex items-center gap-1">
                        Trip Details
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('vehicle_id')}
                    >
                      <div className="flex items-center gap-1">
                        Vehicle & Driver
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('income_amount')}
                    >
                      <div className="flex items-center gap-1">
                        Financial Summary
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleTripClick(trip)}>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            inputSize="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTripClick(trip);
                            }}
                            icon={<Eye className="h-3 w-3" />}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {filteredTrips.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrips.length)} of {filteredTrips.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    inputSize="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    icon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredTrips.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === Math.ceil(filteredTrips.length / itemsPerPage) ||
                        Math.abs(page - currentPage) <= 2
                      )
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "primary" : "outline"}
                            inputSize="sm"
                            onClick={() => handlePageChange(page)}
                            className="min-w-[40px]"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))
                    }
                  </div>
                  
                  <Button
                    variant="outline"
                    inputSize="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredTrips.length / itemsPerPage)}
                    icon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trip Detail Modal */}
      {showTripModal && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Trip Details - {selectedTrip.trip_serial_number}
                </h3>
                <Button
                  variant="outline"
                  inputSize="sm"
                  onClick={() => setShowTripModal(false)}
                  icon={<X className="h-4 w-4" />}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trip Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Trip Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trip ID:</span>
                      <span className="font-medium">{selectedTrip.trip_serial_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{format(parseISO(selectedTrip.trip_start_date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium">{((selectedTrip.end_km || 0) - (selectedTrip.start_km || 0))} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium">{getVehicleName(selectedTrip.vehicle_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Driver:</span>
                      <span className="font-medium">{getDriverName(selectedTrip.driver_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Warehouse:</span>
                      <span className="font-medium">{getWarehouseName(selectedTrip.warehouse_id)}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Financial Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Income:</span>
                      <span className="font-medium text-green-600">
                        ₹{(selectedTrip.income_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expense:</span>
                      <span className="font-medium text-red-600">
                        ₹{(selectedTrip.total_expense || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-900 font-medium">Net Profit:</span>
                      <span className={`font-bold ${
                        (selectedTrip.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{(selectedTrip.net_profit || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost per KM:</span>
                      <span className="font-medium">
                        ₹{(selectedTrip.cost_per_km || 0).toFixed(2)}/km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Billing Type:</span>
                      <span className="font-medium">{selectedTrip.billing_type || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 border-b pb-2 mb-4">Expense Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Fuel Cost</p>
                    <p className="font-medium">₹{(selectedTrip.total_fuel_cost || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Driver Expense</p>
                    <p className="font-medium">₹{(selectedTrip.driver_expense || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Unloading</p>
                    <p className="font-medium">₹{(selectedTrip.unloading_expense || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Road/RTO</p>
                    <p className="font-medium">₹{(selectedTrip.road_rto_expense || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Miscellaneous</p>
                    <p className="font-medium">₹{(selectedTrip.miscellaneous_expense || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Breakdown</p>
                    <p className="font-medium">₹{(selectedTrip.breakdown_expense || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TripPnlReportsPage;