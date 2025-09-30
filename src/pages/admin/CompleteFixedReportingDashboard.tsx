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
  totalFuelCost: number;
  totalExpenses: number;
}

const CompleteFixedReportingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalTrips: 0,
    activeVehicles: 0,
    activeDrivers: 0,
    avgTripDistance: 0,
    avgFuelEfficiency: 0,
    maintenanceCosts: 0,
    pendingMaintenance: 0,
    totalFuelCost: 0,
    totalExpenses: 0
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
      await Promise.all([
        fetchMetrics(),
        fetchTripTrends(),
        fetchVehicleUtilization(),
        fetchDriverPerformance(),
        fetchExpenseBreakdown()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Get trips for the selected period - NO DUMMY DATA
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
      }

      // Calculate REAL metrics from database
      const totalDistance = trips?.reduce((sum, trip) => 
        sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0;

      const totalFuelCost = trips?.reduce((sum, trip) => 
        sum + (trip.total_fuel_cost || 0), 0) || 0;

      const totalExpenses = trips?.reduce((sum, trip) => 
        sum + (trip.total_fuel_cost || 0) + 
        (trip.total_road_expenses || 0) + 
        (trip.driver_expense || 0) +
        (trip.unloading_expense || 0) +
        (trip.road_rto_expense || 0) +
        (trip.breakdown_expense || 0) +
        (trip.miscellaneous_expense || 0), 0) || 0;

      // Calculate revenue from bill_amount if available, otherwise use freight_amount
      const totalRevenue = trips?.reduce((sum, trip) => 
        sum + (trip.bill_amount || trip.freight_amount || 0), 0) || 0;

      const avgDistance = trips?.length ? totalDistance / trips.length : 0;
      
      // Calculate real fuel efficiency (km per rupee)
      const avgFuelEfficiency = totalFuelCost > 0 ? totalDistance / totalFuelCost : 0;

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
        avgFuelEfficiency: parseFloat(avgFuelEfficiency.toFixed(2)),
        maintenanceCosts: Math.round(maintenanceCosts),
        pendingMaintenance,
        totalFuelCost: Math.round(totalFuelCost),
        totalExpenses: Math.round(totalExpenses)
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
        .select('created_at, start_km, end_km, bill_amount, freight_amount')
        .gte('created_at', subMonths(dateRange.endDate, 1).toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .order('created_at');

      if (error) {
        console.error('Error fetching trip trends:', error);
        return;
      }

      // Group by date with REAL revenue
      const grouped = trips?.reduce((acc: any, trip) => {
        const date = format(new Date(trip.created_at), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, trips: 0, revenue: 0 };
        }
        acc[date].trips++;
        acc[date].revenue += (trip.bill_amount || trip.freight_amount || 0);
        return acc;
      }, {}) || {};

      const trendData = Object.values(grouped).slice(-7);
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

          // Calculate utilization (assuming 1 trip per day is 100%)
          const daysInPeriod = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
          const utilization = Math.min(((count || 0) / daysInPeriod) * 100, 100);
          
          return {
            vehicle: vehicle.registration_number.slice(0, 10),
            trips: count || 0,
            utilization: Math.round(utilization)
          };
        })
      );

      setChartData((prev: any) => ({
        ...prev,
        vehicleUtilization: utilizationData.sort((a, b) => b.utilization - a.utilization)
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

          const totalFuel = trips?.reduce((sum, trip) => 
            sum + (trip.total_fuel_cost || 0), 0) || 0;

          // Efficiency = km per rupee of fuel
          const efficiency = totalFuel > 0 ? totalDistance / totalFuel : 0;

          return {
            driver: driver.name?.split(' ')[0] || 'Unknown',
            trips: trips?.length || 0,
            efficiency: parseFloat(efficiency.toFixed(2))
          };
        })
      );

      setChartData((prev: any) => ({
        ...prev,
        driverPerformance: performanceData.sort((a, b) => b.efficiency - a.efficiency)
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
        .select('total_fuel_cost, total_road_expenses, driver_expense, breakdown_expense, unloading_expense, road_rto_expense, miscellaneous_expense')
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
        Unloading: 0,
        RTO: 0,
        Misc: 0
      };

      trips?.forEach(trip => {
        expenses.Fuel += trip.total_fuel_cost || 0;
        expenses.Road += trip.total_road_expenses || 0;
        expenses.Driver += trip.driver_expense || 0;
        expenses.Breakdown += trip.breakdown_expense || 0;
        expenses.Unloading += trip.unloading_expense || 0;
        expenses.RTO += trip.road_rto_expense || 0;
        expenses.Misc += trip.miscellaneous_expense || 0;
      });

      const expenseData = Object.entries(expenses)
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount)
        }))
        .filter(item => item.amount > 0);

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

  // [Rest of the component continues...]
  return <div>Component implementation continues...</div>;
};

export default CompleteFixedReportingDashboard;
