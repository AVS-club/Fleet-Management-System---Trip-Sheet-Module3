import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePermissions } from '../hooks/usePermissions';
import LoadingScreen from '../components/LoadingScreen';
import { Trip, Vehicle, Driver } from '@/types';
import { Warehouse, Destination } from '@/types/trip';
import { getTrips, getVehicles, getWarehouses, getDestinations } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
import { Calendar, ChevronDown, Filter, ChevronLeft, ChevronRight, X, RefreshCw, Search, Download, IndianRupee, TrendingUp, TrendingDown, BarChart3, BarChart2, Target, Eye, Printer, ArrowUpDown, MoreHorizontal, PieChart, LineChart, Activity, AlertTriangle, Users, Building2, Sparkles, TrendingDown as Loss, Zap, FileText, Settings, Package, Truck, DollarSign, AlertCircle, Info, CheckCircle, Map, MoreVertical, Calculator } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import QuickIncomeEntry from '../components/pnl/QuickIncomeEntry';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         startOfYear, endOfYear, subWeeks, subMonths, subYears, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { createLogger } from '../utils/logger';
import { useKPICards, useLatestKPIs } from '../hooks/useKPICards';
import { supabase } from '../utils/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import ContractRatesManager from '../components/pnl/ContractRatesManager';
import { FixedSizeList } from 'react-window';
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
  AreaChart,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';

const logger = createLogger('TripPnlReportsPage');

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

interface CustomerPnL {
  customerId: string;
  customerName: string;
  totalTrips: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgTripValue: number;
  topRoute: string;
  lastTripDate: string;
}

interface RouteAnalysis {
  route: string;
  trips: number;
  revenue: number;
  expenses: number;
  profit: number;
  avgDistance: number;
  avgDuration: number;
  profitPerKm: number;
}

