import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, X, Truck, User, Calendar, Building2, MapPin, 
  ClipboardList, Loader2
} from 'lucide-react';

interface UnifiedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (searchTerm: string, searchField?: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchResult?: {
    totalCount?: number;
    searchTime?: number;
    matchedFields?: string[];
  };
}

// Field configurations with icons
const FIELD_INDICATORS = [
  { id: 'trip', icon: <ClipboardList className="h-3 w-3" />, label: 'Trip', color: '#3b82f6' },
  { id: 'vehicle', icon: <Truck className="h-3 w-3" />, label: 'Vehicle', color: '#a855f7' },
  { id: 'driver', icon: <User className="h-3 w-3" />, label: 'Driver', color: '#10b981' },
  { id: 'date', icon: <Calendar className="h-3 w-3" />, label: 'Date', color: '#f97316' },
  { id: 'warehouse', icon: <Building2 className="h-3 w-3" />, label: 'Warehouse', color: '#ef4444' },
  { id: 'destination', icon: <MapPin className="h-3 w-3" />, label: 'Destination', color: '#06b6d4' }
];

// Searchable fields categorized
const SEARCH_CATEGORIES = {
  trip: {
    label: 'Trip Information',
    fields: [
      { id: 'trip_id', label: 'Trip ID', dbField: 'id' },
      { id: 'trip_serial_number', label: 'Trip Serial Number', dbField: 'trip_serial_number' },
      { id: 'trip_sheet_number', label: 'Trip Sheet Number', dbField: 'trip_sheet_number' }
    ]
  },
  vehicle: {
    label: 'Vehicle Details',
    fields: [
      { id: 'vehicle_registration', label: 'Vehicle Registration', dbField: 'vehicle.registration_number' },
      { id: 'start_km', label: 'Start KM', dbField: 'start_km' },
      { id: 'end_km', label: 'End KM', dbField: 'end_km' },
      { id: 'total_distance', label: 'Total Distance', dbField: 'total_distance' }
    ]
  },
  driver: {
    label: 'Driver Information',
    fields: [
      { id: 'driver_name', label: 'Driver Name', dbField: 'driver.name' },
      { id: 'driver_allowance', label: 'Driver Allowance', dbField: 'driver_allowance' },
      { id: 'helper_bata', label: 'Helper Bata', dbField: 'helper_bata' }
    ]
  },
  location: {
    label: 'Locations',
    fields: [
      { id: 'trip_start_location', label: 'Start Location', dbField: 'trip_start_location' },
      { id: 'trip_end_location', label: 'End Location', dbField: 'trip_end_location' },
      { id: 'destinations', label: 'Destinations', dbField: 'destinations' }
    ]
  },
  financial: {
    label: 'Financial',
    fields: [
      { id: 'total_expenses', label: 'Total Expenses', dbField: 'total_expenses' },
      { id: 'toll_amount', label: 'Toll Amount', dbField: 'toll_amount' },
      { id: 'customer_payment', label: 'Customer Payment', dbField: 'customer_payment' },
      { id: 'total_fuel_cost', label: 'Fuel Cost', dbField: 'total_fuel_cost' }
    ]
  },
  date: {
    label: 'Dates',
    fields: [
      { id: 'trip_start_date', label: 'Start Date', dbField: 'trip_start_date' },
      { id: 'trip_end_date', label: 'End Date', dbField: 'trip_end_date' }
    ]
  }
};

