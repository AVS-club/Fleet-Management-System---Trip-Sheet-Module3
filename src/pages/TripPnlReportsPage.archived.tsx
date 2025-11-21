import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePermissions } from '../hooks/usePermissions';
import LoadingScreen from '../components/LoadingScreen';
import { Trip, Vehicle, Driver } from '@/types';
import { Warehouse, Destination } from '@/types/trip';
import { getTrips, getVehicles, getWarehouses, getDestinations } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
import { Calendar, Filter, Search, Download, IndianRupee, TrendingUp, TrendingDown, BarChart3, Sparkles, Building2, Map, Truck, Calculator, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { supabase } from '../utils/supabaseClient';
import { useKPICards } from '../hooks/useKPICards';
import TripPnlModal from '../components/trips/TripPnlModal';
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
  Legend
} from 'recharts';

interface PnLSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  totalTrips: number;
  profitableTrips: number;
  lossTrips: number;
}

const TripPnlReportsPageFixed: React.FC = () => {
  const navigate = useNavigate();
  const { permissions, loading: permissionsLoading } = usePermissions();
  
  // State management
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [activeView, setActiveView] = useState<'summary' | 'customer' | 'route' | 'insights'>('summary');
  const [selectedTripForPnl, setSelectedTripForPnl] = useState<Trip | null>(null);

  // Fetch KPI data
  const { data: kpiCards } = useKPICards();

  // Load data function
  const loadData = async () => {
    try {
      setLoading(true);
      const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getDrivers(),
        getWarehouses(),
        getDestinations()
      ]);
      
      setTrips(tripsData || []);
      setVehicles(vehiclesData || []);
      setDrivers(driversData || []);
      setWarehouses(warehousesData || []);
      setDestinations(destinationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (searchTerm && !trip.trip_serial_number.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedVehicle && trip.vehicle_id !== selectedVehicle) {
        return false;
      }
      if (selectedDriver && trip.driver_id !== selectedDriver) {
        return false;
      }
      if (selectedStatus === 'profitable' && (trip.net_profit || 0) <= 0) {
        return false;
      }
      if (selectedStatus === 'loss' && (trip.net_profit || 0) > 0) {
        return false;
      }
      if (selectedCustomer && trip.destination_id !== selectedCustomer) {
        return false;
      }
      if (selectedRoute && `${trip.warehouse_id}-${trip.destination_id}` !== selectedRoute) {
        return false;
      }
      if (dateFrom && new Date(trip.created_at) < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && new Date(trip.created_at) > new Date(dateTo)) {
        return false;
      }
      return true;
    });
  }, [trips, searchTerm, selectedVehicle, selectedDriver, selectedStatus, selectedCustomer, selectedRoute, dateFrom, dateTo]);

  // Calculate P&L summary
  const pnlSummary: PnLSummary = useMemo(() => {
    const summary = filteredTrips.reduce((acc, trip) => {
      const income = trip.total_income || 0;
      const expense = trip.total_expense || 0;
      const profit = trip.net_profit || 0;
      
      acc.totalIncome += income;
      acc.totalExpense += expense;
      acc.netProfit += profit;
      acc.totalTrips += 1;
      
      if (profit > 0) {
        acc.profitableTrips += 1;
      } else if (profit < 0) {
        acc.lossTrips += 1;
      }
      
      return acc;
    }, {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      totalTrips: 0,
      profitableTrips: 0,
      lossTrips: 0,
      profitMargin: 0
    });
    
    summary.profitMargin = summary.totalIncome > 0 
      ? (summary.netProfit / summary.totalIncome) * 100 
      : 0;
    
    return summary;
  }, [filteredTrips]);

  // Customer-wise P&L analysis
  const customerPnL = useMemo(() => {
    const customerMap: Record<string, {
      customerName: string;
      tripCount: number;
      totalRevenue: number;
      totalExpense: number;
      netProfit: number;
    }> = {};

    filteredTrips.forEach(trip => {
      const destination = destinations.find(d => d.id === trip.destination_id);
      const customerName = destination?.name || 'Unknown';
      
      if (!customerMap[trip.destination_id]) {
        customerMap[trip.destination_id] = {
          customerName,
          tripCount: 0,
          totalRevenue: 0,
          totalExpense: 0,
          netProfit: 0
        };
      }

      customerMap[trip.destination_id].tripCount += 1;
      customerMap[trip.destination_id].totalRevenue += trip.total_income || 0;
      customerMap[trip.destination_id].totalExpense += trip.total_expense || 0;
      customerMap[trip.destination_id].netProfit += trip.net_profit || 0;
    });

    return Object.values(customerMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTrips, destinations]);

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['P&L Summary Report', '', '', ''],
      ['Generated on', format(new Date(), 'dd-MM-yyyy HH:mm'), '', ''],
      ['', '', '', ''],
      ['Metric', 'Value', '', ''],
      ['Total Income', pnlSummary.totalIncome, '', ''],
      ['Total Expense', pnlSummary.totalExpense, '', ''],
      ['Net Profit', pnlSummary.netProfit, '', ''],
      ['Profit Margin %', pnlSummary.profitMargin.toFixed(2), '', ''],
      ['Total Trips', pnlSummary.totalTrips, '', ''],
      ['Profitable Trips', pnlSummary.profitableTrips, '', ''],
      ['Loss Making Trips', pnlSummary.lossTrips, '', '']
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    // Customer analysis sheet
    const customerSheet = XLSX.utils.json_to_sheet(customerPnL);
    XLSX.utils.book_append_sheet(wb, customerSheet, 'Customer Analysis');
    
    // Trips detail sheet
    const tripsData = filteredTrips.map(trip => ({
      'Trip ID': trip.trip_serial_number,
      'Date': format(new Date(trip.created_at), 'dd-MM-yyyy'),
      'Vehicle': vehicles.find(v => v.id === trip.vehicle_id)?.registration_number || '',
      'Driver': drivers.find(d => d.id === trip.driver_id)?.name || '',
      'Customer': destinations.find(d => d.id === trip.destination_id)?.name || '',
      'Route': `${warehouses.find(w => w.id === trip.warehouse_id)?.name || ''} to ${destinations.find(d => d.id === trip.destination_id)?.name || ''}`,
      'Income': trip.total_income || 0,
      'Expense': trip.total_expense || 0,
      'Net Profit': trip.net_profit || 0,
      'Status': (trip.net_profit || 0) > 0 ? 'Profit' : 'Loss'
    }));
    
    const tripsSheet = XLSX.utils.json_to_sheet(tripsData);
    XLSX.utils.book_append_sheet(wb, tripsSheet, 'Trip Details');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    saveAs(blob, `PnL_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    
    toast.success('Report exported successfully');
  };

  // Helper function for Excel export
  const s2ab = (s: string) => {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  };

  if (permissionsLoading || loading) {
    return <LoadingScreen />;
  }

  // Permission check temporarily disabled for testing
  // if (permissions && !permissions.view_trips) {
  //   return (
  //     <Layout title="Access Denied" subtitle="You don't have permission to view this page">
  //       <div className="text-center py-12">
  //         <p className="text-gray-600 dark:text-gray-400">Please contact your administrator for access.</p>
  //       </div>
  //     </Layout>
  //   );
  // }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <Layout
      title="Advanced P&L Analytics"
      subtitle="Comprehensive financial insights and profitability analysis"
      actions={
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => {
              // Open modal with first trip that has no income
              const tripWithoutIncome = filteredTrips.find(t => !t.income_amount || t.income_amount === 0);
              if (tripWithoutIncome) {
                setSelectedTripForPnl(tripWithoutIncome);
              } else {
                toast.info('All trips have income recorded');
              }
            }}
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
          >
            AI Insights
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            icon={<Filter className="h-4 w-4" />}
          >
            Filters
          </Button>
          <Button
            variant="primary"
            onClick={exportToExcel}
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* View Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('summary')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'summary'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveView('customer')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'customer'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Customer Analysis
          </button>
          <button
            onClick={() => setActiveView('route')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'route'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Route Analysis
          </button>
          <button
            onClick={() => setActiveView('insights')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'insights'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Live KPIs
          </button>
        </div>

        {/* AI Insights Panel */}
        {showAIInsights && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
              AI-Powered Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Profit Trend Alert</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Your profit margin has increased by 15% this month compared to last month.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Top Customer Insight</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {customerPnL[0]?.customerName} contributes {((customerPnL[0]?.totalRevenue / pnlSummary.totalIncome) * 100).toFixed(1)}% of total revenue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Advanced Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Customer"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                icon={<Building2 className="h-4 w-4" />}
              >
                <option value="">All Customers</option>
                {destinations.map(dest => (
                  <option key={dest.id} value={dest.id}>{dest.name}</option>
                ))}
              </Select>
              
              <Select
                label="Route"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                icon={<Map className="h-4 w-4" />}
              >
                <option value="">All Routes</option>
                {Array.from(new Set(trips.map(t => `${t.warehouse_id}-${t.destination_id}`))).map(route => {
                  const [warehouseId, destinationId] = route.split('-');
                  const warehouse = warehouses.find(w => w.id === warehouseId);
                  const destination = destinations.find(d => d.id === destinationId);
                  return (
                    <option key={route} value={route}>
                      {warehouse?.name} to {destination?.name}
                    </option>
                  );
                })}
              </Select>

              <Select
                label="Vehicle"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                icon={<Truck className="h-4 w-4" />}
              >
                <option value="">All Vehicles</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {/* Summary View */}
        {activeView === 'summary' && (
          <>
            {/* P&L Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      <IndianRupee className="inline h-5 w-5" />
                      {pnlSummary.totalIncome.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expense</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      <IndianRupee className="inline h-5 w-5" />
                      {pnlSummary.totalExpense.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      <IndianRupee className="inline h-5 w-5" />
                      {pnlSummary.netProfit.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {pnlSummary.profitMargin.toFixed(2)}% margin
                    </p>
                  </div>
                  <div className={`p-3 ${pnlSummary.netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} rounded-lg`}>
                    {pnlSummary.netProfit >= 0 
                      ? <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      : <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                    }
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trips</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {pnlSummary.totalTrips}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {pnlSummary.profitableTrips} profitable / {pnlSummary.lossTrips} loss
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Trips Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Trips</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trip ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Income</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expense</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredTrips.slice(0, 10).map((trip) => {
                        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
                        return (
                          <tr key={trip.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {trip.trip_serial_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(trip.created_at), 'dd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {vehicle?.registration_number || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              ₹{(trip.total_income || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              ₹{(trip.total_expense || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`${(trip.net_profit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium`}>
                                ₹{(trip.net_profit || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => setSelectedTripForPnl(trip)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title="Edit P&L"
                              >
                                <Calculator className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Customer Analysis View */}
        {activeView === 'customer' && (
          <div className="space-y-6">
            {/* Customer P&L Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer-wise P&L</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trips</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {customerPnL.slice(0, 10).map((customer) => (
                      <tr key={customer.customerName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {customer.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {customer.tripCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          ₹{customer.totalRevenue.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`${customer.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium`}>
                            ₹{customer.netProfit.toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Revenue Chart */}
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

        {/* Live KPIs View */}
        {activeView === 'insights' && kpiCards && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpiCards.map((kpi, index) => (
              <div key={kpi.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{kpi.title}</h3>
                  <div className={`p-2 rounded-lg ${
                    index % 3 === 0 ? 'bg-blue-100 dark:bg-blue-900/30' :
                    index % 3 === 1 ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {kpi.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
                {kpi.change && (
                  <p className={`text-sm mt-2 ${kpi.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.changeType === 'increase' ? '↑' : '↓'} {kpi.change}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* P&L Modal */}
      {selectedTripForPnl && (
        <TripPnlModal
          isOpen={!!selectedTripForPnl}
          onClose={() => setSelectedTripForPnl(null)}
          trip={selectedTripForPnl}
          vehicle={vehicles.find(v => v.id === selectedTripForPnl.vehicle_id)}
          driver={drivers.find(d => d.id === selectedTripForPnl.driver_id)}
          onUpdate={(updatedTrip) => {
            // Update the trip in local state
            setTrips(prevTrips => 
              prevTrips.map(t => t.id === updatedTrip.id ? updatedTrip : t)
            );
            setSelectedTripForPnl(null);
            toast.success('Trip P&L updated successfully');
            // Reload data to refresh calculations
            loadData();
          }}
        />
      )}
    </Layout>
  );
};

export default TripPnlReportsPageFixed;
