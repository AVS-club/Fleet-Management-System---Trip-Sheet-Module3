import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  X, 
  History, 
  Settings, 
  Download, 
  CheckCircle,
  Clock,
  Target,
  Truck,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  Gauge,
  Zap,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

interface UltraSmartSearchProps {
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
  icon: string;
  tooltip: string;
}

interface SearchStats {
  recordsScanned: number;
  matchesFound: number;
  searchSpeed: number;
}

const SEARCH_FIELDS: SearchField[] = [
  { id: 'trip', label: 'Trip ID', icon: 'T', tooltip: 'Trip ID' },
  { id: 'vehicle', label: 'Vehicle', icon: 'V', tooltip: 'Vehicle' },
  { id: 'driver', label: 'Driver', icon: 'D', tooltip: 'Driver' },
  { id: 'location', label: 'Location', icon: 'L', tooltip: 'Location' },
  { id: 'date', label: 'Date', icon: 'DT', tooltip: 'Date' },
  { id: 'distance', label: 'Distance', icon: 'KM', tooltip: 'Distance' },
  { id: 'mileage', label: 'Mileage', icon: 'M', tooltip: 'Mileage' },
  { id: 'fuel', label: 'Fuel', icon: 'F', tooltip: 'Fuel' },
  { id: 'expenses', label: 'Expenses', icon: '₹', tooltip: 'Expenses' },
  { id: 'deviation', label: 'Deviation %', icon: '%', tooltip: 'Deviation %' }
];

const SAMPLE_SUGGESTIONS = [
  { icon: 'T', text: 'T25-9478-0009', type: 'trip' },
  { icon: 'V', text: 'CG04NJ9478', type: 'vehicle' },
  { icon: 'D', text: 'YOGESH KUMAR', type: 'driver' },
  { icon: 'L', text: 'Bilaspur', type: 'location' },
  { icon: 'DT', text: 'Today', type: 'date' },
  { icon: 'KM', text: '>1000 km', type: 'distance' },
  { icon: '₹', text: '>₹10,000', type: 'expense' }
];

const QUICK_FILTERS = [
  'Today',
  'This Week', 
  'High Deviation',
  'Long Distance',
  'Low Mileage',
  'High Expenses',
  'My Trips',
  'Pending',
  'Completed'
];

const UltraSmartSearch: React.FC<UltraSmartSearchProps> = ({
  value,
  onChange,
  onSearch,
  onHighlightMatches,
  isSearching = false,
  placeholder = "Smart search across all trip data...",
  className = '',
  disabled = false,
  searchHistory = [],
  onSaveSearch,
  onExportResults
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeFields, setActiveFields] = useState<string[]>([]);
  const [scanningField, setScanningField] = useState('');
  const [searchStats, setSearchStats] = useState<SearchStats>({
    recordsScanned: 0,
    matchesFound: 0,
    searchSpeed: 0
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'searching' | 'complete'>('idle');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const scanIntervalRef = useRef<NodeJS.Timeout>();
  const statsIntervalRef = useRef<NodeJS.Timeout>();

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

  // Animate search statistics
  const animateStats = useCallback(() => {
    let scanned = 0;
    let matches = 0;
    let speed = 0;
    
    statsIntervalRef.current = setInterval(() => {
      scanned += Math.floor(Math.random() * 100) + 50;
      matches = Math.floor(scanned * 0.05);
      speed += Math.floor(Math.random() * 10) + 5;
      
      setSearchStats({
        recordsScanned: scanned,
        matchesFound: matches,
        searchSpeed: speed
      });
      
      if (scanned >= 2500) {
        clearInterval(statsIntervalRef.current!);
        setSearchStats({
          recordsScanned: 2500,
          matchesFound: 125,
          searchSpeed: 150
        });
      }
    }, 100);
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
      setShowSuggestions(true);
      setDbStatus('searching');
      startScanning();
      animateStats();
      
      // Simulate search with delay
      searchTimeoutRef.current = setTimeout(() => {
        const matchedFields = ['trip', 'vehicle', 'driver', 'location', 'date', 'distance', 'expenses'];
        
        if (onSearch) {
          onSearch(newValue, matchedFields);
        }
        
        if (onHighlightMatches) {
          onHighlightMatches(newValue);
        }
        
        stopScanning();
        setShowSuggestions(false);
        setDbStatus('complete');
        setShowComplete(true);
        
        // Hide complete indicator after 3 seconds
        setTimeout(() => {
          setShowComplete(false);
          setDbStatus('idle');
        }, 3000);
      }, 2000);
    } else {
      setShowSuggestions(false);
      setDbStatus('idle');
      stopScanning();
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    }
  }, [onChange, onSearch, onHighlightMatches, startScanning, stopScanning, animateStats]);

  // Handle field dot clicks
  const handleFieldClick = useCallback((fieldId: string) => {
    setActiveFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  }, []);

  // Handle quick filter clicks
  const handleQuickFilterClick = useCallback((filter: string) => {
    onChange(filter);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle suggestion clicks
  const handleSuggestionClick = useCallback((suggestion: any) => {
    onChange(suggestion.text);
    inputRef.current?.focus();
  }, [onChange]);

  // Update search placeholder based on active fields
  const getPlaceholder = useCallback(() => {
    if (activeFields.length > 0) {
      const fieldLabels = activeFields.map(fieldId => 
        SEARCH_FIELDS.find(f => f.id === fieldId)?.label
      ).filter(Boolean);
      return `Search in: ${fieldLabels.join(', ')}...`;
    }
    return placeholder;
  }, [activeFields, placeholder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Container */}
      <div className={`bg-white rounded-xl border-2 transition-all duration-300 ${
        isFocused 
          ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' 
          : 'border-gray-200 hover:border-gray-300'
      } ${isSearching ? 'shadow-lg shadow-emerald-500/15' : ''}`}>
        
        {/* Search Input Group */}
        <div className="flex items-center gap-2 p-3">
          {/* Search Icon with Progress Ring */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <Search className={`w-5 h-5 transition-colors duration-300 ${
              isFocused ? 'text-emerald-600' : 'text-gray-400'
            }`} />
            
            {/* Progress Ring */}
            {isSearching && (
              <svg className="absolute inset-0 w-9 h-9 transform -rotate-90">
                <circle
                  className="fill-none stroke-gray-200 stroke-2"
                  cx="18"
                  cy="18"
                  r="16"
                />
                <circle
                  className="fill-none stroke-emerald-500 stroke-2 transition-all duration-500"
                  cx="18"
                  cy="18"
                  r="16"
                  strokeDasharray="100"
                  strokeDashoffset={isSearching ? "0" : "100"}
                  style={{
                    strokeDashoffset: isSearching ? "0" : "100",
                    transition: "stroke-dashoffset 2s ease-in-out"
                  }}
                />
              </svg>
            )}
          </div>

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={getPlaceholder()}
            disabled={disabled}
            className={`flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm font-medium ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />

          {/* Compact Field Indicators */}
          <div className="flex items-center gap-1 px-2 border-l border-gray-200">
            {SEARCH_FIELDS.map((field, index) => (
              <div
                key={field.id}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 relative group ${
                  activeFields.includes(field.id) 
                    ? 'bg-emerald-500 scale-130' 
                    : 'bg-gray-300 hover:bg-gray-400'
                } ${isSearching && index === Math.floor(Date.now() / 500) % SEARCH_FIELDS.length ? 'animate-pulse' : ''}`}
                onClick={() => handleFieldClick(field.id)}
                title={field.tooltip}
              >
                {/* Tooltip */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform duration-200 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                  {field.tooltip}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-8 h-8 border border-gray-200 rounded-lg bg-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all duration-200 flex items-center justify-center"
              title="Filters"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => {/* History functionality */}}
              className="w-8 h-8 border border-gray-200 rounded-lg bg-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all duration-200 flex items-center justify-center"
              title="History"
            >
              <History className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onExportResults?.('excel')}
              className="w-8 h-8 border border-gray-200 rounded-lg bg-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all duration-200 flex items-center justify-center"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Scan Complete Indicator */}
          {showComplete && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 scale-0 animate-[popIn_0.3s_ease_forwards] bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Complete
            </div>
          )}

          {/* Clear Button */}
          {value && !disabled && (
            <button
              onClick={() => onChange('')}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Progress Bar */}
        {isSearching && (
          <div className="h-1 bg-gray-200 rounded-b-xl overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 w-0 animate-[searchProgress_2s_ease-in-out_forwards] relative">
              <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-white/50 animate-[shimmer_1s_infinite]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Suggestions */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-[expandDown_0.3s_ease]">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Suggestions</span>
              <span className="text-xs text-gray-500">Scanning {scanningField}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-medium transition-all duration-200"
                >
                  <div className="w-3 h-3 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold">
                    {suggestion.icon}
                  </div>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mini Filter Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-[expandDown_0.3s_ease]">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Quick Filters</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {QUICK_FILTERS.map((filter, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickFilterClick(filter)}
                  className="px-3 py-2 bg-gray-50 hover:bg-emerald-500 hover:text-white border border-gray-200 hover:border-emerald-500 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Search Info */}
      {isSearching && (
        <div className="fixed top-5 right-5 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 animate-[slideIn_0.3s_ease]">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600">{searchStats.recordsScanned}</div>
              <div className="text-xs text-gray-500 uppercase">Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600">{searchStats.matchesFound}</div>
              <div className="text-xs text-gray-500 uppercase">Matches</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600">{searchStats.searchSpeed}ms</div>
              <div className="text-xs text-gray-500 uppercase">Speed</div>
            </div>
          </div>
        </div>
      )}

      {/* Database Status Indicator */}
      {dbStatus !== 'idle' && (
        <div className="fixed bottom-5 right-5 bg-gray-800 text-white px-4 py-2 rounded-lg text-xs flex items-center gap-2 z-50">
          <div className={`w-2 h-2 rounded-full ${
            dbStatus === 'searching' ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500'
          }`}></div>
          <span>
            {dbStatus === 'searching' ? 'Searching database...' : 'Search complete'}
          </span>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes popIn {
          0% { transform: translateY(-50%) scale(0); opacity: 0; }
          50% { transform: translateY(-50%) scale(1.1); }
          100% { transform: translateY(-50%) scale(1); opacity: 1; }
        }
        
        @keyframes searchProgress {
          0% { width: 0; }
          100% { width: 100%; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-50px); }
          100% { transform: translateX(50px); }
        }
        
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default UltraSmartSearch;
