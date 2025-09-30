import React, { useState, useEffect } from 'react';
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
  ChevronUp,
  Activity
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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

const FixedUnifiedReportingDashboard: React.FC = () => {
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

  const [chartData, setChartData] = useState<any>({
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
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);

  // Initialize date range properly
  useEffect(() => {
    updateDateRange(selectedDateRange);
  }, []);

  // Fetch data when date range changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [dateRange, activeTab]);

  const updateDateRange = (rangeType: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (rangeType) {
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
        start = customStartDate ? new Date(customStartDate) : startOfMonth(now);
        end = customEndDate ? new Date(customEndDate) : endOfMonth(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setDateRange({ startDate: start, endDate: end });
    setSelectedDateRange(rangeType);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [metricsData, trends, utilization, performance, expenses] = await Promise.all([
        fetchMetrics(),
        fetchTripTrends(),
        fetchVehicleUtilization(),
        fetchDriverPerformance(),
        fetchExpenseBreakdown()
      ]);

      console.log('Dashboard data fetched successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Get trips for the selected period
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
      }

      // Calculate revenue (using a simple formula - adjust based on your business logic)
      const totalRevenue = trips?.reduce((sum, trip) => {
        const distance = (trip.end_km || 0) - (trip.start_km || 0);
        return sum + (distance * 10); // Example: $10 per km
      }, 0) || 0;

      const totalDistance = trips?.reduce((sum, trip) => 
        sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0;

      const avgDistance = trips?.length ? totalDistance / trips.length : 0;

      // Get active vehicles
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get active drivers
      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get maintenance data
      const { data: maintenance } = await supabase
        .from('maintenance')
        .select('cost, status')
        .gte('scheduled_date', dateRange.startDate.toISOString())
        .lte('scheduled_date', dateRange.endDate.toISOString());

      const maintenanceCosts = maintenance?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;
      const pendingMaintenance = maintenance?.filter(m => m.status === 'scheduled').length || 0;

      setMetrics({
        totalRevenue: Math.round(totalRevenue),
        totalTrips: trips?.length || 0,
        activeVehicles: vehicleCount || 0,
        activeDrivers: driverCount || 0,
        avgTripDistance: Math.round(avgDistance),
        avgFuelEfficiency: 8.5,
        maintenanceCosts: Math.round(maintenanceCosts),
        pendingMaintenance
      });

      return true;
    } catch (error) {
      console.error('Error in fetchMetrics:', error);
      return false;
    }
  };

  const fetchTripTrends = async () => {
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('created_at, start_km, end_km')
        .gte('created_at', subMonths(dateRange.endDate, 6).toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .order('created_at');

      if (error) {
        console.error('Error fetching trip trends:', error);
        return;
      }

      // Group by date
      const grouped = trips?.reduce((acc: any, trip) => {
        const date = format(new Date(trip.created_at), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, trips: 0, revenue: 0 };
        }
        acc[date].trips++;
        const distance = (trip.end_km || 0) - (trip.start_km || 0);
        acc[date].revenue += distance * 10;
        return acc;
      }, {}) || {};

      const trendData = Object.values(grouped).slice(-7); // Last 7 days
      setChartData((prev: any) => ({
        ...prev,
        tripTrends: trendData
      }));

      return true;
    } catch (error) {
      console.error('Error in fetchTripTrends:', error);
      return false;
    }
  };

  const fetchVehicleUtilization = async () => {
    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .eq('status', 'active')
        .limit(5);

      if (error) {
        console.error('Error fetching vehicles:', error);
        return;
      }

      const utilizationData = await Promise.all(
        (vehicles || []).map(async (vehicle) => {
          const { count } = await supabase
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .eq('vehicle_id', vehicle.id)
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString());

          const utilization = Math.min(((count || 0) / 30) * 100, 100);
          return {
            vehicle: vehicle.registration_number.slice(0, 10),
            trips: count || 0,
            utilization: Math.round(utilization)
          };
        })
      );

      setChartData((prev: any) => ({
        ...prev,
        vehicleUtilization: utilizationData
      }));

      return true;
    } catch (error) {
      console.error('Error in fetchVehicleUtilization:', error);
      return false;
    }
  };

  const fetchDriverPerformance = async () => {
    try {
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('status', 'active')
        .limit(5);

      if (error) {
        console.error('Error fetching drivers:', error);
        return;
      }

      const performanceData = await Promise.all(
        (drivers || []).map(async (driver) => {
          const { data: trips } = await supabase
            .from('trips')
            .select('start_km, end_km, total_fuel_cost')
            .eq('driver_id', driver.id)
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString());

          const totalDistance = trips?.reduce((sum, trip) => 
            sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0;

          const efficiency = trips?.length ? totalDistance / trips.length : 0;

          return {
            driver: driver.name?.split(' ')[0] || 'Unknown',
            trips: trips?.length || 0,
            efficiency: Math.round(efficiency)
          };
        })
      );

      setChartData((prev: any) => ({
        ...prev,
        driverPerformance: performanceData
      }));

      return true;
    } catch (error) {
      console.error('Error in fetchDriverPerformance:', error);
      return false;
    }
  };

  const fetchExpenseBreakdown = async () => {
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('total_fuel_cost, total_road_expenses, driver_expense, breakdown_expense')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('Error fetching expenses:', error);
        return;
      }

      const expenses = {
        Fuel: 0,
        Road: 0,
        Driver: 0,
        Breakdown: 0,
        Maintenance: metrics.maintenanceCosts
      };

      trips?.forEach(trip => {
        expenses.Fuel += trip.total_fuel_cost || 0;
        expenses.Road += trip.total_road_expenses || 0;
        expenses.Driver += trip.driver_expense || 0;
        expenses.Breakdown += trip.breakdown_expense || 0;
      });

      const expenseData = Object.entries(expenses).map(([category, amount]) => ({
        category,
        amount: Math.round(amount)
      })).filter(item => item.amount > 0);

      setChartData((prev: any) => ({
        ...prev,
        expenseBreakdown: expenseData
      }));

      return true;
    } catch (error) {
      console.error('Error in fetchExpenseBreakdown:', error);
      return false;
    }
  };

  const generatePDFReport = async (reportType: string) => {
    setGeneratingReport(reportType);
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(31, 41, 55); // gray-800
      pdf.text('AVS Fleet Management Report', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setTextColor(75, 85, 99); // gray-600
      pdf.text(reportType.replace(/-/g, ' ').toUpperCase(), pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth / 2, 38, { align: 'center' });
      pdf.text(`Period: ${format(dateRange.startDate, 'dd/MM/yyyy')} to ${format(dateRange.endDate, 'dd/MM/yyyy')}`, pageWidth / 2, 45, { align: 'center' });
      
      let yPosition = 60;

      switch (reportType) {
        case 'trip-summary':
          const { data: trips } = await supabase
            .from('trips')
            .select(`
              *,
              vehicle:vehicles(registration_number),
              driver:drivers(name)
            `)
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString())
            .limit(100);

          // Summary section
          pdf.setFontSize(12);
          pdf.setTextColor(31, 41, 55);
          pdf.text('Summary', 14, yPosition);
          yPosition += 10;

          const totalTrips = trips?.length || 0;
          const totalDistance = trips?.reduce((sum, trip) => 
            sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0;
          const totalFuel = trips?.reduce((sum, trip) => 
            sum + (trip.total_fuel_cost || 0), 0) || 0;

          pdf.setFontSize(10);
          pdf.setTextColor(75, 85, 99);
          pdf.text(`Total Trips: ${totalTrips}`, 14, yPosition);
          yPosition += 6;
          pdf.text(`Total Distance: ${totalDistance.toFixed(0)} km`, 14, yPosition);
          yPosition += 6;
          pdf.text(`Total Fuel Cost: $${totalFuel.toFixed(2)}`, 14, yPosition);
          yPosition += 6;
          pdf.text(`Average Distance per Trip: ${totalTrips ? (totalDistance / totalTrips).toFixed(1) : 0} km`, 14, yPosition);
          yPosition += 15;

          // Table
          const tableData = trips?.map(trip => [
            format(new Date(trip.created_at), 'dd/MM/yyyy'),
            trip.vehicle?.registration_number || 'N/A',
            trip.driver?.name || 'N/A',
            `${trip.from_location || 'N/A'} → ${trip.to_location || 'N/A'}`,
            `${((trip.end_km || 0) - (trip.start_km || 0)).toFixed(0)} km`,
            `$${(trip.total_fuel_cost || 0).toFixed(2)}`
          ]) || [];

          if (tableData.length > 0) {
            pdf.autoTable({
              head: [['Date', 'Vehicle', 'Driver', 'Route', 'Distance', 'Fuel Cost']],
              body: tableData.slice(0, 20), // First 20 rows
              startY: yPosition,
              theme: 'grid',
              headStyles: { fillColor: [59, 130, 246] }, // blue-600
              styles: { fontSize: 8 }
            });
          }
          break;

        case 'week-comparison':
        case 'month-comparison':
          // Comparison logic
          let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;
          
          if (reportType === 'week-comparison') {
            currentPeriodStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            currentPeriodEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
            previousPeriodStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
            previousPeriodEnd = endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
          } else {
            currentPeriodStart = startOfMonth(new Date());
            currentPeriodEnd = endOfMonth(new Date());
            previousPeriodStart = startOfMonth(subMonths(new Date(), 1));
            previousPeriodEnd = endOfMonth(subMonths(new Date(), 1));
          }

          const { data: currentTrips } = await supabase
            .from('trips')
            .select('*')
            .gte('created_at', currentPeriodStart.toISOString())
            .lte('created_at', currentPeriodEnd.toISOString());

          const { data: previousTrips } = await supabase
            .from('trips')
            .select('*')
            .gte('created_at', previousPeriodStart.toISOString())
            .lte('created_at', previousPeriodEnd.toISOString());

          const calculateMetrics = (trips: any[]) => {
            return {
              trips: trips?.length || 0,
              distance: trips?.reduce((sum, trip) => sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0,
              fuel: trips?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0,
              expenses: trips?.reduce((sum, trip) => sum + 
                (trip.total_fuel_cost || 0) + 
                (trip.total_road_expenses || 0) + 
                (trip.driver_expense || 0), 0) || 0
            };
          };

          const current = calculateMetrics(currentTrips || []);
          const previous = calculateMetrics(previousTrips || []);

          pdf.setFontSize(12);
          pdf.text('Comparison Analysis', 14, yPosition);
          yPosition += 10;

          const comparisonData = [
            ['Metric', reportType === 'week-comparison' ? 'This Week' : 'This Month', 
             reportType === 'week-comparison' ? 'Last Week' : 'Last Month', 'Change', '% Change'],
            ['Total Trips', current.trips.toString(), previous.trips.toString(), 
             (current.trips - previous.trips).toString(),
             previous.trips ? `${(((current.trips - previous.trips) / previous.trips) * 100).toFixed(1)}%` : 'N/A'],
            ['Distance (km)', current.distance.toFixed(0), previous.distance.toFixed(0),
             (current.distance - previous.distance).toFixed(0),
             previous.distance ? `${(((current.distance - previous.distance) / previous.distance) * 100).toFixed(1)}%` : 'N/A'],
            ['Fuel Cost', `$${current.fuel.toFixed(2)}`, `$${previous.fuel.toFixed(2)}`,
             `$${(current.fuel - previous.fuel).toFixed(2)}`,
             previous.fuel ? `${(((current.fuel - previous.fuel) / previous.fuel) * 100).toFixed(1)}%` : 'N/A'],
            ['Total Expenses', `$${current.expenses.toFixed(2)}`, `$${previous.expenses.toFixed(2)}`,
             `$${(current.expenses - previous.expenses).toFixed(2)}`,
             previous.expenses ? `${(((current.expenses - previous.expenses) / previous.expenses) * 100).toFixed(1)}%` : 'N/A']
          ];

          pdf.autoTable({
            head: [comparisonData[0]],
            body: comparisonData.slice(1),
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94] }, // green-500
            styles: { fontSize: 9 }
          });
          break;

        default:
          pdf.text('Report generation in progress...', 14, yPosition);
      }

      // Add footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175); // gray-400
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
        pdf.text('© 2024 AVS - Auto Vital Solution', 14, pdf.internal.pageSize.getHeight() - 10);
      }

      // Save the PDF
      pdf.save(`AVS-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGeneratingReport(null);
    }
  };

  const reportTypes = [
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
      id: 'fuel-analysis',
      name: 'Fuel Analysis',
      description: 'Fuel usage & costs',
      icon: <Fuel className="h-4 w-4" />,
      category: 'financial'
    },
    {
      id: 'expense-report',
      name: 'Expense Report',
      description: 'All expenses',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'financial'
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      description: 'Service schedules',
      icon: <Wrench className="h-4 w-4" />,
      category: 'maintenance'
    },
    {
      id: 'compliance',
      name: 'Compliance',
      description: 'Document validity',
      icon: <FileText className="h-4 w-4" />,
      category: 'compliance'
    }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header - AVS Style */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Activity className="h-6 w-6 mr-2 text-primary-600" />
                Reporting & Analytics
              </h1>
              <p className="text-sm text-gray-500 mt-1">Visual insights and downloadable reports</p>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'dashboard' 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="h-4 w-4 inline mr-2" />
                Visual Dashboard
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'reports' 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Download className="h-4 w-4 inline mr-2" />
                Download Reports
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedDateRange}
              onChange={(e) => updateDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    if (e.target.value && customEndDate) {
                      updateDateRange('custom');
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    if (customStartDate && e.target.value) {
                      updateDateRange('custom');
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
            
            {activeTab === 'dashboard' && (
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="ml-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Visual Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      ${metrics.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trips</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.totalTrips}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Vehicles</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.activeVehicles}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Truck className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Drivers</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.activeDrivers}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trip Trends */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Trends</h3>
                {chartData.tripTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.tripTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="trips" stroke="#3B82F6" name="Trips" strokeWidth={2} />
                      <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </div>

              {/* Vehicle Utilization */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Utilization</h3>
                {chartData.vehicleUtilization.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.vehicleUtilization}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="vehicle" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip formatter={(value: any) => `${value}%`} />
                      <Bar dataKey="utilization" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No vehicle data available
                  </div>
                )}
              </div>

              {/* Driver Performance */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Driver Performance</h3>
                {chartData.driverPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.driverPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="driver" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No driver data available
                  </div>
                )}
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
                {chartData.expenseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.category}: $${entry.amount}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {chartData.expenseBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `$${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No expense data available
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Download Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            {/* Quick Downloads */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Downloads</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {reportTypes.slice(0, showAllReports ? reportTypes.length : 5).map((report) => (
                  <button
                    key={report.id}
                    onClick={() => generatePDFReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all hover:shadow-md disabled:opacity-50"
                  >
                    <div className={`p-3 rounded-lg mb-2 ${
                      report.category === 'comparison' ? 'bg-green-100 text-green-600' :
                      report.category === 'financial' ? 'bg-blue-100 text-blue-600' :
                      report.category === 'operations' ? 'bg-purple-100 text-purple-600' :
                      report.category === 'maintenance' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {generatingReport === report.id ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      ) : (
                        report.icon
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{report.name}</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">{report.description}</span>
                  </button>
                ))}
              </div>
              
              {!showAllReports && reportTypes.length > 5 && (
                <button
                  onClick={() => setShowAllReports(true)}
                  className="mt-4 flex items-center justify-center w-full py-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show All Reports ({reportTypes.length - 5} more)
                </button>
              )}
              
              {showAllReports && (
                <button
                  onClick={() => setShowAllReports(false)}
                  className="mt-4 flex items-center justify-center w-full py-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show Less
                </button>
              )}
            </div>

            {/* Categorized Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Smart Comparisons */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Smart Comparisons
                </h3>
                <div className="space-y-2">
                  {reportTypes.filter(r => r.category === 'comparison').map(report => (
                    <button
                      key={report.id}
                      onClick={() => generatePDFReport(report.id)}
                      disabled={generatingReport === report.id}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex justify-between items-center group"
                    >
                      <span className="text-sm text-gray-700">{report.name}</span>
                      {generatingReport === report.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
                      ) : (
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Financial Reports */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                  Financial Reports
                </h3>
                <div className="space-y-2">
                  {reportTypes.filter(r => r.category === 'financial').map(report => (
                    <button
                      key={report.id}
                      onClick={() => generatePDFReport(report.id)}
                      disabled={generatingReport === report.id}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex justify-between items-center group"
                    >
                      <span className="text-sm text-gray-700">{report.name}</span>
                      {generatingReport === report.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
                      ) : (
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operations Reports */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-purple-600" />
                  Operations Reports
                </h3>
                <div className="space-y-2">
                  {reportTypes.filter(r => r.category === 'operations').map(report => (
                    <button
                      key={report.id}
                      onClick={() => generatePDFReport(report.id)}
                      disabled={generatingReport === report.id}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex justify-between items-center group"
                    >
                      <span className="text-sm text-gray-700">{report.name}</span>
                      {generatingReport === report.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
                      ) : (
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixedUnifiedReportingDashboard;
