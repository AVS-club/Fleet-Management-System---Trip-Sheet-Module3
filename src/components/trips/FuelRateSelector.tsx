```typescript
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Trip, Warehouse } from '../../types';
import { cn } from '../../utils/cn';

interface FuelRateSelectorProps {
  selectedRate?: number;
  onChange: (rate: number) => void;
  warehouses: Warehouse[];
  selectedWarehouseId?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

const WAREHOUSE_COLORS = [
  { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  { bg: 'bg-pink-100', text: 'text-pink-800', dot: 'bg-pink-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
];

const getWarehouseColor = (warehouseName: string) => {
  const hash = warehouseName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return WAREHOUSE_COLORS[Math.abs(hash) % WAREHOUSE_COLORS.length];
};

const getWarehouseAlias = (warehouseName: string) => {
  const words = warehouseName.split(' ');
  if (words.length > 1) {
    return words.map(word => word.charAt(0)).join('').substring(0, 3).toUpperCase();
  }
  return warehouseName.substring(0, 3).toUpperCase();
};

const FuelRateSelector: React.FC<FuelRateSelectorProps> = ({
  selectedRate,
  onChange,
  warehouses,
  selectedWarehouseId,
  error,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { getTrips } = await import('../../utils/storage');
        const tripsData = await getTrips();
        setTrips(Array.isArray(tripsData) ? tripsData : []);
      } catch (error) {
        console.error('Error fetching trips:', error);
        setTrips([]);
      }
    };
    fetchTrips();
  }, []);

  const { pastRates, frequentRates } = useMemo(() => {
    const rateMap = new Map<number, { count: number; warehouseNames: Set<string> }>();
    (trips ?? []).forEach(trip => {
      if (trip.refueling_done && trip.fuel_rate_per_liter && trip.fuel_rate_per_liter > 0) {
        const rate = Math.round(trip.fuel_rate_per_liter * 100) / 100;
        if (!rateMap.has(rate)) {
          rateMap.set(rate, { count: 0, warehouseNames: new Set() });
        }
        const rateData = rateMap.get(rate)!;
        rateData.count++;
        if (trip.warehouse_id) {
          const warehouse = warehouses.find(w => w.id === trip.warehouse_id);
          if (warehouse) {
            rateData.warehouseNames.add(warehouse.name);
          }
        }
      }
    });
    const allRates = Array.from(rateMap.entries())
      .map(([rate, data]) => ({
        rate,
        count: data.count,
        warehouseNames: Array.from(data.warehouseNames).slice(0, 2),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topFrequentRates = allRates.slice(0, 4);
    return { pastRates: allRates, frequentRates: topFrequentRates };
  }, [trips, warehouses]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm', 
    lg: 'px-4 py-3 text-base'
  };

  const filteredRates = pastRates.filter(rateData => 
    rateData.rate.toString().includes(searchTerm) ||
    rateData.warehouseNames.some(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRateSelect = (rate: number) => {
    onChange(rate);
    setIsOpen(false);
    setCustomRate('');
  };

  const handleCustomRateSubmit = () => {
    const rate = parseFloat(customRate);
    if (!isNaN(rate) && rate > 0) {
      onChange(rate);
      setIsOpen(false);
      setCustomRate('');
    }
  };

  const handleFrequentRateClick = (rate: number) => {
    onChange(rate);
  };

  const displayValue = selectedRate ? \`₹${selectedRate.toFixed(2)}` : '';

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Fuel Rate per Liter (₹)<span className="text-error-500 ml-1">*</span>
      </label>
      <div className="relative" ref={dropdownRef}>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div
            className={cn(
              "relative flex items-center justify-between border rounded-md bg-white dark:bg-gray-800 cursor-pointer",
              error ? "border-error-500" : "border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400",
              "focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200",
              sizeClasses[size]
            )}
            onClick={() => setIsOpen(true)}
          >
            <span className={selectedRate ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
              {displayValue || 'Select or enter fuel rate'}
            </span>
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 pointer-events-none">
              {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
            </div>
          </div>
          {frequentRates.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {frequentRates.map((rateData) => {
                const warehouseName = rateData.warehouseNames[0] || 'Unknown';
                const color = getWarehouseColor(warehouseName);
                return (
                  <button key={rateData.rate} type="button" onClick={() => handleFrequentRateClick(rateData.rate)} className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-sm",
                    color.bg, color.text, "border-current hover:opacity-90"
                  )}>
                    <span className={cn("w-2 h-2 rounded-full mr-1", color.dot)}></span>
                    ₹{rateData.rate.toFixed(2)}<span className="ml-1 opacity-80">{getWarehouseAlias(warehouseName)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">No past rates available.</div>
          )}
        </div>
      </div>
      {error && <p className="text-error-500 dark:text-error-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default FuelRateSelector;
```