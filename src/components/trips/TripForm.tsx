// EnhancedAdminTripsPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trip, Vehicle, Driver, Warehouse } from '@/types';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-toastify';
import {
  FileText, Filter, Download, Upload, RefreshCw, TrendingUp,
  BarChart2, PieChart, Activity, DollarSign, Truck, Users,
  Calendar, ChevronDown, Search, CheckSquare, Settings,
  Send, Printer, Copy, Eye, Edit, Trash2, MapPin
} from 'lucide-react';

// Enhanced Admin Interface
interface EnhancedAdminTripsPageProps {
  // Your existing props
}

const EnhancedAdminTripsPage: React.FC = () => {
  // State Management
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table');
  const [quickStats, setQuickStats] = useState({
    todayTrips: 0,
    weekTrips: 0,
    monthRevenue: 0,
    avgMileage: 0,
    profitMargin: 0,
    topPerformer: null as any
  });

  // Advanced Filters State
  const [filters, setFilters] = useState({
    dateRange: { start: null as Date | null, end: null as Date | null },
    vehicleIds: [] as string[],
    driverIds: [] as string[],
    warehouseIds: [] as string[],
    destinationIds: [] as string[],
    tripType: '' as '' | 'one_way' | 'round_trip' | 'multi_stop',
    profitStatus: '' as '' | 'profit' | 'loss' | 'neutral',
    mileageRange: { min: 0, max: 100 },
    expenseRange: { min: 0, max: 100000 },
    search: '',
    tags: [] as string[],
    hasIssues: null as boolean | null,
    documentStatus: '' as '' | 'complete' | 'incomplete'
  });

  // Bulk Operations
  const bulkOperations = {
    updateFreightRate: async (tripIds: string[], rate: number) => {
      try {
        const updates = tripIds.map(id => 
          updateTrip(id, { freight_rate: rate })
        );
        await Promise.all(updates);
        toast.success(`Updated freight rate for ${tripIds.length} trips`);
        refreshData();
      } catch (error) {
        toast.error('Failed to update freight rates');
      }
    },

    generateInvoices: async (tripIds: string[]) => {
      try {
        // Generate invoice logic here
        toast.success(`Generated invoices for ${tripIds.length} trips`);
      } catch (error) {
        toast.error('Failed to generate invoices');
      }
    },

    sendWhatsApp: async (tripIds: string[]) => {
      const selectedTripsData = trips.filter(t => tripIds.includes(t.id));
      const message = generateWhatsAppSummary(selectedTripsData);
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
    },

    exportToExcel: async (tripIds: string[]) => {
      const selectedTripsData = trips.filter(t => tripIds.includes(t.id));
      exportToExcel(selectedTripsData);
    },

    deleteTrips: async (tripIds: string[]) => {
      if (!confirm(`Delete ${tripIds.length} trips? This cannot be undone.`)) return;
      
      try {
        await Promise.all(tripIds.map(id => deleteTrip(id)));
        toast.success(`Deleted ${tripIds.length} trips`);
        refreshData();
      } catch (error) {
        toast.error('Failed to delete trips');
      }
    }
  };

  // Quick Actions Component
  const QuickActionsBar = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium">
            {selectedTrips.size} trips selected
          </span>
        </div>
        
        {selectedTrips.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => bulkOperations.exportToExcel(Array.from(selectedTrips))}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            
            <button
              onClick={() => bulkOperations.sendWhatsApp(Array.from(selectedTrips))}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              WhatsApp
            </button>
            
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Bulk Edit
            </button>
            
            <button
              onClick={() => bulkOperations.deleteTrips(Array.from(selectedTrips))}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced Statistics Dashboard
  const EnhancedStatsDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <span className="text-xs text-blue-600 font-medium">+12%</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{quickStats.todayTrips}</div>
        <div className="text-xs text-gray-600">Today's Trips</div>
      </div>
      
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <span className="text-xs text-green-600 font-medium">+8%</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">₹{quickStats.monthRevenue}</div>
        <div className="text-xs text-gray-600">Month Revenue</div>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Activity className="h-5 w-5 text-purple-600" />
          <span className="text-xs text-purple-600 font-medium">Avg</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{quickStats.avgMileage} km/L</div>
        <div className="text-xs text-gray-600">Avg Mileage</div>
      </div>
      
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <span className="text-xs text-orange-600 font-medium">Margin</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{quickStats.profitMargin}%</div>
        <div className="text-xs text-gray-600">Profit Margin</div>
      </div>
      
      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <MapPin className="h-5 w-5 text-pink-600" />
          <span className="text-xs text-pink-600 font-medium">Routes</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{quickStats.weekTrips}</div>
        <div className="text-xs text-gray-600">Week Trips</div>
      </div>
      
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <span className="text-xs text-indigo-600 font-medium">Top</span>
        </div>
        <div className="text-lg font-bold text-gray-900 truncate">
          {quickStats.topPerformer?.name || 'N/A'}
        </div>
        <div className="text-xs text-gray-600">Best Driver</div>
      </div>
    </div>
  );

  // Smart Filter Panel
  const SmartFilterPanel = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Smart Filters
        </h3>
        <div className="flex gap-2">
          <button
            onClick={applyPresetFilter('today')}
            className="px-3 py-1 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Today
          </button>
          <button
            onClick={applyPresetFilter('week')}
            className="px-3 py-1 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            This Week
          </button>
          <button
            onClick={applyPresetFilter('profitable')}
            className="px-3 py-1 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Profitable
          </button>
          <button
            onClick={applyPresetFilter('issues')}
            className="px-3 py-1 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Has Issues
          </button>
        </div>
      </div>
      
      {/* Advanced Filter Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Date Range Picker */}
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600">Date Range</label>
          <div className="flex gap-2 mt-1">
            <input
              type="date"
              value={filters.dateRange.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
              }))}
              className="flex-1 px-2 py-1 text-sm border rounded-lg"
            />
            <input
              type="date"
              value={filters.dateRange.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
              }))}
              className="flex-1 px-2 py-1 text-sm border rounded-lg"
            />
          </div>
        </div>
        
        {/* Multi-select for Vehicles */}
        <div>
          <label className="text-xs font-medium text-gray-600">Vehicles</label>
          <select
            multiple
            value={filters.vehicleIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              setFilters(prev => ({ ...prev, vehicleIds: selected }));
            }}
            className="w-full mt-1 px-2 py-1 text-sm border rounded-lg"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number}</option>
            ))}
          </select>
        </div>
        
        {/* Profit Status */}
        <div>
          <label className="text-xs font-medium text-gray-600">Profit Status</label>
          <select
            value={filters.profitStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, profitStatus: e.target.value as any }))}
            className="w-full mt-1 px-2 py-1 text-sm border rounded-lg"
          >
            <option value="">All</option>
            <option value="profit">Profitable</option>
            <option value="loss">Loss Making</option>
            <option value="neutral">Break Even</option>
          </select>
        </div>
        
        {/* Mileage Range Slider */}
        <div>
          <label className="text-xs font-medium text-gray-600">
            Mileage: {filters.mileageRange.min}-{filters.mileageRange.max} km/L
          </label>
          <div className="flex gap-2 mt-1">
            <input
              type="range"
              min="0"
              max="50"
              value={filters.mileageRange.min}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                mileageRange: { ...prev.mileageRange, min: Number(e.target.value) }
              }))}
              className="flex-1"
            />
            <input
              type="range"
              min="0"
              max="50"
              value={filters.mileageRange.max}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                mileageRange: { ...prev.mileageRange, max: Number(e.target.value) }
              }))}
              className="flex-1"
            />
          </div>
        </div>
        
        {/* Search */}
        <div>
          <label className="text-xs font-medium text-gray-600">Search</label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Trip ID, notes..."
              className="w-full pl-8 pr-2 py-1 text-sm border rounded-lg"
            />
          </div>
        </div>
      </div>
      
      {/* Active Filters Display */}
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.vehicleIds.length > 0 && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            {filters.vehicleIds.length} vehicles
          </span>
        )}
        {filters.profitStatus && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            {filters.profitStatus}
          </span>
        )}
        {(filters.dateRange.start || filters.dateRange.end) && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
            Custom date range
          </span>
        )}
      </div>
    </div>
  );

  // Enhanced Trip Card for Card View
  const EnhancedTripCard = ({ trip }: { trip: Trip }) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
    const driver = drivers.find(d => d.id === trip.driver_id);
    const profitClass = trip.net_profit > 0 ? 'text-green-600' : 
                       trip.net_profit < 0 ? 'text-red-600' : 'text-gray-600';
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900">{trip.trip_serial_number}</h4>
            <p className="text-xs text-gray-500">
              {format(new Date(trip.trip_start_date), 'dd MMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedTrips.has(trip.id)}
              onChange={(e) => {
                const newSelected = new Set(selectedTrips);
                if (e.target.checked) {
                  newSelected.add(trip.id);
                } else {
                  newSelected.delete(trip.id);
                }
                setSelectedTrips(newSelected);
              }}
              className="rounded"
            />
            <div className={`px-2 py-1 text-xs font-medium rounded-full ${
              trip.profit_status === 'profit' ? 'bg-green-100 text-green-700' :
              trip.profit_status === 'loss' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {trip.profit_status}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-400" />
            <span>{vehicle?.registration_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{driver?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{trip.end_km - trip.start_km} km</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Net Profit</p>
            <p className={`font-semibold ${profitClass}`}>
              ₹{trip.net_profit?.toLocaleString() || 0}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handleViewTrip(trip)}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEditTrip(trip)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePrintTrip(trip)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Kanban Board View
  const KanbanBoard = () => {
    const columns = {
      pending: trips.filter(t => !t.income_amount),
      inProgress: trips.filter(t => t.income_amount && !t.net_profit),
      completed: trips.filter(t => t.net_profit !== undefined)
    };
    
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(columns).map(([status, columnTrips]) => (
          <div key={status} className="min-w-[300px] bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3 capitalize">
              {status} ({columnTrips.length})
            </h3>
            <div className="space-y-2">
              {columnTrips.slice(0, 10).map(trip => (
                <EnhancedTripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Management Admin</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and analyze all trip records
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm rounded ${
                viewMode === 'table' ? 'bg-white shadow-sm' : ''
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm rounded ${
                viewMode === 'cards' ? 'bg-white shadow-sm' : ''
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm rounded ${
                viewMode === 'kanban' ? 'bg-white shadow-sm' : ''
              }`}
            >
              Kanban
            </button>
          </div>
          
          <button
            onClick={refreshData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Enhanced Stats Dashboard */}
      <EnhancedStatsDashboard />
      
      {/* Smart Filter Panel */}
      <SmartFilterPanel />
      
      {/* Quick Actions Bar */}
      {selectedTrips.size > 0 && <QuickActionsBar />}
      
      {/* Content Area */}
      <div className="bg-white rounded-lg shadow-sm">
        {viewMode === 'table' && (
          // Your existing table component
          <div>Table View</div>
        )}
        
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredTrips.map(trip => (
              <EnhancedTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
        
        {viewMode === 'kanban' && (
          <div className="p-4">
            <KanbanBoard />
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAdminTripsPage;