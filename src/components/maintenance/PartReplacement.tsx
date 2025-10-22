import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Package, X, Check } from 'lucide-react';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PartReplacement');

// ===== CONSTANTS =====
const PART_TYPES = [
  'Battery', 'Tyre', 'Clutch Plate', 'Clutch Assembly', 'Gearbox', 'Timing Belt', 'Drive Belt',
  'Leaf Spring', 'Engine Oil', 'Engine Oil Filter', 'Air Filter', 'Fuel Filter', 'Brake Pad',
  'Brake Shoe', 'Brake Disc', 'Brake Drum', 'Radiator', 'Radiator Hose', 'Water Pump',
  'Thermostat', 'Alternator', 'Starter Motor', 'Shock Absorber', 'Ball Joint', 'Tie Rod End',
  'Wheel Bearing', 'Spark Plug', 'Glow Plug', 'EGR Valve', 'DPF Filter', 'Catalytic Converter',
  'Muffler/Silencer', 'Universal Joint', 'Propeller Shaft', 'Wheel Cylinder', 'Brake Caliper',
  'Master Cylinder', 'Engine Mount', 'Transmission Mount', 'Door Seal', 'Windshield', 'Side Mirror',
];

const WARRANTY_QUICK_OPTIONS = [
  { label: '12m', value: '12 months', months: 12 },
  { label: '36m', value: '36 months', months: 36 },
  { label: '48m', value: '48 months', months: 48 },
];

// ===== HELPER COMPONENTS =====