interface ContractRate {
  id: string;
  customerId: string;
  route?: string;
  vehicleType?: string;
  rateType: 'per_km' | 'per_ton' | 'per_trip';
  rate: number;
  validFrom: string;
  validTo?: string;
  minGuarantee?: number;
  fuelAdjustment?: boolean;
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
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedProfitStatus, setSelectedProfitStatus] = useState('');
  const [selectedDatePreset, setSelectedDatePreset] = useState('alltime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [showCustomerAnalysis, setShowCustomerAnalysis] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedBillingType, setSelectedBillingType] = useState('');
  const [showIncomeEntry, setShowIncomeEntry] = useState(false);

  // Enhanced UI state
  const [showCharts, setShowCharts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Trip>('trip_start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [activeView, setActiveView] = useState<'summary' | 'customer' | 'route' | 'insights'>('summary');
  const [showContractManager, setShowContractManager] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState(false);

  // Permission checks will be moved after all hooks

  // ...rest of component logic

  const datePresetOptions = useMemo<DatePreset[]>(() => [
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
  ], []);

  // Fetch real KPI data
  const { data: kpiCards, isLoading: kpiLoading } = useKPICards({ period: 'all', limit: 100 });
  const { data: latestKPIs } = useLatestKPIs();

  // Fetch AI insights from events_feed
  const { data: aiInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights', selectedDatePreset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_feed')
        .select('*')
        .in('kind', ['pnl_alert', 'profit_anomaly', 'expense_spike', 'route_optimization'])
        .order('event_time', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      logger.debug('Loading PNL Reports data...');

      const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
        getWarehouses(),
        getDestinations()
      ]);

      logger.debug('Data loaded successfully:', {
        trips: tripsData.length,
        vehicles: vehiclesData.length,
        drivers: driversData.length,
        warehouses: warehousesData.length,
        destinations: destinationsData.length
      });

      setTrips(tripsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setWarehouses(warehousesData);
      setDestinations(destinationsData);
    } catch (error) {
      logger.error("Error fetching PNL Reports data:", error);
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

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
  }, [selectedDatePreset, customStartDate, customEndDate, datePresetOptions]);

  // Filter trips based on current filters
  const filteredTrips = useMemo(() => {
    try {
    const filtered = trips.filter(trip => {
      // Date range filter
      const tripDate = parseISO(trip.trip_start_date);
      if (tripDate < dateRange.startDate || tripDate > dateRange.endDate) {
        return false;
      }

      // Search filter with debounced term
      if (
        debouncedSearchTerm &&
        !(trip.trip_serial_number || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase())
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

      // Customer filter
      if (selectedCustomer && !trip.destinations?.includes(selectedCustomer)) {
        return false;
      }

      // Route filter
      if (selectedRoute && trip.destination_display !== selectedRoute) {
        return false;
      }

      // Billing type filter
      if (selectedBillingType && trip.billing_type !== selectedBillingType) {
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
        Number(trip.miscellaneous_expense || 0)
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
      logger.error('Error filtering trips:', error);
      return [];
    }
  }, [trips, dateRange, debouncedSearchTerm, selectedVehicle, selectedDriver, selectedWarehouse, selectedProfitStatus, selectedCustomer, selectedRoute, selectedBillingType]);

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
        Number(trip.miscellaneous_expense || 0)
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

  const vehicleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach(v => { map[v.id] = v.registration_number; });
    return map;
  }, [vehicles]);
  const driverNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    drivers.forEach(d => { if (d.id) map[d.id] = d.name || 'Unknown'; });
    return map;
  }, [drivers]);
  const warehouseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach(w => { map[w.id] = w.name; });
    return map;
  }, [warehouses]);
  const destinationNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    destinations.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [destinations]);

  const getVehicleName = useCallback((vehicleId: string) => vehicleNameMap[vehicleId] || 'N/A', [vehicleNameMap]);
  const getDriverName = useCallback((driverId: string) => driverNameMap[driverId] || 'N/A', [driverNameMap]);
  const getWarehouseName = useCallback((warehouseId: string) => warehouseNameMap[warehouseId] || 'N/A', [warehouseNameMap]);
  const getDestinationName = useCallback((destinationId: string) => destinationNameMap[destinationId] || 'N/A', [destinationNameMap]);

  // Calculate customer-wise P&L
  const customerPnL = useMemo((): CustomerPnL[] => {
    const customerMap: Record<string, CustomerPnL> = {};
    
    filteredTrips.forEach(trip => {
      // Use destination as customer proxy
      const customerId = trip.destinations?.[0] || 'unknown';
      const customerName = customerId !== 'unknown' ? getDestinationName(customerId) : 'Unknown Customer';
      
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          customerId,
          customerName,
          totalTrips: 0,
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          avgTripValue: 0,
          topRoute: '',
          lastTripDate: ''
        };
      }
      
      const customer = customerMap[customerId];
      customer.totalTrips++;
      customer.totalRevenue += trip.income_amount || 0;
      customer.totalExpenses += trip.total_expense || 0;
      customer.netProfit = customer.totalRevenue - customer.totalExpenses;
      customer.avgTripValue = customer.totalRevenue / customer.totalTrips;
      customer.profitMargin = customer.totalRevenue > 0 ? (customer.netProfit / customer.totalRevenue) * 100 : 0;
      
      if (!customer.lastTripDate || new Date(trip.trip_start_date) > new Date(customer.lastTripDate)) {
        customer.lastTripDate = trip.trip_start_date;
      }
    });
    
    return Object.values(customerMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20); // Top 20 customers
  }, [filteredTrips, getDestinationName]);

  // Calculate route analysis
  const routeAnalysis = useMemo((): RouteAnalysis[] => {
    const routeMap: Record<string, RouteAnalysis> = {};
    
    filteredTrips.forEach(trip => {
      const route = trip.destination_display || 'Unknown Route';
      
      if (!routeMap[route]) {
        routeMap[route] = {
          route,
          trips: 0,
          revenue: 0,
          expenses: 0,
          profit: 0,
          avgDistance: 0,
          avgDuration: 0,
          profitPerKm: 0
        };
      }
      
      const routeData = routeMap[route];
      const distance = (trip.end_km || 0) - (trip.start_km || 0);
      
      routeData.trips++;
      routeData.revenue += trip.income_amount || 0;
      routeData.expenses += trip.total_expense || 0;
      routeData.profit = routeData.revenue - routeData.expenses;
      routeData.avgDistance = ((routeData.avgDistance * (routeData.trips - 1)) + distance) / routeData.trips;
      routeData.profitPerKm = routeData.avgDistance > 0 ? routeData.profit / (routeData.avgDistance * routeData.trips) : 0;
    });
    
    return Object.values(routeMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 15); // Top 15 routes
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
    const monthlyData: Record<string, { income: number; expense: number; profit: number; trips: number }> = {};

    filteredTrips.forEach(trip => {
      const month = format(parseISO(trip.trip_start_date), 'MMM yyyy');
      const income = Number(trip.income_amount) || 0;
      const expense = Number(trip.total_expense) || 0;
      const profit = income - expense;

      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0, profit: 0, trips: 0 };
      }

      const data = monthlyData[month];
      data.income += income;
      data.expense += expense;
      data.profit += profit;
      data.trips += 1;
    });

    Object.entries(monthlyData).forEach(([month, data]) => {
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
    const vehicleData: Record<string, { profit: number; trips: number }> = {};

    filteredTrips.forEach(trip => {
      const vehicleId = trip.vehicle_id;
      const vehicleName = getVehicleName(vehicleId);
      const income = Number(trip.income_amount) || 0;
      const expense = Number(trip.total_expense) || 0;
      const profit = income - expense;

      if (!vehicleData[vehicleId]) {
        vehicleData[vehicleId] = { profit: 0, trips: 0 };
      }

      const data = vehicleData[vehicleId];
      data.profit += profit;
      data.trips += 1;
    });

    Object.entries(vehicleData).forEach(([vehicleId, data]) => {
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
      logger.error('Error preparing chart data:', error);
      // Return empty data structure to prevent crashes
      return {
        profitLossData: [],
        monthlyTrend: [],
        vehiclePerformance: []
      };
    }
  }, [filteredTrips, pnlSummary, getVehicleName]);

  // Pagination
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTrips.slice(startIndex, endIndex);
  }, [filteredTrips, currentPage, itemsPerPage]);

  // Sorting
  const sortedTrips = useMemo(() => {
    return [...paginatedTrips].sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';

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
    setSelectedCustomer('');
    setSelectedRoute('');
    setSelectedBillingType('');
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
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Trip Details
    const tripData = filteredTrips.map(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      const driver = drivers.find(d => d.id === trip.driver_id);
      const warehouse = warehouses.find(w => w.id === trip.warehouse_id);
      const customerName = trip.destinations?.[0] ? getDestinationName(trip.destinations[0]) : 'N/A';

      return {
        'Trip ID': trip.trip_serial_number,
        'Date': format(parseISO(trip.trip_start_date), 'dd/MM/yyyy'),
        'Customer': customerName,
        'Route': trip.destination_display || 'N/A',
        'Vehicle': vehicle?.registration_number || 'N/A',
        'Driver': driver?.name || 'N/A',
        'Warehouse': warehouse?.name || 'N/A',
        'Income (₹)': trip.income_amount || 0,
        'Fuel Cost (₹)': trip.total_fuel_cost || 0,
        'Driver Expense (₹)': trip.driver_expense || 0,
        'Other Expenses (₹)': (trip.unloading_expense || 0) + (trip.road_rto_expense || 0) + (trip.miscellaneous_expense || 0),
        'Total Expense (₹)': trip.total_expense || 0,
        'Net Profit (₹)': trip.net_profit || 0,
        'Cost per KM (₹)': trip.cost_per_km || 0,
        'Profit Status': trip.profit_status || 'N/A',
        'Billing Type': trip.billing_type || 'N/A',
        'Freight Rate': trip.freight_rate || 0,
        'Distance (KM)': (trip.end_km || 0) - (trip.start_km || 0)
      };
    });
    const tripSheet = XLSX.utils.json_to_sheet(tripData);
    XLSX.utils.book_append_sheet(workbook, tripSheet, 'Trip Details');

    // Sheet 2: Customer Summary
    const customerData = customerPnL.map(customer => ({
      'Customer Name': customer.customerName,
      'Total Trips': customer.totalTrips,
      'Total Revenue (₹)': customer.totalRevenue,
      'Total Expenses (₹)': customer.totalExpenses,
      'Net Profit (₹)': customer.netProfit,
      'Profit Margin (%)': customer.profitMargin.toFixed(2),
      'Avg Trip Value (₹)': customer.avgTripValue.toFixed(2),
      'Last Trip Date': format(parseISO(customer.lastTripDate), 'dd/MM/yyyy')
    }));
    const customerSheet = XLSX.utils.json_to_sheet(customerData);
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Summary');

    // Sheet 3: Route Analysis
    const routeData = routeAnalysis.map(route => ({
      'Route': route.route,
      'Total Trips': route.trips,
      'Avg Distance (KM)': route.avgDistance.toFixed(0),
      'Total Revenue (₹)': route.revenue,
      'Total Expenses (₹)': route.expenses,
      'Net Profit (₹)': route.profit,
      'Profit per KM (₹)': route.profitPerKm.toFixed(2)
    }));
    const routeSheet = XLSX.utils.json_to_sheet(routeData);
    XLSX.utils.book_append_sheet(workbook, routeSheet, 'Route Analysis');

    // Sheet 4: Summary
    const summaryData = [{
      'Metric': 'Total Trips',
      'Value': pnlSummary.totalTrips
    }, {
      'Metric': 'Total Income',
      'Value': `₹${pnlSummary.totalIncome.toLocaleString('en-IN')}`
    }, {
      'Metric': 'Total Expenses',
      'Value': `₹${pnlSummary.totalExpense.toLocaleString('en-IN')}`
    }, {
      'Metric': 'Net Profit',
      'Value': `₹${pnlSummary.netProfit.toLocaleString('en-IN')}`
    }, {
      'Metric': 'Profit Margin',
      'Value': `${pnlSummary.profitMargin.toFixed(2)}%`
    }, {
      'Metric': 'Average Cost per KM',
      'Value': `₹${pnlSummary.avgCostPerKm.toFixed(2)}`
    }, {
      'Metric': 'Profitable Trips',
      'Value': pnlSummary.profitableTrips
    }, {
      'Metric': 'Loss Making Trips',
      'Value': pnlSummary.lossTrips
    }];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const fileName = `advanced-pnl-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    saveAs(data, fileName);

    toast.success('Comprehensive report exported successfully');
  };

  const getProfitStatusColor = (status: string) => {
    switch (status) {
      case 'profit':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'loss':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      case 'neutral':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Trip P&L Report" subtitle="Analyze profitability of trips">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <Layout title="Trip P&L Report" subtitle="Analyze profitability of trips">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Error Loading PNL Reports</h3>
            </div>
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>

            {debugInfo && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Debug Information
                </summary>
                <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-3 rounded overflow-auto max-h-40 text-red-900 dark:text-red-200">
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
      title="Advanced P&L Analytics"
      subtitle="Comprehensive financial insights and profitability analysis"
      actions={
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => setShowIncomeEntry(true)}
            icon={<Calculator className="h-4 w-4" />}
          >
            Add Income
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              toast.info('Refreshing KPIs...');
              const { error } = await supabase.rpc('generate_kpi_cards');
              if (error) {
                toast.error('Failed to refresh KPIs');
              } else {
                toast.success('KPIs refreshed successfully');
                window.location.reload();
              }
            }}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh KPIs
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAIInsights(!showAIInsights)}
            icon={<Sparkles className="h-4 w-4" />}
            className="relative"
          >
            AI Insights
            {aiInsights && aiInsights.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowContractManager(!showContractManager)}
            icon={<FileText className="h-4 w-4" />}
          >
            Contracts
          </Button>
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
            Back
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* AI Insights Panel */}
        {showAIInsights && aiInsights && aiInsights.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                AI-Powered Insights
              </h3>
              <Button
                variant="outline"
                onClick={() => setShowAIInsights(false)}
                icon={<X className="h-4 w-4" />}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiInsights.slice(0, 6).map((insight: any, idx: number) => (
                <div key={insight.id || idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {insight.priority === 'high' && <AlertCircle className="h-4 w-4 text-red-500 mr-2" />}
                      {insight.priority === 'medium' && <Info className="h-4 w-4 text-yellow-500 mr-2" />}
                      {insight.priority === 'low' && <CheckCircle className="h-4 w-4 text-green-500 mr-2" />}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {insight.title || 'Insight'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {insight.description || 'No description available'}
                  </p>
                  {insight.metadata?.value && (
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                      ₹{Number(insight.metadata.value).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveView('summary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'summary'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Summary
            </button>
            <button
              onClick={() => setActiveView('customer')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'customer'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Customer Analysis
            </button>
            <button
              onClick={() => setActiveView('route')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'route'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Map className="h-4 w-4 inline mr-2" />
              Route Analysis
            </button>
            <button
              onClick={() => setActiveView('insights')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeView === 'insights'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Zap className="h-4 w-4 inline mr-2" />
              Live KPIs
              {kpiCards && kpiCards.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Summary Cards - Enhanced with real KPI data */}
        {activeView === 'summary' && (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center mb-2">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalIncome.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                      {latestKPIs?.revenue && (
                        <>
                          <div className={`flex items-center ${
                            latestKPIs.revenue.kpi_payload.trend === 'up' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {latestKPIs.revenue.kpi_payload.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            <span className="text-sm font-medium">
                              {latestKPIs.revenue.kpi_payload.change || '+12.5%'}
                            </span>
                  </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {latestKPIs.revenue.kpi_payload.period || 'vs last month'}
                          </span>
                        </>
                      )}
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Expense</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center mb-2">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalExpense.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-red-600 dark:text-red-400">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">+8.2%</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold flex items-center mb-2 ${
                  pnlSummary.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.netProfit.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center ${pnlSummary.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{pnlSummary.profitMargin.toFixed(1)}%</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">margin</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${
                pnlSummary.netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
              }`}>
                <IndianRupee className={`h-6 w-6 ${
                  pnlSummary.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{pnlSummary.totalTrips}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <Activity className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">
                      {((pnlSummary.profitableTrips / pnlSummary.totalTrips) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">success rate</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Customer Analysis View */}
        {activeView === 'customer' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Customer-wise P&L Analysis
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trips</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Trip Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {customerPnL.map((customer, idx) => (
                      <tr key={customer.customerId} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={() => setSelectedCustomer(customer.customerId)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {customer.customerName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Last trip: {format(parseISO(customer.lastTripDate), 'dd MMM')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {customer.totalTrips}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                          ₹{customer.totalRevenue.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                          ₹{customer.totalExpenses.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          <span className={customer.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            ₹{customer.netProfit.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${
                              customer.profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {customer.profitMargin.toFixed(1)}%
                            </span>
                            <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  customer.profitMargin >= 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.abs(Math.min(customer.profitMargin, 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          ₹{customer.avgTripValue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Revenue Distribution Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Distribution by Customer</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={customerPnL.slice(0, 10)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="customerName" angle={-45} textAnchor="end" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                    <Legend />
                    <Bar dataKey="totalRevenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="netProfit" fill="#3b82f6" name="Profit" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Route Analysis View */}
        {activeView === 'route' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <Map className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Route Profitability Analysis
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trips</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Distance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit/KM</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {routeAnalysis.map((route) => (
                      <tr key={route.route} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={() => setSelectedRoute(route.route)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Map className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {route.route}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {route.trips}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {route.avgDistance.toFixed(0)} km
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                          ₹{route.revenue.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                          ₹{route.expenses.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          <span className={route.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            ₹{route.profit.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          ₹{route.profitPerKm.toFixed(2)}/km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Route Performance Heatmap */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Route Performance Comparison</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={routeAnalysis}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="route" 
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'Profit per KM') return `₹${Number(value).toFixed(2)}`;
                        if (name === 'Total Trips') return value;
                        return value;
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="profitPerKm" 
                      stroke="#10b981" 
                      name="Profit per KM"
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="trips" 
                      stroke="#3b82f6" 
                      name="Total Trips"
                      strokeWidth={2}
                      yAxisId="right"
                      dot={{ fill: '#3b82f6' }}
                    />
                    <YAxis yAxisId="right" orientation="right" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Live KPIs View */}
        {activeView === 'insights' && (
          <div className="space-y-6">
            {/* Real-time KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards && kpiCards
                .filter(kpi => ['pnl', 'revenue', 'expenses', 'trips', 'fuel', 'mileage', 'utilization'].includes(kpi.theme))
                .slice(0, 12)
                .map((kpi) => (
                  <div key={kpi.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {kpi.kpi_title}
                      </span>
                      {kpi.kpi_payload.trend && (
                        <div className={`flex items-center ${
                          kpi.kpi_payload.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {kpi.kpi_payload.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {kpi.kpi_value_human}
                    </div>
                    {kpi.kpi_payload.change && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {kpi.kpi_payload.change} {kpi.kpi_payload.period}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Anomaly Detection */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                Anomaly Detection & Alerts
              </h3>
              <div className="space-y-3">
                {aiInsights && aiInsights
                  .filter((insight: any) => insight.priority === 'high' || insight.priority === 'medium')
                  .slice(0, 5)
                  .map((alert: any) => (
                    <div key={alert.id} className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {alert.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="ml-3"
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts Section - Enhanced */}
        {showCharts && activeView === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <LineChart className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
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
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
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
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
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
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-l-2 border-blue-500 pl-2">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={clearFilters}
                icon={<X className="h-4 w-4" />}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Quick Filters:</span>
              <button
                onClick={() => setSelectedProfitStatus('profit')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedProfitStatus === 'profit'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Profitable Only
              </button>
              <button
                onClick={() => setSelectedProfitStatus('loss')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedProfitStatus === 'loss'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Loss Only
              </button>
              <button
                onClick={() => setSelectedDatePreset('last7days')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDatePreset === 'last7days'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setSelectedDatePreset('last30days')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDatePreset === 'last30days'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setSelectedDatePreset('thismonth')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDatePreset === 'thismonth'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driver
                </label>
                <Select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  options={[
                    { value: '', label: 'All Drivers' },
                    ...drivers.filter(driver => driver.id).map(driver => ({
                      value: driver.id!,
                      label: driver.name || 'Unknown'
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer
                </label>
                <Select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  options={[
                    { value: '', label: 'All Customers' },
                    ...destinations.map(dest => ({
                      value: dest.id,
                      label: dest.name
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Billing Type
                </label>
                <Select
                  value={selectedBillingType}
                  onChange={(e) => setSelectedBillingType(e.target.value)}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'per_km', label: 'Per KM' },
                    { value: 'per_ton', label: 'Per Ton' },
                    { value: 'manual', label: 'Manual' }
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Trips Table - Enhanced */}
        {activeView === 'summary' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trip Details ({filteredTrips.length} trips)
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
                  <Select
                    value={itemsPerPage.toString()}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' }
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No trips found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your filters to see more results.</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-4 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div
                    className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                      onClick={() => handleSort('trip_serial_number')}
                    >
                        Trip Details
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                  <div
                    className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                      onClick={() => handleSort('vehicle_id')}
                    >
                        Vehicle & Driver
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                  <div
                    className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                      onClick={() => handleSort('income_amount')}
                    >
                        Financial Summary
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
              </div>

              {/* Virtual List */}
              <FixedSizeList
                height={600}
                itemCount={sortedTrips.length}
                itemSize={120}
                width="100%"
                className="scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600"
              >
                {({ index, style }: { index: number; style: React.CSSProperties }) => {
                  const trip = sortedTrips[index];
                  return (
                    <div
                      style={style}
                      className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleTripClick(trip)}
                    >
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {trip.trip_serial_number}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {format(parseISO(trip.trip_start_date), 'dd MMM yyyy')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {((trip.end_km || 0) - (trip.start_km || 0))} km
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getVehicleName(trip.vehicle_id)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getDriverName(trip.driver_id)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getWarehouseName(trip.warehouse_id)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Income:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              ₹{(trip.income_amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Expense:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              ₹{(trip.total_expense || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t dark:border-gray-700 pt-1">
                            <span className="text-gray-900 dark:text-gray-100">Profit:</span>
                            <span className={
                              (trip.net_profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }>
                              ₹{(trip.net_profit || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getProfitStatusColor(trip.profit_status || '')
                        }`}>
                          {trip.profit_status || 'N/A'}
                        </span>
                        {trip.billing_type && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {trip.billing_type}
                          </div>
                        )}
                      </div>
                      <div>
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTripClick(trip);
                            }}
                            icon={<Eye className="h-3 w-3" />}
                          >
                            View
                          </Button>
                        </div>
                    </div>
                  );
                }}
              </FixedSizeList>
            </div>
          )}

          {/* Pagination */}
          {filteredTrips.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrips.length)} of {filteredTrips.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
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
                            <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "primary" : "outline"}
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

        {/* Quick Income Entry Modal */}
        <QuickIncomeEntry
          isOpen={showIncomeEntry}
          onClose={() => setShowIncomeEntry(false)}
          trips={filteredTrips}
          onUpdate={() => {
            // Reload trips data
            fetchData();
          }}
        />
      </div>
    </Layout>
  );
};

export default TripPnlReportsPage;
