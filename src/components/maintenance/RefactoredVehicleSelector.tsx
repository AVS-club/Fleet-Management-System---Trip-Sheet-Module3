import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Truck, Check, Search, ChevronDown, X } from 'lucide-react';
import { Vehicle } from '@/types';
import { formatVehicleLabel } from '@/utils/vehicleFormatter';
import { debounce } from 'lodash';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';

interface RefactoredVehicleSelectorProps {
  selectedVehicle?: string;
  onChange: (vehicleId: string) => void;
  vehicles: Vehicle[];
  error?: string;
  required?: boolean;
  label?: string;
}

const RefactoredVehicleSelector: React.FC<RefactoredVehicleSelectorProps> = ({
  selectedVehicle,
  onChange,
  vehicles,
  error,
  required = true,
  label = 'Vehicle',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Clear search on close
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure dropdown is rendered
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter vehicles with debounced search
  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return vehicles;
    
    const term = searchTerm.toLowerCase();
    return vehicles.filter(vehicle => {
      const searchableText = `${vehicle.registration_number} ${vehicle.make} ${vehicle.model}`.toLowerCase();
      return searchableText.includes(term);
    });
  }, [vehicles, searchTerm]);

  // Get selected vehicle details
  const selectedVehicleDetails = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicle),
    [vehicles, selectedVehicle]
  );

  // Format vehicle option label using the formatter
  const getVehicleDisplayLabel = (vehicle: Vehicle) => {
    const makeModel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim();
    return formatVehicleLabel(vehicle.registration_number, makeModel);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredVehicles.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredVehicles[highlightedIndex]) {
          handleVehicleSelect(filteredVehicles[highlightedIndex].id);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const options = optionsRef.current.querySelectorAll('[data-option]');
      const highlighted = options[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const handleVehicleSelect = (vehicleId: string) => {
    onChange(vehicleId);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {/* Main selector button */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          tabIndex={0}
          className={`
            min-h-[44px] p-3 border rounded-lg bg-white cursor-pointer
            transition-all duration-200
            ${isOpen 
              ? 'border-primary-500 ring-2 ring-primary-200 shadow-md' 
              : 'border-gray-300 hover:border-primary-300'
            }
            ${error ? 'border-red-500' : ''}
          `}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center justify-between">
            {selectedVehicleDetails ? (
              <div className="flex items-center gap-2 flex-1">
                <Truck className="h-5 w-5 text-primary-600 flex-shrink-0" />
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {getVehicleDisplayLabel(selectedVehicleDetails)}
                    </span>
                    {selectedVehicleDetails.tags && selectedVehicleDetails.tags.length > 0 && (
                      <VehicleTagBadges 
                        tags={selectedVehicleDetails.tags} 
                        readOnly 
                        size="sm"
                        maxDisplay={2}
                      />
                    )}
                  </div>
                  <span className={`
                    mt-1 inline-block px-2 py-0.5 text-xs rounded-full
                    ${selectedVehicleDetails.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {selectedVehicleDetails.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <Truck className="h-5 w-5" />
                <span>Select a vehicle</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 ml-2">
              {selectedVehicleDetails && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              <ChevronDown className={`
                h-5 w-5 text-gray-400 transition-transform duration-200
                ${isOpen ? 'rotate-180' : ''}
              `} />
            </div>
          </div>
        </div>

        {/* Dropdown with inline search */}
        {isOpen && (
          <div className={`
            absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl
            border border-gray-200 overflow-hidden
            animate-in fade-in slide-in-from-top-1 duration-200
          `}>
            {/* Inline Search Bar */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           placeholder-gray-400"
                  placeholder="Search by registration, make, or model..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} available
              </div>
            </div>

            {/* Vehicle Options */}
            <div 
              ref={optionsRef}
              className="max-h-[300px] overflow-y-auto"
              role="listbox"
            >
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    data-option
                    role="option"
                    aria-selected={selectedVehicle === vehicle.id}
                    className={`
                      px-4 py-3 cursor-pointer transition-all duration-150
                      border-b border-gray-100 last:border-b-0
                      ${selectedVehicle === vehicle.id 
                        ? 'bg-primary-50' 
                        : highlightedIndex === index
                        ? 'bg-gray-50'
                        : 'hover:bg-gray-50'
                      }
                    `}
                    onClick={() => handleVehicleSelect(vehicle.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Truck className={`
                          h-5 w-5 mt-0.5 flex-shrink-0
                          ${selectedVehicle === vehicle.id 
                            ? 'text-primary-600' 
                            : 'text-gray-400'
                          }
                        `} />
                        
                        <div className="flex-1 min-w-0">
                          {/* Main vehicle info */}
                          <div className="flex items-center gap-2">
                            <span className={`
                              font-medium
                              ${selectedVehicle === vehicle.id 
                                ? 'text-primary-900' 
                                : 'text-gray-900'
                              }
                            `}>
                              {getVehicleDisplayLabel(vehicle)}
                            </span>
                            {vehicle.tags && vehicle.tags.length > 0 && (
                              <VehicleTagBadges 
                                tags={vehicle.tags} 
                                readOnly 
                                size="sm"
                                maxDisplay={2}
                              />
                            )}
                          </div>
                          
                          {/* Additional details */}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">ODO:</span>
                              {vehicle.current_odometer?.toLocaleString('en-IN') || 0} km
                            </span>
                            
                            {vehicle.fuel_type && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Fuel:</span>
                                {vehicle.fuel_type}
                              </span>
                            )}
                            
                            {vehicle.assigned_driver && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Driver:</span>
                                Assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded-full
                          ${vehicle.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : vehicle.status === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}>
                          {vehicle.status?.toUpperCase()}
                        </span>
                        
                        {selectedVehicle === vehicle.id && (
                          <Check className="h-5 w-5 text-primary-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No vehicles found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats Footer */}
            {filteredVehicles.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Active: {filteredVehicles.filter(v => v.status === 'active').length}</span>
                  <span>Maintenance: {filteredVehicles.filter(v => v.status === 'maintenance').length}</span>
                  <span>Total Fleet: {vehicles.length}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default RefactoredVehicleSelector;
