import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Filter, X, Calendar, Search, BarChart3 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import Checkbox from '../ui/Checkbox';
import { TripFilters, QUICK_FILTERS, TripStatistics } from '../../utils/tripSearch';
import { Vehicle, Driver, Warehouse } from '@/types';
import { MaterialType } from '../../utils/materialTypes';

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
  className = ''
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
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Left side - Title and Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">Trip Filters</h3>
              {activeFilterCount > 0 && (
                <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                  {activeFilterCount}
                </span>
              )}
            </div>
            
            {statistics && (
              <div className="text-sm text-gray-600 hidden sm:block">
                {formatNumber(statistics.totalTrips)} trips • {formatNumber(statistics.totalDistance)} km • {formatCurrency(statistics.totalExpenses)}
              </div>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
              icon={<X className="h-4 w-4" />}
            >
              Clear All
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              icon={isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            >
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>

        {/* Search Bar - Always Visible */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search trips by serial, vehicle, or driver..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 pr-4"
            disabled={isSearching}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant={filters.dateRange === 'today' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => applyQuickFilter(QUICK_FILTERS.today)}
          >
            Today
          </Button>
          <Button
            variant={filters.dateRange === 'week' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => applyQuickFilter(QUICK_FILTERS.week)}
          >
            This Week
          </Button>
          <Button
            variant={filters.dateRange === 'month' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => applyQuickFilter(QUICK_FILTERS.month)}
          >
            This Month
          </Button>
        </div>

        {/* Mobile Statistics */}
        {statistics && (
          <div className="mt-3 text-sm text-gray-600 sm:hidden">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {formatNumber(statistics.totalTrips)} trips
              </span>
              <span>{formatNumber(statistics.totalDistance)} km</span>
              <span>{formatCurrency(statistics.totalExpenses)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4 animate-in slide-in-from-top duration-200">
          {/* Row 1: Vehicle, Driver, Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                size="sm"
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
                size="sm"
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
                size="sm"
              />
            </div>
          </div>

          {/* Row 2: Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                size="sm"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                size="sm"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <Select
                options={[
                  { value: 'date-desc', label: 'Newest First' },
                  { value: 'date-asc', label: 'Oldest First' },
                  { value: 'distance-desc', label: 'Longest Distance' },
                  { value: 'distance-asc', label: 'Shortest Distance' },
                  { value: 'cost-desc', label: 'Highest Cost' },
                  { value: 'cost-asc', label: 'Lowest Cost' }
                ]}
                value={filters.sortBy || 'date-desc'}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                size="sm"
              />
            </div>
          </div>

          {/* Row 3: Materials and Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                size="sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Types</label>
              <MultiSelect
                options={materialTypes.map(material => ({
                  value: material.id,
                  label: material.name
                }))}
                value={filters.materials || []}
                onChange={(materials) => updateFilter('materials', materials)}
                size="sm"
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