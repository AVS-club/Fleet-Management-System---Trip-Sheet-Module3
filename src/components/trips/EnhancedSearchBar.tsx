import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Zap, Target, TrendingUp, AlertTriangle, DollarSign, MapPin, Calendar, User, Truck, Gauge, History, Bookmark, Settings, Download, Share2, Clock } from 'lucide-react';

interface EnhancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string, matchedFields: string[]) => void;
  onHighlightMatches?: (query: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchHistory?: string[];
  onSaveSearch?: (query: string, filters: any) => void;
  onExportResults?: (format: 'excel' | 'pdf') => void;
}

interface SearchField {
  id: string;
  label: string;
  icon: React.ReactNode;
  pattern?: RegExp;
  description: string;
}

const SEARCH_FIELDS: SearchField[] = [
  {
    id: 'trip-id',
    label: 'Trip ID',
    icon: <Target className="h-3 w-3" />,
    pattern: /^t\d{2}-/i,
    description: 'Search by trip serial number (e.g., T25-5980-0014)'
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    icon: <Truck className="h-3 w-3" />,
    pattern: /[a-z]{2}\d{2}[a-z]{1,2}\d{4}/i,
    description: 'Search by vehicle registration number (e.g., OD15S5980)'
  },
  {
    id: 'driver',
    label: 'Driver',
    icon: <User className="h-3 w-3" />,
    pattern: /[a-z\s]{3,}/i,
    description: 'Search by driver name (e.g., SISIRA KISAN)'
  },
  {
    id: 'date',
    label: 'Date',
    icon: <Calendar className="h-3 w-3" />,
    pattern: /\d{1,2}\s*(sep|aug|jul|jun|may|apr|mar|feb|jan|dec|nov|oct|\d{1,2})/i,
    description: 'Search by date (e.g., 18 Sep 2025, 2025-09-18)'
  },
  {
    id: 'location',
    label: 'Location',
    icon: <MapPin className="h-3 w-3" />,
    pattern: /[a-z]{2}\d{2}[a-z]{2}\d{4}/i,
    description: 'Search by location or destination'
  },
  {
    id: 'distance',
    label: 'Distance',
    icon: <TrendingUp className="h-3 w-3" />,
    pattern: /^\d+(\.\d+)?\s*km?$/i,
    description: 'Search by distance in kilometers (e.g., 112 km, 1888)'
  },
  {
    id: 'mileage',
    label: 'Mileage',
    icon: <Gauge className="h-3 w-3" />,
    pattern: /^\d+(\.\d+)?\s*km\/l?$/i,
    description: 'Search by fuel efficiency (e.g., 23.6 km/L)'
  },
  {
    id: 'fuel',
    label: 'Fuel',
    icon: <Zap className="h-3 w-3" />,
    pattern: /^\d+(\.\d+)?\s*l$/i,
    description: 'Search by fuel consumption (e.g., 225.01L)'
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: <DollarSign className="h-3 w-3" />,
    pattern: /₹|rs|rupee|\d+k?/i,
    description: 'Search by expenses (e.g., ₹500, ₹23,500)'
  },
  {
    id: 'deviation',
    label: 'Deviation',
    icon: <AlertTriangle className="h-3 w-3" />,
    pattern: /%|deviation/i,
    description: 'Search by route deviation percentage'
  }
];

const QUICK_FILTERS = [
  { label: "Today's trips", query: 'today', icon: <Calendar className="h-3 w-3" /> },
  { label: 'High deviation', query: 'deviation > 8%', icon: <AlertTriangle className="h-3 w-3" /> },
  { label: 'Low mileage', query: 'mileage < 20', icon: <Gauge className="h-3 w-3" /> },
  { label: 'High expenses', query: 'expenses > 10000', icon: <DollarSign className="h-3 w-3" /> },
  { label: 'Refueling trips', query: 'refueling', icon: <Zap className="h-3 w-3" /> }
];

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  onHighlightMatches,
  isSearching = false,
  placeholder = "Search by trip ID, vehicle, driver, location, date, distance, fuel, expenses...",
  className = '',
  disabled = false,
  searchHistory = [],
  onSaveSearch,
  onExportResults
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{
    count: number;
    matchedFields: string[];
    searchTime: number;
  } | null>(null);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [scanningField, setScanningField] = useState('trip IDs...');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const scanIntervalRef = useRef<NodeJS.Timeout>();

  // Detect relevant fields based on search input
  const detectRelevantFields = useCallback((searchValue: string): string[] => {
    if (!searchValue.trim()) return [];
    
    const lower = searchValue.toLowerCase();
    const relevantFields: string[] = [];
    
    SEARCH_FIELDS.forEach(field => {
      if (field.pattern && field.pattern.test(searchValue)) {
        relevantFields.push(field.id);
      }
    });
    
    // Additional intelligent detection
    if (/^\d+$/.test(searchValue) && searchValue.length <= 4) {
      relevantFields.push('distance');
    }
    if (/₹|rs|rupee/i.test(lower)) {
      relevantFields.push('expenses');
    }
    if (/[a-z\s]{3,}/i.test(searchValue) && !relevantFields.length) {
      relevantFields.push('driver', 'location');
    }
    
    return relevantFields;
  }, []);

  // Start scanning animation
  const startScanning = useCallback(() => {
    const fields = ['trip IDs...', 'vehicle numbers...', 'driver names...', 'locations...', 'dates...', 'distances...', 'expenses...'];
    let index = 0;
    
    scanIntervalRef.current = setInterval(() => {
      setScanningField(fields[index % fields.length]);
      index++;
    }, 500);
  }, []);

  // Stop scanning animation
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
  }, []);

  // Generate auto-suggestions based on search input
  const generateSuggestions = useCallback((searchValue: string) => {
    const lowerValue = searchValue.toLowerCase();
    const newSuggestions = [];
    
    // Sample suggestions based on your actual data
    const sampleData = [
      { type: 'trip', text: 'T25-5980-0014', meta: 'OD15S5980 • SISIRA KISAN' },
      { type: 'trip', text: 'T25-9478-0010', meta: 'CG04NJ9478 • YOGESH KUMAR NAYAK' },
      { type: 'trip', text: 'T25-9478-0009', meta: 'CG04NJ9478 • YOGESH KUMAR NAYAK' },
      { type: 'driver', text: 'SISIRA KISAN', meta: '3 active trips' },
      { type: 'driver', text: 'YOGESH KUMAR NAYAK', meta: '5 active trips' },
      { type: 'vehicle', text: 'OD15S5980', meta: 'Last trip: 2 hours ago' },
      { type: 'vehicle', text: 'CG04NJ9478', meta: 'Last trip: 1 hour ago' },
      { type: 'distance', text: '112 km', meta: 'Multiple trips' },
      { type: 'distance', text: '1888 km', meta: 'Long distance trips' },
      { type: 'deviation', text: '-15.9%', meta: 'Route deviation' },
      { type: 'deviation', text: '-98.8%', meta: 'High deviation' }
    ];
    
    sampleData.forEach(item => {
      if (item.text.toLowerCase().includes(lowerValue) || 
          item.meta.toLowerCase().includes(lowerValue)) {
        newSuggestions.push(item);
      }
    });
    
    setSuggestions(newSuggestions.slice(0, 5)); // Limit to 5 suggestions
  }, []);

  // Handle search input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (newValue.trim()) {
      // Show suggestions and start scanning
      setShowSuggestions(true);
      setShowHistory(false);
      startScanning();
      generateSuggestions(newValue);
      
      // Highlight relevant fields
      const fields = detectRelevantFields(newValue);
      setHighlightedFields(fields);
      
      // Simulate search with delay
      searchTimeoutRef.current = setTimeout(() => {
        const matchedFields = fields.length > 0 ? fields : SEARCH_FIELDS.map(f => f.id);
        const searchTime = Math.random() * 0.5 + 0.1; // Simulate search time
        
        setSearchResults({
          count: Math.floor(Math.random() * 20) + 1,
          matchedFields,
          searchTime
        });
        
        if (onSearch) {
          onSearch(newValue, matchedFields);
        }
        
        if (onHighlightMatches) {
          onHighlightMatches(newValue);
        }
        
        stopScanning();
        setShowSuggestions(false);
      }, 300);
    } else {
      setHighlightedFields([]);
      setSearchResults(null);
      setShowSuggestions(false);
      stopScanning();
    }
  }, [onChange, detectRelevantFields, onSearch, onHighlightMatches, startScanning, stopScanning, generateSuggestions]);

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowCapabilities(true);
    if (!value.trim()) {
      setShowHistory(true);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Keep focused if clicking within the search container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setTimeout(() => {
        setIsFocused(false);
        if (!value.trim()) {
          setShowCapabilities(false);
          setShowHistory(false);
        }
        setShowSuggestions(false);
      }, 200);
    }
  }, [value]);

  // Handle field tag clicks
  const handleFieldClick = useCallback((fieldId: string) => {
    const field = SEARCH_FIELDS.find(f => f.id === fieldId);
    if (field) {
      inputRef.current?.focus();
      // You could set placeholder or add field-specific search hints here
    }
  }, []);

  // Handle quick filter clicks
  const handleQuickFilterClick = useCallback((query: string) => {
    onChange(query);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle history item clicks
  const handleHistoryClick = useCallback((historyItem: string) => {
    onChange(historyItem);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle suggestion clicks
  const handleSuggestionClick = useCallback((suggestion: any) => {
    onChange(suggestion.text);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle advanced search
  const handleAdvancedSearch = useCallback(() => {
    setShowAdvanced(true);
  }, []);

  // Handle save search
  const handleSaveSearch = useCallback(() => {
    if (onSaveSearch && value.trim()) {
      onSaveSearch(value, {});
    }
  }, [onSaveSearch, value]);

  // Handle export results
  const handleExportResults = useCallback((format: 'excel' | 'pdf') => {
    if (onExportResults) {
      onExportResults(format);
    }
  }, [onExportResults]);

  // Clear search
  const handleClear = useCallback(() => {
    onChange('');
    setHighlightedFields([]);
    setSearchResults(null);
    inputRef.current?.focus();
  }, [onChange]);

  // Cleanup timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className={`relative transition-all duration-300 ${
        isFocused ? 'transform scale-[1.02]' : ''
      }`}>
        <div className={`relative bg-white rounded-xl border-2 transition-all duration-300 ${
          isFocused 
            ? 'border-primary-500 shadow-lg shadow-primary-500/10' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          {/* Search Icon */}
          <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
            isFocused ? 'text-primary-600' : 'text-gray-400'
          }`}>
            <Search className="h-5 w-5" />
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full pl-12 pr-20 py-4 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm font-medium ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />

          {/* Right Side Controls */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {/* Control Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  showHistory 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="Search History"
              >
                <History className="h-4 w-4" />
              </button>
              
              <button
                onClick={handleAdvancedSearch}
                className="p-1.5 rounded-lg text-xs font-medium transition-all text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Advanced Search"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {/* Scanning Indicator */}
            {isSearching && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium animate-pulse">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Scanning {scanningField}</span>
              </div>
            )}

            {/* Clear Button */}
            {value && !disabled && (
              <button
                onClick={handleClear}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown Panel */}
      {(showCapabilities || showHistory || showSuggestions || searchResults) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
          {/* Search History Section */}
          {showHistory && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Recent Searches</span>
              </div>
              <div className="space-y-2">
                {searchHistory.slice(0, 5).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  </button>
                ))}
                {searchHistory.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">No recent searches</div>
                )}
              </div>
            </div>
          )}

          {/* Auto Suggestions Section */}
          {showSuggestions && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary-50 rounded-lg">
                  <Search className="h-4 w-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Suggestions</span>
                <span className="text-xs text-gray-500">Scanning {scanningField}</span>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {suggestion.type === 'trip' && <Target className="h-3 w-3 text-blue-500" />}
                        {suggestion.type === 'driver' && <User className="h-3 w-3 text-green-500" />}
                        {suggestion.type === 'vehicle' && <Truck className="h-3 w-3 text-purple-500" />}
                        {suggestion.type === 'distance' && <TrendingUp className="h-3 w-3 text-orange-500" />}
                        {suggestion.type === 'deviation' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        <span className="text-sm text-gray-700">{suggestion.text}</span>
                      </div>
                      <span className="text-xs text-gray-500">{suggestion.meta}</span>
                    </div>
                  </button>
                ))}
                {suggestions.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">No suggestions found</div>
                )}
              </div>
            </div>
          )}

          {/* Search Capabilities Section */}
          {showCapabilities && !showHistory && !showSuggestions && (
            <div className="p-4">
              {/* Capabilities Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary-50 rounded-lg">
                    <Search className="h-4 w-4 text-primary-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Search across all trip data</span>
                </div>
                <span className="text-xs text-gray-500">{SEARCH_FIELDS.length} fields</span>
              </div>

              {/* Searchable Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                {SEARCH_FIELDS.map(field => (
                  <button
                    key={field.id}
                    onClick={() => handleFieldClick(field.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      highlightedFields.includes(field.id)
                        ? 'bg-primary-100 text-primary-700 border border-primary-200 transform scale-105'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                    }`}
                    title={field.description}
                  >
                    {field.icon}
                    <span>{field.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick Filters */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3 w-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Quick Filters</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.map((filter, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickFilterClick(filter.query)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-lg text-xs font-medium transition-colors"
                    >
                      {filter.icon}
                      <span>{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Results Summary */}
          {searchResults && (
            <div className="border-t border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-50 rounded-lg">
                    <Target className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Found <span className="text-primary-600 font-semibold">{searchResults.count}</span> trips
                  </span>
                </div>
                <span className="text-xs text-gray-500">({searchResults.searchTime.toFixed(2)}s)</span>
              </div>
              
              {/* Matched Fields */}
              {searchResults.matchedFields.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {searchResults.matchedFields.map(fieldId => {
                    const field = SEARCH_FIELDS.find(f => f.id === fieldId);
                    return field ? (
                      <span
                        key={fieldId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-medium"
                      >
                        {field.icon}
                        {field.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-lg text-xs font-medium transition-colors"
                >
                  <Bookmark className="h-3 w-3" />
                  Save Search
                </button>
                <button
                  onClick={() => handleExportResults('excel')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export Excel
                </button>
                <button
                  onClick={() => handleExportResults('pdf')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Search Modal */}
      {showAdvanced && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Advanced Search</h2>
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trip ID</label>
                    <input
                      type="text"
                      placeholder="e.g., T25-9478"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                    <input
                      type="text"
                      placeholder="e.g., CG04NJ9478"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name</label>
                    <input
                      type="text"
                      placeholder="e.g., YOGESH"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="e.g., Indore"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Distance (km)</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Distance (km)</label>
                    <input
                      type="number"
                      placeholder="5000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Deviation (%)</label>
                    <input
                      type="number"
                      placeholder="e.g., -15.9"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAdvanced(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowAdvanced(false)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchBar;
