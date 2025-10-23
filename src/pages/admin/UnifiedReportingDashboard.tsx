import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Users,
  Truck,
  DollarSign,
  Package,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  FileText,
  Fuel,
  MapPin,
  Clock,
  Wrench,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { createLogger } from '../../utils/logger';

const logger = createLogger('UnifiedReportingDashboard');

interface ReportMetrics {
  totalRevenue: number;
  totalTrips: number;
  activeVehicles: number;
  activeDrivers: number;
  avgTripDistance: number;
  avgFuelEfficiency: number;
  maintenanceCosts: number;
  pendingMaintenance: number;
}

interface ChartData {
  tripTrends: Array<{ date: string; trips: number; revenue: number }>;
  vehicleUtilization: Array<{ vehicle: string; trips: number; utilization: number }>;
  driverPerformance: Array<{ driver: string; trips: number; efficiency: number }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
}

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'operations' | 'financial' | 'maintenance' | 'compliance' | 'comparison';
}

const UnifiedReportingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalTrips: 0,
    activeVehicles: 0,
    activeDrivers: 0,
    avgTripDistance: 0,
    avgFuelEfficiency: 0,
    maintenanceCosts: 0,
    pendingMaintenance: 0
  });

  const [chartData, setChartData] = useState<ChartData>({
    tripTrends: [],
    vehicleUtilization: [],
    driverPerformance: [],
    expenseBreakdown: []
  });

  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });

  const [selectedDateRange, setSelectedDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);

  // Helper functions for comparison reports
  const calculateMetrics = (trips: any[]) => {
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km || 0), 0);
    const totalRevenue = trips.reduce((sum, trip) => sum + ((trip.end_km - trip.start_km || 0) * 10), 0);
    const totalExpenses = trips.reduce((sum, trip) => 
      sum + (trip.total_fuel_cost || 0) + 
      (trip.total_road_expenses || 0) + 
      (trip.driver_expense || 0) +
      (trip.unloading_expense || 0) +
      (trip.breakdown_expense || 0) +
      (trip.miscellaneous_expense || 0), 0
    );
    const fuelCosts = trips.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0);
    const avgTripDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
    
    return {
      totalTrips,
      totalDistance: Math.round(totalDistance),
      totalRevenue: Math.round(totalRevenue),
      totalExpenses: Math.round(totalExpenses),
      fuelCosts: Math.round(fuelCosts),
      avgTripDistance: Math.round(avgTripDistance)
    };
  };

  const calculatePercentChange = (oldValue: number, newValue: number): string => {
    if (oldValue === 0) return newValue > 0 ? '+100%' : '0%';
    const change = ((newValue - oldValue) / oldValue) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const reportTypes: ReportType[] = [
    // Smart Comparison Reports
    {
      id: 'week-comparison',
      name: 'Weekly Comparison',
      description: 'This week vs last week',
      icon: <TrendingUp className="h-4 w-4" />,
      category: 'comparison'
    },
    {
      id: 'month-comparison',
      name: 'Monthly Comparison',
      description: 'Month-over-month analysis',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'comparison'
    },
    {
      id: 'year-comparison',
      name: 'Yearly Comparison',
      description: 'Year-over-year analysis',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      category: 'comparison'
    },
    // Standard Reports
    {
      id: 'trip-summary',
      name: 'Trip Summary',
      description: 'All trip details',
      icon: <Package className="h-4 w-4" />,
      category: 'operations'
    },
    {
      id: 'vehicle-utilization',
      name: 'Vehicle Utilization',
      description: 'Vehicle usage patterns',
      icon: <Truck className="h-4 w-4" />,
      category: 'operations'
    },
    {
      id: 'driver-performance',
      name: 'Driver Performance',
      description: 'Driver efficiency',
      icon: <Users className="h-4 w-4" />,
      category: 'operations'
    },
    {
      id: 'fuel-consumption',
      name: 'Fuel Analysis',
      description: 'Fuel usage & costs',
      icon: <Fuel className="h-4 w-4" />,
      category: 'financial'
    },
    {
      id: 'expense-analysis',
      name: 'Expense Report',
      description: 'All expenses',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'financial'
    },
    {
      id: 'maintenance-schedule',
      name: 'Maintenance',
      description: 'Service schedules',
      icon: <Wrench className="h-4 w-4" />,
      category: 'maintenance'
    },
    {
      id: 'compliance-audit',
      name: 'Compliance',
      description: 'Document validity',
      icon: <FileText className="h-4 w-4" />,
      category: 'compliance'
    }
  ];

  // Fetch all metrics and data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [dateRange, activeTab, fetchDashboardData]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchTripTrends(),
        fetchVehicleUtilization(),
        fetchDriverPerformance(),
        fetchExpenseBreakdown()
      ]);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchTripTrends, fetchVehicleUtilization, fetchDriverPerformance, fetchExpenseBreakdown]);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .gte('start_time', dateRange.startDate.toISOString())
        .lte('start_time', dateRange.endDate.toISOString());

      const totalRevenue = trips?.reduce((sum, trip) => {
        const revenue = (trip.end_km - trip.start_km) * 10;
        return sum + revenue;
      }, 0) || 0;

      const avgDistance = trips?.length ? 
        trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0) / trips.length : 0;

      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: maintenance } = await supabase
        .from('maintenance')
        .select('*')
        .gte('scheduled_date', dateRange.startDate.toISOString())
        .lte('scheduled_date', dateRange.endDate.toISOString());

      const maintenanceCosts = maintenance?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;
      const pendingMaintenance = maintenance?.filter(m => m.status === 'scheduled').length || 0;

      setMetrics({
        totalRevenue,
        totalTrips: trips?.length || 0,
        activeVehicles: vehicleCount || 0,
        activeDrivers: driverCount || 0,
        avgTripDistance: Math.round(avgDistance),
        avgFuelEfficiency: 8.5,
        maintenanceCosts,
        pendingMaintenance
      });
    } catch (error) {
      logger.error('Error fetching metrics:', error);
    }
  }, [dateRange]);

  const fetchTripTrends = useCallback(async () => {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select('start_time, end_km, start_km')
        .gte('start_time', subMonths(dateRange.endDate, 6).toISOString())
        .lte('start_time', dateRange.endDate.toISOString())
        .order('start_time');

      const grouped = trips?.reduce((acc: any, trip) => {
        const date = format(new Date(trip.start_time), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, trips: 0, revenue: 0 };
        }
        acc[date].trips++;
        acc[date].revenue += (trip.end_km - trip.start_km) * 10;
        return acc;
      }, {});

      setChartData(prev => ({
        ...prev,
        tripTrends: Object.values(grouped || {})
      }));
    } catch (error) {
      logger.error('Error fetching trip trends:', error);
    }
  }, [dateRange]);

  const fetchVehicleUtilization = useCallback(async () => {
    try {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .eq('status', 'active')
        .limit(10);

      const utilizationData = await Promise.all(
        vehicles?.map(async (vehicle) => {
          const { count } = await supabase
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .eq('vehicle_id', vehicle.id)
            .gte('start_time', dateRange.startDate.toISOString())
            .lte('start_time', dateRange.endDate.toISOString());

          return {
            vehicle: vehicle.registration_number,
            trips: count || 0,
            utilization: Math.min(((count || 0) / 30) * 100, 100)
          };
        }) || []
      );

      setChartData(prev => ({
        ...prev,
        vehicleUtilization: utilizationData.sort((a, b) => b.utilization - a.utilization)
      }));
    } catch (error) {
      logger.error('Error fetching vehicle utilization:', error);
    }
  }, [dateRange]);

  const fetchDriverPerformance = useCallback(async () => {
    try {
      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('status', 'active')
        .limit(10);

      const performanceData = await Promise.all(
        drivers?.map(async (driver) => {
          const { data: trips } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driver.id)
            .gte('start_time', dateRange.startDate.toISOString())
            .lte('start_time', dateRange.endDate.toISOString());

          const efficiency = trips?.length ? 
            trips.reduce((sum, trip) => {
              const fuelEfficiency = (trip.end_km - trip.start_km) / (trip.total_fuel_cost || 1);
              return sum + fuelEfficiency;
            }, 0) / trips.length : 0;

          return {
            driver: driver.name,
            trips: trips?.length || 0,
            efficiency: Math.round(efficiency * 10) / 10
          };
        }) || []
      );

      setChartData(prev => ({
        ...prev,
        driverPerformance: performanceData.sort((a, b) => b.efficiency - a.efficiency)
      }));
    } catch (error) {
      logger.error('Error fetching driver performance:', error);
    }
  }, [dateRange]);

  const fetchExpenseBreakdown = useCallback(async () => {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select('total_fuel_cost, total_road_expenses, driver_expense, breakdown_expense')
        .gte('start_time', dateRange.startDate.toISOString())
        .lte('start_time', dateRange.endDate.toISOString());

      const expenses = {
        Fuel: 0,
        'Road Expenses': 0,
        'Driver Expenses': 0,
        'Breakdown': 0,
        'Maintenance': metrics.maintenanceCosts
      };

      trips?.forEach(trip => {
        expenses.Fuel += trip.total_fuel_cost || 0;
        expenses['Road Expenses'] += trip.total_road_expenses || 0;
        expenses['Driver Expenses'] += trip.driver_expense || 0;
        expenses['Breakdown'] += trip.breakdown_expense || 0;
      });

      setChartData(prev => ({
        ...prev,
        expenseBreakdown: Object.entries(expenses).map(([category, amount]) => ({
          category,
          amount
        }))
      }));
    } catch (error) {
      logger.error('Error fetching expense breakdown:', error);
    }
  }, [dateRange, metrics.maintenanceCosts]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (selectedDateRange) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        end = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'last30Days':
        start = subDays(now, 30);
        end = now;
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : now;
        end = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  };

  const generateReport = async (reportId: string) => {
    setGeneratingReport(reportId);
    const { start, end } = getDateRange();
    
    try {
      let fileName = '';
      let headers: string[] = [];
      let rows: any[][] = [];

      switch (reportId) {
        case 'week-comparison': {
          const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const lastWeekStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });

          const { data: thisWeekTrips } = await supabase
            .from('trips')
            .select('*')
            .gte('start_time', thisWeekStart.toISOString())
            .lte('start_time', new Date().toISOString());

          const { data: lastWeekTrips } = await supabase
            .from('trips')
            .select('*')
            .gte('start_time', lastWeekStart.toISOString())
            .lte('start_time', endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }).toISOString());

          const thisWeekMetrics = calculateMetrics(thisWeekTrips || []);
          const lastWeekMetrics = calculateMetrics(lastWeekTrips || []);

          fileName = `week-comparison-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          headers = ['Metric', 'This Week', 'Last Week', 'Change', '% Change'];
          rows = [
            ['Total Trips', thisWeekMetrics.totalTrips, lastWeekMetrics.totalTrips, 
             thisWeekMetrics.totalTrips - lastWeekMetrics.totalTrips,
             calculatePercentChange(lastWeekMetrics.totalTrips, thisWeekMetrics.totalTrips)],
            ['Total Distance (km)', thisWeekMetrics.totalDistance, lastWeekMetrics.totalDistance,
             thisWeekMetrics.totalDistance - lastWeekMetrics.totalDistance,
             calculatePercentChange(lastWeekMetrics.totalDistance, thisWeekMetrics.totalDistance)],
            ['Total Revenue', thisWeekMetrics.totalRevenue, lastWeekMetrics.totalRevenue,
             thisWeekMetrics.totalRevenue - lastWeekMetrics.totalRevenue,
             calculatePercentChange(lastWeekMetrics.totalRevenue, thisWeekMetrics.totalRevenue)]
          ];
          break;
        }

        case 'trip-summary': {
          const { data: trips } = await supabase
            .from('trips')
            .select(`
              *,
              vehicle:vehicles(registration_number),
              driver:drivers(name)
            `)
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString());
          
          fileName = `trip-summary-${format(start, 'yyyy-MM-dd')}.csv`;
          headers = ['Date', 'Vehicle', 'Driver', 'From', 'To', 'Distance', 'Status'];
          rows = trips?.map(trip => [
            format(new Date(trip.start_time), 'yyyy-MM-dd'),
            trip.vehicle?.registration_number || '',
            trip.driver?.name || '',
            trip.from_location || '',
            trip.to_location || '',
            (trip.end_km - trip.start_km) || 0,
            trip.status || ''
          ]) || [];
          break;
        }
      }

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      
    } catch (error) {
      logger.error('Error generating report:', error);
    } finally {
      setGeneratingReport(null);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reporting & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-300">Visual insights and downloadable reports</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              Visual Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'reports'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Download Reports
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector (Common for both tabs) */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <select
            value={selectedDateRange}
            onChange={(e) => {
              setSelectedDateRange(e.target.value);
              if (e.target.value !== 'custom') {
                const { start, end } = getDateRange();
                setDateRange({ startDate: start, endDate: end });
              }
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisWeek">This Week</option>
            <option value="lastWeek">Last Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last30Days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {selectedDateRange === 'custom' && (
            <div className="flex space-x-3">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  if (e.target.value && customEndDate) {
                    setDateRange({
                      startDate: new Date(e.target.value),
                      endDate: new Date(customEndDate)
                    });
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <span className="self-center text-gray-600 dark:text-gray-300">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  if (customStartDate && e.target.value) {
                    setDateRange({
                      startDate: new Date(customStartDate),
                      endDate: new Date(e.target.value)
                    });
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <button
              onClick={fetchDashboardData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Visual Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Trips</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalTrips}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Active Vehicles</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.activeVehicles}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Active Drivers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.activeDrivers}</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trip Trends */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Trip Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.tripTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="trips" stroke="#3B82F6" name="Trips" />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Vehicle Utilization */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Vehicle Utilization</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.vehicleUtilization.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicle" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Driver Performance */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Driver Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.driverPerformance.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="driver" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category}: $${entry.amount.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {chartData.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Download Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          {/* Quick Download Section */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Downloads</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {reportTypes.slice(0, showAllReports ? reportTypes.length : 5).map((report) => (
                <button
                  key={report.id}
                  onClick={() => generateReport(report.id)}
                  disabled={generatingReport === report.id}
                  className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 border border-gray-200 dark:border-gray-700"
                >
                  <div className={`p-2 rounded-lg mb-2 ${
                    report.category === 'comparison' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                    report.category === 'financial' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                    report.category === 'operations' ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' :
                    report.category === 'maintenance' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      report.icon
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</span>
                </button>
              ))}
            </div>
            {!showAllReports && reportTypes.length > 5 && (
              <button
                onClick={() => setShowAllReports(true)}
                className="mt-4 flex items-center justify-center w-full py-2 text-blue-600 hover:text-blue-700"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All Reports ({reportTypes.length - 5} more)
              </button>
            )}
            {showAllReports && (
              <button
                onClick={() => setShowAllReports(false)}
                className="mt-4 flex items-center justify-center w-full py-2 text-blue-600 hover:text-blue-700"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </button>
            )}
          </div>

          {/* Comparison Reports Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Smart Comparisons
              </h3>
              <div className="space-y-2">
                {reportTypes.filter(r => r.category === 'comparison').map(report => (
                  <button
                    key={report.id}
                    onClick={() => generateReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex justify-between items-center border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{report.name}</span>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Download className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                Financial Reports
              </h3>
              <div className="space-y-2">
                {reportTypes.filter(r => r.category === 'financial').map(report => (
                  <button
                    key={report.id}
                    onClick={() => generateReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex justify-between items-center border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{report.name}</span>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Download className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                <Package className="h-5 w-5 mr-2 text-purple-600" />
                Operations Reports
              </h3>
              <div className="space-y-2">
                {reportTypes.filter(r => r.category === 'operations').map(report => (
                  <button
                    key={report.id}
                    onClick={() => generateReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex justify-between items-center border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{report.name}</span>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Download className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedReportingDashboard;

