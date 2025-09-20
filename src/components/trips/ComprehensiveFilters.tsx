import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Filter, X, Calendar, Search, BarChart3, List, Grid3X3, TableProperties, LayoutGrid } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import Checkbox from '../ui/Checkbox';
import EnhancedSearchBar from './EnhancedSearchBar';
import UltraSmartSearch from './UltraSmartSearch';
import { TripFilters, QUICK_FILTERS, TripStatistics } from '../../utils/tripSearch';
import { Vehicle, Driver, Warehouse } from '@/types';
import { MaterialType } from '../../utils/materialTypes';

export type ViewMode = 'list' | 'cards' | 'table';

interface ComprehensiveFiltersProps {
  filters: TripFilters;
  onFiltersChange: (filters: TripFilters) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  warehouses: Warehouse[];
  materialTypes: MaterialType[];
  statistics?: TripStatistics;
  isSearching?: boolean;
  className?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  searchResult?: {
    matchedFields?: string[];
    searchTime?: number;
  };
  useUltraSmartSearch?: boolean;
}

const ComprehensiveFilters: React.FC<ComprehensiveFiltersProps> = ({
  filters,
  onFiltersChange,
  vehicles,
  drivers,
  warehouses,
  materialTypes,
  statistics,
  isSearching = false,
  className = '',
  viewMode = 'cards',
  onViewModeChange,
  searchResult,
  useUltraSmartSearch = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') return false; // Don't count sort as active filter
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== 'all';
  }).length;

  // Handle filter changes
  const updateFilter = useCallback((key: keyof TripFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  // Quick filter handlers
  const applyQuickFilter = (quickFilter: () => Partial<TripFilters>) => {
    onFiltersChange({
      ...filters,
      ...quickFilter()
    });
  };

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      vehicle: '',
      driver: '',
      warehouse: '',
      refueling: 'all',
      dateRange: 'all',
      startDate: '',
      endDate: '',
      materials: [],
      routeDeviation: false,
      sortBy: 'date-desc'
    });
  };

  // Format statistics
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Compact Filter Bar */}
      <div className="p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Left side - Stats Badge */}
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 p-2 rounded-xl">
              <Filter className="h-5 w-5 text-primary-600" />
            </div>
            {statistics && (
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-gray-900">{formatNumber(statistics.totalTrips)}</span>
                  <span className="text-xs text-gray-500">trips</span>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{formatNumber(statistics.totalDistance)} km</span>
                  <span className="text-xs text-gray-500">• {formatCurrency(statistics.totalExpenses)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right side - View Selector and Actions */}
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
            
            {/* View Mode Selector */}
            {onViewModeChange && (
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('cards')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'cards' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'table' 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Table View"
                >
                  <TableProperties className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {isExpanded ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>

        {/* Compact Filter Row */}
        <div className="mt-4 flex flex-col lg:flex-row gap-3">
          {/* Enhanced Search Bar */}
          <div className="flex-1 lg:max-w-2xl">
            {useUltraSmartSearch ? (
              <UltraSmartSearch
                value={filters.search || ''}
                onChange={(value) => updateFilter('search', value)}
                onHighlightMatches={(query) => {
                  // This will be handled by the parent component
                  console.log('Highlighting matches for:', query);
                }}
                isSearching={isSearching}
                placeholder="Smart search across all trip data..."
                className="w-full"
                disabled={isSearching}
                searchHistory={[]} // TODO: Implement search history
                onSaveSearch={(query, filters) => {
                  console.log('Saving search:', query, filters);
                }}
                onExportResults={(format) => {
                  console.log('Exporting results as:', format);
                }}
              />
            ) : (
              <EnhancedSearchBar
                value={filters.search || ''}
                onChange={(value) => updateFilter('search', value)}
                onHighlightMatches={(query) => {
                  // This will be handled by the parent component
                  console.log('Highlighting matches for:', query);
                }}
                isSearching={isSearching}
                placeholder="Search by trip ID, vehicle, driver, location, date, distance, fuel, expenses..."
                className="w-full"
                disabled={isSearching}
                searchHistory={[]} // TODO: Implement search history
                onSaveSearch={(query, filters) => {
                  console.log('Saving search:', query, filters);
                }}
                onExportResults={(format) => {
                  console.log('Exporting results as:', format);
                }}
              />
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyQuickFilter(QUICK_FILTERS.today)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filters.dateRange === 'today' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyQuickFilter(QUICK_FILTERS.thisWeek)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filters.dateRange === 'week' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => applyQuickFilter(QUICK_FILTERS.thisMonth)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filters.dateRange === 'month' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              This Month
            </button>
          </div>
          
          {/* Sort Dropdown */}
          <select
            value={filters.sortBy || 'date-desc'}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="distance-desc">Longest Distance</option>
            <option value="distance-asc">Shortest Distance</option>
            <option value="cost-desc">Highest Cost</option>
            <option value="cost-asc">Lowest Cost</option>
          </select>
        </div>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="p-3 space-y-3 animate-in slide-in-from-top duration-200">
          {/* Row 1: Vehicle, Driver, Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
              <Select
                options={[
                  { value: '', label: 'All Vehicles' },
                  ...vehicles.map(vehicle => ({
                    value: vehicle.id,
                    label: vehicle.registration_number
                  }))
                ]}
                value={filters.vehicle || ''}
                onChange={(e) => updateFilter('vehicle', e.target.value)}
                inputSize="sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
              <Select
                options={[
                  { value: '', label: 'All Drivers' },
                  ...drivers.map(driver => ({
                    value: driver.id,
                    label: driver.name
                  }))
                ]}
                value={filters.driver || ''}
                onChange={(e) => updateFilter('driver', e.target.value)}
                inputSize="sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
              <Select
                options={[
                  { value: '', label: 'All Warehouses' },
                  ...warehouses.map(warehouse => ({
                    value: warehouse.id,
                    label: warehouse.name
                  }))
                ]}
                value={filters.warehouse || ''}
                onChange={(e) => updateFilter('warehouse', e.target.value)}
                inputSize="sm"
              />
            </div>
          </div>

          {/* Row 2: Date Range and Refueling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                inputSize="sm"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                inputSize="sm"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refueling Status</label>
              <Select
                options={[
                  { value: 'all', label: 'All Trips' },
                  { value: 'refueling', label: 'Refueling Trips' },
                  { value: 'no-refueling', label: 'No Refueling' }
                ]}
                value={filters.refueling || 'all'}
                onChange={(e) => updateFilter('refueling', e.target.value)}
                inputSize="sm"
              />
            </div>
          </div>

          {/* Row 3: Materials and Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Types</label>
              <MultiSelect
                options={materialTypes.map(material => ({
                  value: material.id,
                  label: material.name
                }))}
                value={filters.materials || []}
                onChange={(materials) => updateFilter('materials', materials)}
                inputSize="sm"
              />
            </div>
            
            <div className="flex items-end">
              <Checkbox
                label="Route Deviation > 8%"
                checked={filters.routeDeviation || false}
                onChange={(e) => updateFilter('routeDeviation', e.target.checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveFilters;