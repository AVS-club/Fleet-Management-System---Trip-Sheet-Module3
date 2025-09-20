import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Info, Check } from 'lucide-react';

interface SmartAdaptiveSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (searchTerm: string, activeFields: string[]) => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchResult?: {
    matchedFields?: string[];
    searchTime?: number;
    totalResults?: number;
  };
}

interface FieldConfig {
  id: string;
  label: string;
  color: string;
  activeColor: string;
  tooltip: string;
}

const FIELD_CONFIGS: FieldConfig[] = [
  { id: 'trip', label: 'Trip ID', color: '#dbeafe', activeColor: '#3b82f6', tooltip: 'Trip ID' },
  { id: 'vehicle', label: 'Vehicle', color: '#fce7f3', activeColor: '#ec4899', tooltip: 'Vehicle' },
  { id: 'driver', label: 'Driver', color: '#e9d5ff', activeColor: '#a855f7', tooltip: 'Driver' },
  { id: 'location', label: 'Location', color: '#fed7aa', activeColor: '#f97316', tooltip: 'Location' },
  { id: 'date', label: 'Date', color: '#fef3c7', activeColor: '#eab308', tooltip: 'Date' },
  { id: 'distance', label: 'Distance', color: '#d1fae5', activeColor: '#10b981', tooltip: 'Distance' },
  { id: 'mileage', label: 'Mileage', color: '#cffafe', activeColor: '#06b6d4', tooltip: 'Mileage' },
  { id: 'fuel', label: 'Fuel', color: '#e0e7ff', activeColor: '#6366f1', tooltip: 'Fuel' },
  { id: 'expenses', label: 'Expenses', color: '#dcfce7', activeColor: '#22c55e', tooltip: 'Expenses' },
  { id: 'deviation', label: 'Deviation', color: '#fee2e2', activeColor: '#ef4444', tooltip: 'Deviation' }
];

const SmartAdaptiveSearchBar: React.FC<SmartAdaptiveSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isSearching = false,
  placeholder = "Type and press Enter to search...",
  className = "",
  disabled = false,
  searchResult
}) => {
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanningTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle search completion
  useEffect(() => {
    if (searchResult && !isSearching) {
      setShowResults(true);
      setShowStatus(true);
      
      // Hide status after 3 seconds
      setTimeout(() => {
        setShowStatus(false);
      }, 3000);
    }
  }, [searchResult, isSearching]);

  const toggleField = useCallback((fieldId: string) => {
    setActiveFields(prev => {
      const newFields = new Set(prev);
      if (newFields.has(fieldId)) {
        newFields.delete(fieldId);
      } else {
        newFields.add(fieldId);
      }
      return newFields;
    });
  }, []);

  const executeSearch = useCallback(() => {
    const searchTerm = value.trim();
    if (searchTerm.length === 0) {
      return;
    }
    
    onSearch(searchTerm, Array.from(activeFields));
  }, [value, activeFields, onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  }, [executeSearch]);

  const clearSearch = useCallback(() => {
    onChange('');
    setActiveFields(new Set());
    setShowResults(false);
    setShowStatus(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [onChange]);

  const animateFieldScanning = useCallback(() => {
    const fieldsToScan = activeFields.size > 0 ? 
      Array.from(activeFields) : 
      FIELD_CONFIGS.map(f => f.id);
    
    fieldsToScan.forEach((fieldId, index) => {
      setTimeout(() => {
        const dot = document.querySelector(`[data-field="${fieldId}"]`);
        if (dot) {
          dot.classList.add('scanning');
          setTimeout(() => {
            dot.classList.remove('scanning');
          }, 500);
        }
      }, index * 150);
    });
  }, [activeFields]);

  // Trigger scanning animation when search starts
  useEffect(() => {
    if (isSearching) {
      animateFieldScanning();
    }
  }, [isSearching, animateFieldScanning]);

  const getHelpText = () => {
    if (activeFields.size > 0) {
      const fieldNames = Array.from(activeFields).map(fieldId => {
        const config = FIELD_CONFIGS.find(f => f.id === fieldId);
        return config?.label;
      }).join(', ');
      return isMobile ? 
        `Searching in: ${fieldNames} • Tap search icon to execute` :
        `Searching in: ${fieldNames} • Press Enter to search`;
    }
    return isMobile ? 
      'Tap colored dots to filter by field • Tap search icon to execute' :
      'Click colored dots to filter by field • Press Enter or click Search to execute';
  };

  return (
    <div className={`smart-search-container ${className}`}>
      {/* Main Search Bar */}
      <div className={`search-bar-wrapper ${isSearching ? 'searching' : ''}`}>
        <div className="search-input-group">
          {/* Search Icon with Progress */}
          <div className={`search-icon-wrapper ${isSearching ? 'active' : ''}`}>
            <Search className="search-icon" size={20} />
            {isSearching && (
              <svg className="search-progress-ring">
                <circle className="progress-circle" cx="18" cy="18" r="16"></circle>
                <circle className="progress-circle-fill" cx="18" cy="18" r="16"></circle>
              </svg>
            )}
          </div>

          {/* Search Input */}
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
          />

          {/* Enhanced Field Indicators */}
          <div className="field-indicators">
            {FIELD_CONFIGS.map((config) => (
              <div
                key={config.id}
                className={`field-dot ${activeFields.has(config.id) ? 'active' : ''}`}
                data-field={config.id}
                data-tooltip={config.tooltip}
                onClick={() => toggleField(config.id)}
                style={{
                  backgroundColor: activeFields.has(config.id) ? config.activeColor : config.color,
                  borderColor: activeFields.has(config.id) ? config.activeColor : config.color
                }}
              />
            ))}
          </div>

          {/* Desktop Search Button */}
          {!isMobile && (
            <button 
              className="search-btn" 
              onClick={executeSearch}
              disabled={disabled || isSearching}
            >
              <Search size={16} />
              Search
            </button>
          )}

          {/* Mobile Search Button */}
          {isMobile && (
            <button 
              className="mobile-search-btn" 
              onClick={executeSearch}
              disabled={disabled || isSearching}
            >
              <Search size={20} />
            </button>
          )}

          {/* Action Icons */}
          <div className="action-buttons">
            <div 
              className="action-btn-icon" 
              onClick={() => setShowLegend(!showLegend)}
              title="Show Legend"
            >
              <Info size={16} />
            </div>
            <div 
              className="action-btn-icon" 
              onClick={clearSearch}
              title="Clear"
            >
              <X size={16} />
            </div>
          </div>

          {/* Search Status */}
          {showStatus && (
            <div className="search-status show">
              <Check size={16} />
              Complete
            </div>
          )}
        </div>

        {/* Field Legend */}
        {showLegend && (
          <div className="field-legend show">
            <div className="legend-grid">
              {FIELD_CONFIGS.map((config) => (
                <div key={config.id} className="legend-item">
                  <div 
                    className="legend-dot" 
                    style={{ backgroundColor: config.activeColor }}
                  />
                  <span>{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="help-text">{getHelpText()}</p>

      {/* Results Info */}
      {showResults && searchResult && (
        <div className="results-info show">
          <span>
            Found <strong>{searchResult.totalResults || 0}</strong> results in{' '}
            <strong>{searchResult.searchTime || 0}</strong>ms
          </span>
          <span>
            Searched: <strong>
              {searchResult.matchedFields && searchResult.matchedFields.length > 0
                ? searchResult.matchedFields.join(', ')
                : 'All fields'
              }
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartAdaptiveSearchBar;
