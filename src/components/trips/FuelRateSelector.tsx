import React, { useState, useRef, useEffect } from 'react';
import { IndianRupee, ChevronDown, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FuelRateOption {
  id: string;
  rate: number;
  location: string;
  usageCount: number;
  lastUsed: string;
}

interface FuelRateSelectorProps {
  value?: number;
  onChange: (rate: number, location?: string) => void;
  disabled?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

const FuelRateSelector: React.FC<FuelRateSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  inputSize = 'sm'
}) => {
  const [rates, setRates] = useState<FuelRateOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load rates from localStorage on mount
  useEffect(() => {
    const storedRates = localStorage.getItem('fuelRates');
    if (storedRates) {
      try {
        const parsed = JSON.parse(storedRates);
        // Sort by usage count and last used
        const sorted = parsed.sort((a: FuelRateOption, b: FuelRateOption) => {
          if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount;
          }
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        setRates(sorted);
      } catch (error) {
        console.error('Error loading fuel rates:', error);
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRate = (rate: number, location: string) => {
    const existingIndex = rates.findIndex(r => 
      Math.abs(r.rate - rate) < 0.01 && r.location.toLowerCase() === location.toLowerCase()
    );

    let updatedRates: FuelRateOption[];
    
    if (existingIndex >= 0) {
      // Update existing rate
      updatedRates = [...rates];
      updatedRates[existingIndex] = {
        ...updatedRates[existingIndex],
        usageCount: updatedRates[existingIndex].usageCount + 1,
        lastUsed: new Date().toISOString()
      };
    } else {
      // Add new rate
      const newRate: FuelRateOption = {
        id: `rate-${Date.now()}`,
        rate,
        location,
        usageCount: 1,
        lastUsed: new Date().toISOString()
      };
      updatedRates = [newRate, ...rates];
    }

    // Sort and save
    const sorted = updatedRates.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });

    setRates(sorted);
    localStorage.setItem('fuelRates', JSON.stringify(sorted));
  };

  const handleRateSelect = (rateOption: FuelRateOption) => {
    onChange(rateOption.rate, rateOption.location);
    saveRate(rateOption.rate, rateOption.location);
    setIsOpen(false);
    setSearchValue('');
    setLocationInput('');
  };

  const handleNewRate = () => {
    const rateValue = parseFloat(searchValue);
    if (rateValue && rateValue > 0 && locationInput.trim()) {
      onChange(rateValue, locationInput);
      saveRate(rateValue, locationInput);
      setIsOpen(false);
      setSearchValue('');
      setLocationInput('');
    }
  };

  // Get top frequently used rates for quick access
  const topRates = rates.slice(0, 4);

  // Filter rates for dropdown search
  const filteredRates = rates.filter(rate => {
    const searchLower = searchValue.toLowerCase();
    return rate.rate.toString().includes(searchValue) || 
           rate.location.toLowerCase().includes(searchLower);
  });

  const sizeClasses = {
    sm: 'text-sm h-9',
    md: 'text-base h-10',
    lg: 'text-lg h-12'
  };

  return (
    <div className="space-y-2">
      {/* Frequently Used Rates - Quick Access Tags */}
      {topRates.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Frequently used at:</span>
          <div className="flex flex-wrap gap-1.5">
            {topRates.map(rate => (
              <button
                key={rate.id}
                type="button"
                onClick={() => handleRateSelect(rate)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                  "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300",
                  "hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-colors",
                  "border border-primary-200 dark:border-primary-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <IndianRupee className="h-3 w-3" />
                <span className="font-medium">{rate.rate.toFixed(2)}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  — {rate.location}
                </span>
                {rate.usageCount > 1 && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({rate.usageCount} times)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={value ? `₹${value.toFixed(2)}` : searchValue}
            onClick={() => !disabled && setIsOpen(true)}
            onChange={(e) => {
              const val = e.target.value.replace('₹', '').trim();
              setSearchValue(val);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder="Search rates or enter new rate"
            disabled={disabled}
            className={cn(
              "w-full px-10 rounded-lg border",
              "bg-white dark:bg-gray-800",
              "border-gray-300 dark:border-gray-600",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "disabled:bg-gray-100 dark:disabled:bg-gray-900",
              "disabled:cursor-not-allowed",
              sizeClasses[inputSize]
            )}
          />
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <ChevronDown 
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
            {/* New Rate Entry */}
            {searchValue && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Enter location (e.g., HP Petrol Pump, Raipur)"
                      className={cn(
                        "w-full pl-8 pr-3 py-2 rounded border",
                        "bg-gray-50 dark:bg-gray-900",
                        "border-gray-300 dark:border-gray-600",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500",
                        "text-sm"
                      )}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleNewRate();
                        }
                      }}
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={handleNewRate}
                    disabled={!searchValue || !locationInput.trim()}
                    className={cn(
                      "w-full px-3 py-2 rounded",
                      "bg-primary-500 text-white",
                      "hover:bg-primary-600",
                      "disabled:bg-gray-300 dark:disabled:bg-gray-700",
                      "disabled:cursor-not-allowed",
                      "text-sm font-medium transition-colors"
                    )}
                  >
                    Add New Rate: ₹{searchValue} at {locationInput || '...'}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Rates */}
            {!searchValue && filteredRates.length > 0 ? (
              <div className="py-1">
                {filteredRates.map(rate => (
                  <button
                    key={rate.id}
                    type="button"
                    onClick={() => handleRateSelect(rate)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700",
                      "flex items-center justify-between group transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-sm">₹{rate.rate.toFixed(2)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        — {rate.location}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {rate.usageCount} {rate.usageCount === 1 ? 'time' : 'times'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              !searchValue && (
                <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No saved rates yet. Enter a new rate above.
                </div>
              )
            )}

            {/* Search Results */}
            {searchValue && filteredRates.length > 0 && (
              <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                  Or select from existing rates:
                </div>
                {filteredRates.slice(0, 5).map(rate => (
                  <button
                    key={rate.id}
                    type="button"
                    onClick={() => handleRateSelect(rate)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700",
                      "flex items-center justify-between group transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-sm">₹{rate.rate.toFixed(2)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        — {rate.location}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {rate.usageCount} {rate.usageCount === 1 ? 'time' : 'times'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelRateSelector;