import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Filter, X, Calendar, Search, BarChart3, List, Grid3X3, TableProperties, LayoutGrid } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import Checkbox from '../ui/Checkbox';
import UnifiedSearchBar from './UnifiedSearchBar';
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
    totalResults?: number;
    totalCount?: number;
  };
  onSmartSearch?: (searchTerm: string, searchField?: string) => void;
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
  onSmartSearch
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') return false;
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

  // Handle search
  const handleSearch = useCallback((searchTerm: string, searchField?: string) => {
    if (onSmartSearch) {
      onSmartSearch(searchTerm, searchField);
    } else {
      updateFilter('search', searchTerm);
    }
  }, [onSmartSearch, updateFilter]);

  return (
    <div className={`bg-gray-50 border-b border-gray-200 ${className}`}>
      <div className="px-4 py-2">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          {/* Left: Time Filters and Sorting */}
          <div className="flex items-center gap-2">
            {/* Quick Date Filters */}
            <button
              onClick={() => applyQuickFilter(QUICK_FILTERS.today)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filters.dateRange === 'today' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyQuickFilter(QUICK_FILTERS.thisWeek)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filters.dateRange === 'week' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => applyQuickFilter(QUICK_FILTERS.thisMonth)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filters.dateRange === 'month' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              This Month
            </button>
            
            {/* Sort Dropdown */}
            <select
              value={filters.sortBy || 'date-desc'}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="distance-desc">Distance ↓</option>
              <option value="distance-asc">Distance ↑</option>
              <option value="cost-desc">Cost ↓</option>
              <option value="cost-asc">Cost ↑</option>
            </select>
          </div>

          {/* Right: View Modes and Filters Toggle */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            {onViewModeChange && (
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'list' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onViewModeChange('cards')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'cards' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'table' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Table View"
                >
                  <TableProperties className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            
            {/* Filters Toggle Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                activeFilterCount > 0 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>Show Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-orange-600 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <UnifiedSearchBar
              value={filters.search || ''}
              onChange={(value) => updateFilter('search', value)}
              onSearch={handleSearch}
              isSearching={isSearching}
              placeholder="Type and press Enter to search..."
              className="w-full"
              disabled={isSearching}
              searchResult={{
                totalCount: searchResult?.totalResults || searchResult?.totalCount,
                searchTime: searchResult?.searchTime,
                matchedFields: searchResult?.matchedFields
              }}
            />
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Vehicle Filter */}
              <Select
                label="Vehicle"
                options={[
                  { value: '', label: 'All Vehicles' },
                  ...vehicles
                    .filter(v => v.status !== 'archived')
                    .map(v => ({ value: v.id, label: v.registration_number }))
                ]}
                value={filters.vehicle || ''}
                onChange={(e) => updateFilter('vehicle', e.target.value)}
              />

              {/* Driver Filter */}
              <Select
                label="Driver"
                options={[
                  { value: '', label: 'All Drivers' },
                  ...drivers
                    .filter(d => d.status === 'active')
                    .map(d => ({ value: d.id, label: d.name }))
                ]}
                value={filters.driver || ''}
                onChange={(e) => updateFilter('driver', e.target.value)}
              />

              {/* Warehouse Filter */}
              <Select
                label="Warehouse"
                options={[
                  { value: '', label: 'All Warehouses' },
                  ...warehouses.map(w => ({ value: w.id, label: w.name }))
                ]}
                value={filters.warehouse || ''}
                onChange={(e) => updateFilter('warehouse', e.target.value)}
              />

              {/* Refueling Status */}
              <Select
                label="Refueling"
                options={[
                  { value: 'all', label: 'All Trips' },
                  { value: 'refueling', label: 'With Refueling' },
                  { value: 'no-refueling', label: 'No Refueling' }
                ]}
                value={filters.refueling || 'all'}
                onChange={(e) => updateFilter('refueling', e.target.value)}
              />

              {/* Material Types */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Materials
                </label>
                <MultiSelect
                  options={materialTypes.map(m => ({ value: m.id, label: m.name }))}
                  value={filters.materials || []}
                  onChange={(selected) => updateFilter('materials', selected)}
                  placeholder="Select materials"
                />
              </div>

              {/* Route Deviation */}
              <div className="flex items-end">
                <Checkbox
                  label="High Deviation Only"
                  checked={filters.routeDeviation || false}
                  onChange={(checked) => updateFilter('routeDeviation', checked)}
                />
              </div>

              {/* Date Range */}
              {filters.dateRange === 'custom' && (
                <>
                  <Input
                    label="Start Date"
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                  />
                </>
              )}
            </div>

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Statistics Bar */}
        {statistics && (
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
            <span>
              <strong>{statistics.totalTrips}</strong> trips
            </span>
            <span>
              <strong>{statistics.totalDistance.toFixed(0)}</strong> km total
            </span>
            <span>
              <strong>₹{statistics.totalExpenses.toFixed(0)}</strong> expenses
            </span>
            {statistics.avgMileage > 0 && (
              <span>
                <strong>{statistics.avgMileage.toFixed(1)}</strong> km/L avg
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComprehensiveFilters;