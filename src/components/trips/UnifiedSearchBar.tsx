import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, X, Truck, User, Calendar, Building2, MapPin, 
  ClipboardList, Loader2, Sparkles
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

// Field configurations with proper labels
const FIELD_INDICATORS = [
  { id: 'trip', icon: ClipboardList, label: 'Trip', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'vehicle', icon: Truck, label: 'Vehicle', color: 'text-purple-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'driver', icon: User, label: 'Driver', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { id: 'date', icon: Calendar, label: 'Date', color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { id: 'warehouse', icon: Building2, label: 'Warehouse', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  { id: 'destination', icon: MapPin, label: 'Destination', color: 'text-cyan-500', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' }
];

// Full searchable fields
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
  destination: {
    label: 'Locations',
    fields: [
      { id: 'trip_start_location', label: 'Start Location', dbField: 'trip_start_location' },
      { id: 'trip_end_location', label: 'End Location', dbField: 'trip_end_location' },
      { id: 'destinations', label: 'Destinations', dbField: 'destinations' }
    ]
  },
  warehouse: {
    label: 'Warehouse',
    fields: [
      { id: 'warehouse_name', label: 'Warehouse Name', dbField: 'warehouse.name' }
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
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<{ dbField: string, label: string } | null>(null);
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // IMPORTANT: NO AUTO-SEARCH - Only update local state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    // DO NOT CALL onChange HERE - only update local state
  };

  // Execute search ONLY on button click or Enter key
  const executeSearch = () => {
    if (localValue.length >= 3) {
      // Update parent's value only when searching
      onChange(localValue);
      
      let searchField = selectedField?.dbField;
      if (!searchField && selectedCategory) {
        searchField = selectedCategory;  // Use the category label
      }
      
      onSearch(localValue, searchField || undefined);
    }
  };

  // Handle Enter key - ONLY way to search via keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localValue.length >= 3) {
      e.preventDefault();
      executeSearch();
      // Keep focus on input after search
      inputRef.current?.focus();
    }
    
    if (e.key === 'Escape') {
      setShowFieldSelector(false);
      // Don't clear selections on Escape, just hide dropdown
    }
  };

  // Handle field indicator click
  const handleIndicatorClick = (fieldId: string) => {
    const field = FIELD_INDICATORS.find(f => f.id === fieldId);
    if (!field) return;
    
    if (activeIndicator === fieldId) {
      setActiveIndicator(null);
      setSelectedField(null);
      setSelectedCategory(null);
    } else {
      setActiveIndicator(fieldId);
      setSelectedCategory(field.label);  // <-- SET THE LABEL
      setSelectedField(null);  // Don't set a specific field, just the category
    }
    
    // Always keep focus on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle magic search click
  const handleMagicSearchClick = () => {
    setShowFieldSelector(!showFieldSelector);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle specific field selection from dropdown
  const handleFieldSelect = (field: any, categoryKey: string) => {
    const category = SEARCH_CATEGORIES[categoryKey as keyof typeof SEARCH_CATEGORIES];
    
    setSelectedField({ dbField: field.dbField, label: field.label });
    setSelectedCategory(category.label);
    setActiveIndicator(categoryKey);
    setShowFieldSelector(false);
    
    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Clear search
  const handleClear = () => {
    setLocalValue('');
    onChange('');
    setSelectedCategory(null);
    setSelectedField(null);
    setActiveIndicator(null);
    inputRef.current?.focus();
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          !inputRef.current?.contains(event.target as Node)) {
        setShowFieldSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);


  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Search Input Container */}
        <div className="relative flex-1 flex items-center bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
          {/* Search Icon */}
          <div className="pl-3 pr-1">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </div>

          {/* Selected Field Badge */}
          {selectedCategory && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium mr-1">
              <span>{selectedCategory}:</span>
              <button
                onClick={() => {
                  setSelectedField(null);
                  setSelectedCategory(null);
                  setActiveIndicator(null);
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
            placeholder={selectedCategory ? `Search in ${selectedCategory}...` : placeholder}
            disabled={disabled}
            className="flex-1 py-2 px-2 text-sm bg-transparent outline-none placeholder-gray-400"
            autoComplete="off"
          />

          {/* Field Indicators Section */}
          <div className="flex items-center gap-1.5 px-2 border-l border-gray-200">
            {/* Magic Search Button */}
            <button
              type="button"
              onClick={handleMagicSearchClick}
              className={`p-1.5 rounded-lg transition-all ${
                showFieldSelector
                  ? 'bg-violet-100 text-violet-600 border border-violet-300'
                  : 'text-violet-500 hover:bg-violet-50 hover:text-violet-600'
              }`}
              title="Search in specific field"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-gray-200" />

            {/* Field Indicators */}
            {FIELD_INDICATORS.map((field) => {
              const Icon = field.icon;
              const isActive = activeIndicator === field.id;
              
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => handleIndicatorClick(field.id)}
                  className={`p-1.5 rounded-lg transition-all ${
                    isActive
                      ? `${field.bgColor} ${field.color} border ${field.borderColor}`
                      : `${field.color} hover:${field.bgColor} opacity-60 hover:opacity-100`
                  }`}
                  title={`Search in ${field.label}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Clear Button */}
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 mr-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={executeSearch}
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
        {searchResult && !isSearching && searchResult.totalCount !== undefined && (
          <div className="ml-3 text-xs text-gray-500 whitespace-nowrap">
            {searchResult.totalCount} results in {searchResult.searchTime?.toFixed(1) || '0.0'}ms
          </div>
        )}
      </div>

      {/* Dropdown for field selection */}
      {showFieldSelector && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Quick Search Option */}
          <button
            type="button"
            onClick={() => {
              setShowFieldSelector(false);
              setSelectedField(null);
              setSelectedCategory(null);
              setActiveIndicator(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Search in all fields</span>
            </div>
          </button>

          {/* Category Options */}
          <div className="p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">
              Search in specific field:
            </div>
            
            {Object.entries(SEARCH_CATEGORIES).map(([key, category]) => {
              const indicator = FIELD_INDICATORS.find(f => f.id === key);
              const Icon = indicator?.icon;
              
              return (
                <div key={key} className="mt-2">
                  <div className="px-2 py-1 text-xs font-medium text-gray-700 flex items-center gap-2">
                    {Icon && indicator && <Icon className={`h-4 w-4 ${indicator.color}`} />}
                    {category.label}
                  </div>
                  <div className="ml-2">
                    {category.fields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => handleFieldSelect(field, key)}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded transition-colors"
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedSearchBar;