import React, { useState, useMemo, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Plus, Trash2, Wrench, DollarSign, FileText, CheckSquare, ChevronDown, ChevronUp, Upload, Package, Store, IndianRupee, X, Check, Truck } from 'lucide-react';
import { getVendors } from '../../utils/storage';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

// ===== CONSTANTS =====
const MAINTENANCE_TASKS = [
  'Engine Oil Change', 'Oil Filter Replacement', 'Air Filter Cleaning', 'Air Filter Replacement',
  'Fuel Filter Replacement', 'Chassis Greasing', 'Tyre Rotation', 'Tyre Pressure Check',
  'Wheel Alignment', 'Wheel Balancing', 'Brake Pad Replacement', 'Brake Shoe Replacement',
  'Brake Fluid Replacement', 'Brake Bleeding', 'Brake Adjustment', 'Brake Disc Resurfacing',
  'Handbrake Adjustment', 'Clutch Adjustment', 'Clutch Plate Replacement', 'Clutch Cable Replacement',
  'Battery Charging', 'Battery Replacement', 'Battery Terminal Cleaning', 'Coolant Flush/Radiator Flush',
  'Coolant Top-up', 'Radiator Cleaning', 'Radiator Hose Replacement', 'Thermostat Replacement',
  'Water Pump Replacement', 'Tappet Adjustment', 'Engine Tune-up', 'Injector Cleaning',
  'Belt Tensioning', 'Transmission Oil Change', 'Differential Oil Change', 'Shock Absorber Replacement',
  'Spring Replacement', 'Ball Joint Replacement', 'Tie Rod End Replacement', 'Wheel Bearing Service',
  'Steering Adjustment', 'Power Steering Fluid Check', 'Alternator Check', 'Starter Motor Service',
  'Wiring Repairs', 'Light Bulb Replacement', 'Fuse Replacement', 'Windshield Wiper Replacement',
  'AC Service/Gas Filling', 'Underbody Wash',
];

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

interface ServiceGroup {
  id: string;
  serviceType: 'purchase' | 'labor' | 'both' | '';
  vendor: string;
  tasks: string[];
  cost: number;
  notes?: string;
  bills?: File[];
  
  // Parts tracking
  batteryData?: {
    serialNumber: string;
    brand: string;
  };
  tyreData?: {
    positions: string[];
    brand: string;
    serialNumbers: string;
  };
  partsData?: Array<{
    partType: string;
    partName: string;
    brand: string;
    serialNumber?: string;
    quantity: number;
    warrantyPeriod?: string;
    warrantyDocument?: File;
  }>;
  
  // Warranty uploads
  batteryWarrantyFiles?: File[];
  tyreWarrantyFiles?: File[];
}

interface ServiceGroupsSectionProps {
  serviceGroups: ServiceGroup[];
  onChange: (groups: ServiceGroup[]) => void;
  vehicleType?: string;
}

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
        
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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