const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isSearching = false,
  placeholder = "Search trips...",
  className = "",
  disabled = false,
  searchResult
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState<'quick' | 'filtered'>('quick');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [autoSearchCount, setAutoSearchCount] = useState(0);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);

    // Show dropdown when typing starts (after 3 chars)
    if (newValue.length >= 3 && !selectedField) {
      setShowDropdown(true);
      
      // Auto search logic (only 2 times)
      if (autoSearchCount < 2) {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
          performAutoSearch(newValue);
        }, 600);
      }
    } else if (newValue.length < 3) {
      setShowDropdown(false);
      setAutoSearchCount(0); // Reset counter when clearing
    }
  };

  // Perform auto search
  const performAutoSearch = (searchTerm: string) => {
    if (searchTerm.length >= 3 && autoSearchCount < 2) {
      setAutoSearchCount(prev => prev + 1);
      onSearch(searchTerm, selectedField || undefined);
      updateActiveIndicators(searchTerm);
    }
  };

  // Handle manual search (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localValue.length >= 3) {
      e.preventDefault();
      setShowDropdown(false);
      onSearch(localValue, selectedField || undefined);
      updateActiveIndicators(localValue);
    }
    
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedCategory(null);
      setSelectedField(null);
    }
  };

  // Update active field indicators based on search
  const updateActiveIndicators = (searchTerm: string) => {
    const active = new Set<string>();
    
    // Simple heuristic to determine which fields might be active
    const lowerSearch = searchTerm.toLowerCase();
    
    if (/^\d+$/.test(searchTerm)) {
      active.add('trip'); // Numbers likely trip IDs
      active.add('vehicle'); // Or KM readings
    }
    
    if (lowerSearch.includes('cg') || lowerSearch.includes('mp') || lowerSearch.includes('rj')) {
      active.add('vehicle'); // State codes for vehicles
    }
    
    if (/\d{2}[-/]\d{2}/.test(searchTerm)) {
      active.add('date'); // Date patterns
    }
    
    if (lowerSearch.match(/[a-z]+/)) {
      active.add('driver'); // Names
      active.add('destination'); // Places
    }
    
    setActiveIndicators(active);
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchMode('filtered');
  };

  // Handle field selection
  const handleFieldSelect = (field: any, category: string) => {
    setSelectedField(field.dbField);
    setSelectedCategory(category);
    setShowDropdown(false);
    setSearchMode('filtered');
    inputRef.current?.focus();
    
    // Clear and reset for new search
    setLocalValue('');
    onChange('');
    setAutoSearchCount(0);
  };

  // Clear search
  const handleClear = () => {
    setLocalValue('');
    onChange('');
    setSelectedCategory(null);
    setSelectedField(null);
    setSearchMode('quick');
    setAutoSearchCount(0);
    setActiveIndicators(new Set());
    
    // Clear any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    inputRef.current?.focus();
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          !inputRef.current?.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Search Input Container */}
        <div className="relative flex-1 flex items-center bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
          {/* Search Icon */}
          <div className="pl-3 pr-2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </div>

          {/* Selected Field Badge */}
          {selectedField && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
              <span>{selectedCategory}:</span>
              <button
                onClick={() => {
                  setSelectedField(null);
                  setSelectedCategory(null);
                  setSearchMode('quick');
                }}
                className="ml-1 hover:text-primary-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedField ? `Search in ${selectedCategory}...` : placeholder}
            disabled={disabled}
            className="flex-1 py-2 px-2 text-sm bg-transparent outline-none placeholder-gray-400"
          />

          {/* Field Indicators */}
          <div className="flex items-center gap-1 px-2 border-l border-gray-200">
            {FIELD_INDICATORS.map((field) => (
              <div
                key={field.id}
                className={`p-1 rounded transition-all ${
                  activeIndicators.has(field.id)
                    ? 'bg-gray-100 text-gray-700'
                    : 'text-gray-400'
                }`}
                title={field.label}
              >
                {field.icon}
              </div>
            ))}
          </div>

          {/* Clear Button */}
          {localValue && (
            <button
              onClick={handleClear}
              className="p-1 mr-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Button */}
        <button
          onClick={() => onSearch(localValue, selectedField || undefined)}
          disabled={disabled || localValue.length < 3}
          className={`ml-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm transition-all ${
            disabled || localValue.length < 3
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-primary-700 active:transform active:scale-95'
          }`}
        >
          Search
        </button>

        {/* Results Counter */}
        {searchResult && !isSearching && (
          <div className="ml-3 text-xs text-gray-500 whitespace-nowrap">
            {searchResult.totalCount || 0} results in {searchResult.searchTime?.toFixed(1) || '0.0'}ms
          </div>
        )}
      </div>

      {/* Dropdown for filtered search */}
      {showDropdown && localValue.length >= 3 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Quick Search Option */}
          <button
            onClick={() => {
              setShowDropdown(false);
              onSearch(localValue);
              setSearchMode('quick');
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Search "{localValue}" in all fields</span>
            </div>
          </button>

          {/* Category Options */}
          <div className="p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">
              Search in specific field:
            </div>
            
            {Object.entries(SEARCH_CATEGORIES).map(([key, category]) => (
              <div key={key} className="mt-2">
                <div 
                  className="px-2 py-1 text-xs font-medium text-gray-700 flex items-center gap-1"
                >
                  {FIELD_INDICATORS.find(f => f.id === key)?.icon}
                  {category.label}
                </div>
                <div className="ml-2">
                  {category.fields.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => handleFieldSelect(field, key)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded transition-colors"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedSearchBar;