// Inline Searchable Dropdown with Add functionality
const InlineSearchableDropdown = ({ 
  label, 
  options, 
  value, 
  onChange, 
  onAddNew,
  placeholder = "Select or type to search...",
  required = false,
  icon: Icon,
  multiSelect = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customOptions, setCustomOptions] = useState([]);

  const allOptions = useMemo(() => {
    return [...options, ...customOptions];
  }, [options, customOptions]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return allOptions;
    return allOptions.filter(opt => 
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allOptions]);

  const selectedValues = useMemo(() => {
    if (!multiSelect) return value ? [value] : [];
    return Array.isArray(value) ? value : [];
  }, [value, multiSelect]);

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return '';
    if (multiSelect) {
      return selectedValues.length === 1 
        ? selectedValues[0]
        : `${selectedValues.length} selected`;
    }
    return selectedValues[0];
  }, [selectedValues, multiSelect]);

  const handleSelect = (option) => {
    if (multiSelect) {
      const newValue = selectedValues.includes(option)
        ? selectedValues.filter(v => v !== option)
        : [...selectedValues, option];
      onChange(newValue);
    } else {
      onChange(option);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleAddNew = () => {
    if (searchTerm && !allOptions.includes(searchTerm)) {
      setCustomOptions([...customOptions, searchTerm]);
      if (onAddNew) onAddNew(searchTerm);
      handleSelect(searchTerm);
      setSearchTerm('');
    }
  };

  const showAddButton = searchTerm && filteredOptions.length === 0;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        
        <input
          type="text"
          value={isOpen ? searchTerm : displayText}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent`}
        />
        
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(option)}
                className={`px-3 py-2 cursor-pointer hover:bg-green-50 flex items-center justify-between ${
                  selectedValues.includes(option) ? 'bg-green-100' : ''
                }`}
              >
                <span className="text-sm text-gray-700">{option}</span>
                {selectedValues.includes(option) && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
            ))
          ) : showAddButton ? (
            <div
              onClick={handleAddNew}
              className="px-3 py-2 cursor-pointer hover:bg-green-50 flex items-center gap-2 text-green-600"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add "{searchTerm}"</span>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Type to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Warranty Period Quick Select
const WarrantyQuickSelect = ({ value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Warranty Period
      </label>
      <div className="flex gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {WARRANTY_QUICK_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                value === option.value
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="or type custom..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

// Tyre Position Selector with Visual
const TyrePositionSelector = ({ vehicleType, selectedPositions, onChange }) => {
  const VEHICLE_TYPES = {
    PICKUP_4TYRE: {
      name: 'Pickup (4 Tyre)',
      tyreCount: 4,
      positions: ['FL', 'FR', 'RL', 'RR'],
      labels: ['Front Left', 'Front Right', 'Rear Left', 'Rear Right']
    },
    TEMPO_3TYRE: {
      name: 'Tempo (3 Tyre)',
      tyreCount: 3,
      positions: ['F', 'RL', 'RR'],
      labels: ['Front', 'Rear Left', 'Rear Right']
    }
  };

  const config = VEHICLE_TYPES[vehicleType];
  
  if (!config) return null;

  const togglePosition = (position) => {
    const newPositions = selectedPositions.includes(position)
      ? selectedPositions.filter(p => p !== position)
      : [...selectedPositions, position];
    onChange(newPositions);
  };

  const renderDiagram = () => {
    if (vehicleType === 'PICKUP_4TYRE') {
      return (
        <div className="relative w-32 h-48 border-2 border-gray-300 rounded-lg bg-gray-50">
          <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-sm" title="Driver" />
          
          <div 
            onClick={() => togglePosition('FL')}
            className={`absolute top-4 left-0 w-8 h-12 rounded-l-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('FL') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Front Left"
          />
          
          <div 
            onClick={() => togglePosition('FR')}
            className={`absolute top-4 right-0 w-8 h-12 rounded-r-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('FR') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Front Right"
          />
          
          <div 
            onClick={() => togglePosition('RL')}
            className={`absolute bottom-4 left-0 w-8 h-12 rounded-l-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('RL') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Rear Left"
          />
          
          <div 
            onClick={() => togglePosition('RR')}
            className={`absolute bottom-4 right-0 w-8 h-12 rounded-r-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('RR') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Rear Right"
          />
        </div>
      );
    } else {
      return (
        <div className="relative w-32 h-48 border-2 border-gray-300 rounded-lg bg-gray-50">
          <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-sm" title="Driver" />
          
          <div 
            onClick={() => togglePosition('F')}
            className={`absolute top-4 left-1/2 -translate-x-1/2 w-10 h-12 rounded-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('F') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Front"
          />
          
          <div 
            onClick={() => togglePosition('RL')}
            className={`absolute bottom-4 left-0 w-8 h-12 rounded-l-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('RL') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Rear Left"
          />
          
          <div 
            onClick={() => togglePosition('RR')}
            className={`absolute bottom-4 right-0 w-8 h-12 rounded-r-lg cursor-pointer border-2 transition-colors ${
              selectedPositions.includes('RR') 
                ? 'bg-green-500 border-green-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
            }`}
            title="Rear Right"
          />
        </div>
      );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Which Tyres?</h4>
      
      <div className="flex gap-4">
        {renderDiagram()}
        
        <div className="flex-1 space-y-2">
          {config.positions.map((pos, idx) => (
            <label key={pos} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPositions.includes(pos)}
                onChange={() => togglePosition(pos)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium">{pos}</span> - {config.labels[idx]}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====

interface PartData {
  id?: string;
  partType: string;
  partName?: string;
  brand?: string;
  serialNumber?: string;
  quantity?: number;
  warrantyPeriod?: string;
  warrantyDocument?: File;
  tyrePositions?: string[];
}

interface PartReplacementProps {
  partData: PartData;
  onChange: (updatedPart: PartData) => void;
  onRemove: () => void;
  vehicleType?: 'PICKUP_4TYRE' | 'TEMPO_3TYRE';
}

const PartReplacement: React.FC<PartReplacementProps> = ({ 
  partData, 
  onChange, 
  onRemove, 
  vehicleType 
}) => {
  const [showTyreDetails, setShowTyreDetails] = useState(partData.partType === 'Tyre');

  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-red-900">Part Details</h4>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <InlineSearchableDropdown
          label="What part?"
          options={PART_TYPES}
          value={partData.partType}
          onChange={(val) => {
            onChange({ ...partData, partType: val });
            setShowTyreDetails(val === 'Tyre');
          }}
          onAddNew={(newPart) => logger.debug('New part type added:', newPart)}
          icon={Package}
          required
        />

        {showTyreDetails && vehicleType && (
          <TyrePositionSelector
            vehicleType={vehicleType}
            selectedPositions={partData.tyrePositions || []}
            onChange={(positions) => onChange({ ...partData, tyrePositions: positions })}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Part Name/Model
            </label>
            <input
              type="text"
              value={partData.partName || ''}
              onChange={(e) => onChange({ ...partData, partName: e.target.value })}
              placeholder="e.g., Exide FHP0-DIN60"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={partData.brand || ''}
              onChange={(e) => onChange({ ...partData, brand: e.target.value })}
              placeholder="e.g., Exide"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number
            </label>
            <input
              type="text"
              value={partData.serialNumber || ''}
              onChange={(e) => onChange({ ...partData, serialNumber: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many?
            </label>
            <input
              type="number"
              min="1"
              value={partData.quantity || 1}
              onChange={(e) => onChange({ ...partData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <WarrantyQuickSelect
          value={partData.warrantyPeriod}
          onChange={(val) => onChange({ ...partData, warrantyPeriod: val })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warranty Paper/Photo
          </label>
          <input
            type="file"
            onChange={(e) => onChange({ ...partData, warrantyDocument: e.target.files?.[0] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default PartReplacement;
