import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Trip, Warehouse } from '../../types';
import { cn } from '../../utils/cn';
import { cn } from '../../utils/cn';

interface FuelRateSelectorProps {
  selectedRate?: number;
  onChange: (rate: number) => void;
  trips: Trip[];
  warehouses: Warehouse[];
  selectedWarehouseId?: string;
  error?: string;
}

const FuelRateSelector: React.FC<FuelRateSelectorProps> = ({
  selectedRate,
  onChange,
  trips,
  warehouses,
  selectedWarehouseId,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customRate, setCustomRate] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get past fuel rates from trips
  const pastRates = useMemo(() => {
    const rateMap = new Map<number, { count: number; warehouseNames: Set<string> }>();
    
    trips.forEach(trip => {
      if (trip.refueling_done && trip.fuel_cost && trip.fuel_cost > 0) {
        const rate = Math.round(trip.fuel_cost * 100) / 100; // Round to 2 decimal places
        
        if (!rateMap.has(rate)) {
          rateMap.set(rate, { count: 0, warehouseNames: new Set() });
        }
        
        const rateData = rateMap.get(rate)!;
        rateData.count++;
        
        // Try to find warehouse name for this trip
        if (trip.warehouse_id) {
          const warehouse = warehouses.find(w => w.id === trip.warehouse_id);
          if (warehouse) {
            rateData.warehouseNames.add(warehouse.name);
          }
        }
      }
    });

    // Convert to array and sort by frequency (most used first)
    return Array.from(rateMap.entries())
      .map(([rate, data]) => ({
        rate,
        count: data.count,
        warehouseNames: Array.from(data.warehouseNames).slice(0, 2), // Limit to 2 warehouse names
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limit to top 10 rates
  }, [trips, warehouses]);

  // Filter rates based on search term
  const filteredRates = pastRates.filter(rateData => 
    rateData.rate.toString().includes(searchTerm) ||
    rateData.warehouseNames.some(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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

  // Handle rate selection
  const handleRateSelect = (rate: number) => {
    onChange(rate);
    setIsOpen(false);
    setCustomRate('');
  };

  // Handle custom rate input
  const handleCustomRateSubmit = () => {
    const rate = parseFloat(customRate);
    if (!isNaN(rate) && rate > 0) {
      onChange(rate);
      setIsOpen(false);
      setCustomRate('');
    }
  };

  const displayValue = selectedRate ? `₹${selectedRate.toFixed(2)}` : '';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Fuel Rate per Liter (₹)
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 border rounded-md bg-white cursor-pointer",
            error ? "border-error-500" : "border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-gray-800",
            "focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200"
          )}
          onClick={() => setIsOpen(true)}
        >
          <span className={selectedRate ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
            {displayValue || 'Select or enter fuel rate'}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Search/Custom Input */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full pl-8 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Search rates or enter new rate..."
                  value={searchTerm || customRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!isNaN(parseFloat(value)) || value === '') {
                      setCustomRate(value);
                      setSearchTerm('');
                    } else {
                      setSearchTerm(value);
                      setCustomRate('');
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customRate) {
                      handleCustomRateSubmit();
                    }
                  }}
                  autoFocus
                />
              </div>
              {customRate && (
                <button
                  type="button"
                  className="mt-1 w-full text-left px-2 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                  onClick={handleCustomRateSubmit}
                >
                  Use ₹{customRate} per liter
                </button>
              )}
            </div>

            {/* Past Rates */}
            <div className="max-h-40 overflow-y-auto">
              {filteredRates.length > 0 ? ( /* Added dark mode classes */
                filteredRates.map((rateData) => (
                  <div
                    key={rateData.rate}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    onClick={() => handleRateSelect(rateData.rate)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">₹{rateData.rate.toFixed(2)}</span>
                        {rateData.warehouseNames.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({rateData.warehouseNames.join(', ')})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        Used {rateData.count} time{rateData.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {searchTerm ? 'No rates found' : 'No past fuel rates available'}
                </div>
              )}
            </div>

            {/* Current Warehouse Suggestion */}
            {selectedWarehouseId && ( /* Added dark mode classes */
              <div className="p-2 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600">
                  💡 Tip: Rates at {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'this location'} 
                  typically range ₹95-₹97
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-error-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default FuelRateSelector;