// Selected Tasks Display with colorful tags
const SelectedTasksTags = ({ tasks, onRemove }) => {
  if (!tasks || tasks.length === 0) return null;

  const COLORS = [
    'bg-blue-100 text-blue-700 border-blue-300',
    'bg-purple-100 text-purple-700 border-purple-300',
    'bg-pink-100 text-pink-700 border-pink-300',
    'bg-green-100 text-green-700 border-green-300',
    'bg-yellow-100 text-yellow-700 border-yellow-300',
    'bg-red-100 text-red-700 border-red-300',
    'bg-indigo-100 text-indigo-700 border-indigo-300',
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tasks.map((task, idx) => (
        <div
          key={idx}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${COLORS[idx % COLORS.length]}`}
        >
          <span>{task}</span>
          <button
            type="button"
            onClick={() => onRemove(task)}
            className="hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
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

// Part Replacement Component
const PartReplacement = ({ partData, onChange, onRemove, vehicleType }) => {
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
          onAddNew={(newPart) => console.log('New part type added:', newPart)}
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
            onChange={(e) => onChange({ ...partData, warrantyDocument: e.target.files[0] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
};

// Service Group Component
const ServiceGroup = ({ 
  groupData, 
  onChange, 
  onRemove, 
  index,
  canRemove,
  vehicleType,
  vendors,
  loadingVendors
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTaskRemove = (taskToRemove) => {
    const newTasks = (groupData.tasks || []).filter(task => task !== taskToRemove);
    onChange({ ...groupData, tasks: newTasks });
  };

  const handlePartChange = (partIndex, updatedPart) => {
    const newParts = [...(groupData.parts || [])];
    newParts[partIndex] = updatedPart;
    onChange({ ...groupData, parts: newParts });
  };

  const addPart = () => {
    const newParts = [...(groupData.parts || []), {
      id: Date.now(),
      partType: '',
      partName: '',
      brand: '',
      serialNumber: '',
      quantity: 1,
      warrantyPeriod: '',
      warrantyDocument: null,
      tyrePositions: []
    }];
    onChange({ ...groupData, parts: newParts });
  };

  const removePart = (partIndex) => {
    const newParts = (groupData.parts || []).filter((_, idx) => idx !== partIndex);
    onChange({ ...groupData, parts: newParts });
  };

  // Helper text based on service type
  const getServiceTypeHelp = (type) => {
    switch(type) {
      case 'purchase':
        return '💡 You bought parts here. Add them below.';
      case 'labor':
        return '💡 You got service/repairs done here. Parts bought elsewhere.';
      case 'both':
        return '💡 You bought parts AND got them installed here.';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-green-600" />
          Shop/Mechanic {index + 1}
        </h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Quick Entry Fields - Always Visible */}
        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-green-900">Quick Entry</span>
          </div>

          <div className="space-y-3">
            {/* Service Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What did you do here? <span className="text-red-500">*</span>
              </label>
              <select
                value={groupData.serviceType || ''}
                onChange={(e) => onChange({ ...groupData, serviceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose...</option>
                <option value="purchase">Bought Parts Only</option>
                <option value="labor">Got Service/Repair Done</option>
                <option value="both">Bought Parts + Got Them Installed</option>
              </select>
              {groupData.serviceType && (
                <p className="mt-1 text-xs text-gray-600">{getServiceTypeHelp(groupData.serviceType)}</p>
              )}
            </div>

            <InlineSearchableDropdown
              label="Shop/Mechanic Name"
              options={vendors}
              value={groupData.vendor}
              onChange={(val) => onChange({ ...groupData, vendor: val })}
              onAddNew={(newVendor) => {
                console.log('New vendor added:', newVendor);
                // Add the new vendor to the list
                setVendors(prev => [...prev, newVendor]);
              }}
              icon={Store}
              required
              placeholder={loadingVendors ? "Loading vendors..." : "Select or add new..."}
            />

            <div>
              <InlineSearchableDropdown
                label="What work was done?"
                options={MAINTENANCE_TASKS}
                value={groupData.tasks}
                onChange={(val) => onChange({ ...groupData, tasks: val })}
                onAddNew={(newTask) => console.log('New task added:', newTask)}
                icon={Wrench}
                required
                multiSelect
                placeholder="Select work done or type new..."
              />
              <SelectedTasksTags 
                tasks={groupData.tasks} 
                onRemove={handleTaskRemove}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={groupData.cost || ''}
                  onChange={(e) => onChange({ ...groupData, cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Detailed Section */}
        <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-yellow-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-yellow-700" />
              )}
              <span className="text-sm font-semibold text-yellow-900">
                Add More Details (Bills, Notes, Parts)
              </span>
            </div>
          </button>

          {isExpanded && (
            <div className="mt-4 space-y-4 pl-6 border-l-3 border-yellow-400">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra Notes
                </label>
                <textarea
                  value={groupData.notes || ''}
                  onChange={(e) => onChange({ ...groupData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Bills/Receipts
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => onChange({ ...groupData, bills: Array.from(e.target.files) })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <Upload className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Part Replacements */}
              {(groupData.serviceType === 'purchase' || groupData.serviceType === 'both') && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Parts You Bought Here
                  </h4>

                  <div className="space-y-3">
                    {(groupData.parts || []).map((part, partIndex) => (
                      <PartReplacement
                        key={part.id || partIndex}
                        partData={part}
                        onChange={(updated) => handlePartChange(partIndex, updated)}
                        onRemove={() => removePart(partIndex)}
                        vehicleType={vehicleType}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={addPart}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50 flex items-center justify-center gap-2 font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Part
                    </button>
                  </div>
                </div>
              )}

              {groupData.serviceType === 'labor' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    💡 Since this is labor only, you don't need to add parts here. Add parts in the group where you bought them.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceGroupsSection: React.FC<ServiceGroupsSectionProps> = ({
  serviceGroups,
  onChange,
  vehicleType,
}) => {
  const [vendors, setVendors] = useState<string[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Fetch vendors from database
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorData = await getVendors();
        const vendorNames = vendorData.map(vendor => vendor.name);
        setVendors(vendorNames);
      } catch (error) {
        console.error('Error fetching vendors:', error);
        // Fallback to hardcoded vendors
        setVendors(['ABC Auto Parts', 'XYZ Lubricants', 'Ravi Auto Works', 'Kumar Garage', 'City Service Center']);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, []);

  const addServiceGroup = () => {
    const newGroup: ServiceGroup = {
      id: Date.now().toString(),
      serviceType: '',
      vendor: '',
      tasks: [],
      cost: 0,
      notes: '',
      bills: [],
      parts: []
    };
    onChange([...serviceGroups, newGroup]);
  };

  const removeServiceGroup = (id: string) => {
    onChange(serviceGroups.filter(group => group.id !== id));
  };

  const updateServiceGroup = (index: number, updatedGroup: ServiceGroup) => {
    const newGroups = [...serviceGroups];
    newGroups[index] = updatedGroup;
    onChange(newGroups);
  };

  const totalCost = serviceGroups.reduce((sum, group) => sum + (group.cost || 0), 0);

  return (
    <div className="maintenance-form-section">
      <div className="maintenance-form-section-header">
        <div className="icon">
          <Wrench className="h-5 w-5" />
        </div>
        <h3 className="section-title">Service Groups</h3>
      </div>

      <div className="space-y-4">
        {serviceGroups.map((group, index) => (
          <ServiceGroup
            key={group.id}
            groupData={group}
            onChange={(updated) => updateServiceGroup(index, updated)}
            onRemove={() => removeServiceGroup(group.id)}
            index={index}
            canRemove={serviceGroups.length > 1}
            vehicleType={vehicleType}
            vendors={vendors}
            loadingVendors={loadingVendors}
          />
        ))}

        <button
          type="button"
          onClick={addServiceGroup}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 flex items-center justify-center gap-2 font-semibold text-lg"
        >
          <Plus className="h-5 w-5" />
          Add Another Shop/Mechanic
        </button>

        {serviceGroups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="card-title">No service groups added yet</p>
            <p className="card-subtitle">Click "Add Another Shop/Mechanic" to get started</p>
          </div>
        )}
      </div>

      {/* Total Cost Summary */}
      {serviceGroups.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Total Amount</h3>
              <p className="text-sm text-gray-600">{serviceGroups.length} shop(s)/mechanic(s)</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600 flex items-center gap-1">
                <IndianRupee className="h-7 w-7" />
                {totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceGroupsSection;
