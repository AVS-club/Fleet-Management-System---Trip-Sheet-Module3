import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Plus, Trash2, Wrench, DollarSign, FileText, CheckSquare, ChevronDown, ChevronUp, Upload, Package, Store, IndianRupee, X, Check, Truck } from 'lucide-react';
import { getVendors } from '../../utils/storage';
import { supabase } from '../../utils/supabaseClient';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { createLogger } from '../../utils/logger';
import PartReplacement from './PartReplacement';

const logger = createLogger('ServiceGroupsSection');

/**
 * Converts task names to task IDs by querying maintenance_tasks_catalog
 * This allows the UI to use human-readable names while the database uses UUIDs
 */
const convertTaskNamesToIds = async (taskNames: string[]): Promise<string[]> => {
  if (!Array.isArray(taskNames) || taskNames.length === 0) {
    return [];
  }

  try {
    // Query the catalog to get UUIDs for the task names
    const { data, error } = await supabase
      .from('maintenance_tasks_catalog')
      .select('id, task_name')
      .in('task_name', taskNames)
      .eq('active', true);

    if (error) {
      logger.error('Error fetching task IDs:', error);
      return [];
    }

    if (!data || data.length === 0) {
      logger.warn('No matching tasks found in catalog for:', taskNames);
      return [];
    }

    // Create a map of task names to IDs
    const nameToIdMap = new Map(
      data.map(task => [task.task_name, task.id])
    );

    // Convert names to IDs, maintaining order
    const taskIds = taskNames
      .map(name => nameToIdMap.get(name))
      .filter((id): id is string => id !== undefined);

    logger.debug('Converted task names to IDs:', {
      input: taskNames,
      output: taskIds,
      mapping: Object.fromEntries(nameToIdMap)
    });

    return taskIds;
  } catch (error) {
    logger.error('Error in convertTaskNamesToIds:', error);
    return [];
  }
};

// ===== CONSTANTS =====
// UPDATED: Split tasks into Purchase (buying parts) vs Labor (installation/service)
const MAINTENANCE_TASKS = [
  // ===== PURCHASE TASKS (When buying parts) =====
  'Engine Oil Purchase',
  'Oil Filter Purchase',
  'Air Filter Purchase',
  'Fuel Filter Purchase',
  'Battery Purchase',
  'Tyre Purchase',
  'Brake Pad Purchase',
  'Brake Shoe Purchase',
  'Brake Disc Purchase',
  'Brake Drum Purchase',
  'Brake Oil Purchase',
  'Clutch Plate Purchase',
  'Clutch Assembly Purchase',
  'Coolant Purchase',
  'Radiator Hose Purchase',
  'Water Pump Purchase',
  'Thermostat Purchase',
  'Alternator Purchase',
  'Starter Motor Purchase',
  'Shock Absorber Purchase',
  'Spring Purchase',
  'Ball Joint Purchase',
  'Tie Rod End Purchase',
  'Wheel Bearing Purchase',
  'Spark Plug Purchase',
  'Glow Plug Purchase',
  'Timing Belt Purchase',
  'Drive Belt Purchase',
  'Windshield Wiper Purchase',
  'Light Bulb Purchase',
  'Fuse Purchase',
  'Parts Purchase', // Generic option

  // ===== LABOR/SERVICE TASKS (When getting work done) =====
  'Engine Oil Change',
  'Oil Filter Replacement',
  'Air Filter Cleaning',
  'Air Filter Replacement',
  'Fuel Filter Replacement',
  'Battery Installation',
  'Battery Charging',
  'Battery Terminal Cleaning',
  'Tyre Installation',
  'Tyre Rotation',
  'Tyre Puncture Repair',
  'Tyre Pressure Check',
  'Wheel Alignment',
  'Wheel Balancing',
  'Brake Pad Replacement',
  'Brake Shoe Replacement',
  'Brake Disc Resurfacing',
  'Brake Drum Turning',
  'Brake Fluid Replacement',
  'Brake Bleeding',
  'Brake Adjustment',
  'Handbrake Adjustment',
  'Clutch Plate Replacement',
  'Clutch Assembly Replacement',
  'Clutch Adjustment',
  'Clutch Cable Replacement',
  'Coolant Flush/Radiator Flush',
  'Coolant Top-up',
  'Radiator Cleaning',
  'Radiator Hose Replacement',
  'Thermostat Replacement',
  'Water Pump Replacement',
  'Tappet Adjustment',
  'Engine Tune-up',
  'Injector Cleaning',
  'Belt Tensioning',
  'Belt Replacement',
  'Transmission Oil Change',
  'Differential Oil Change',
  'Shock Absorber Replacement',
  'Spring Replacement',
  'Ball Joint Replacement',
  'Tie Rod End Replacement',
  'Wheel Bearing Service',
  'Wheel Bearing Replacement',
  'Steering Adjustment',
  'Power Steering Fluid Check',
  'Alternator Check',
  'Alternator Replacement',
  'Starter Motor Service',
  'Starter Motor Replacement',
  'Wiring Repairs',
  'Light Bulb Replacement',
  'Fuse Replacement',
  'Windshield Wiper Replacement',
  'AC Service/Gas Filling',
  'AC Compressor Replacement',
  'Underbody Wash',
  'Chassis Greasing',
  'Engine Decarbonization',
  'DPF Cleaning',
  'EGR Valve Cleaning',
  'General Service',
  'Periodic Maintenance',
  'Repair Work', // Generic option
];

// ===== MAPPING OF PURCHASE TASKS TO PART TYPES =====
const TASK_TO_PART_MAPPING: Record<string, string> = {
  'Engine Oil Purchase': 'Engine Oil',
  'Oil Filter Purchase': 'Oil Filter',
  'Air Filter Purchase': 'Air Filter',
  'Fuel Filter Purchase': 'Fuel Filter',
  'Battery Purchase': 'Battery',
  'Tyre Purchase': 'Tyre',
  'Brake Pad Purchase': 'Brake Pad',
  'Brake Shoe Purchase': 'Brake Shoe',
  'Brake Disc Purchase': 'Brake Disc',
  'Brake Drum Purchase': 'Brake Drum',
  'Brake Oil Purchase': 'Brake Oil',
  'Clutch Plate Purchase': 'Clutch Plate',
  'Coolant Purchase': 'Coolant',
  'Radiator Hose Purchase': 'Radiator Hose',
  'Water Pump Purchase': 'Water Pump',
  'Thermostat Purchase': 'Thermostat',
  'Alternator Purchase': 'Alternator',
  'Starter Motor Purchase': 'Starter Motor',
  'Shock Absorber Purchase': 'Shock Absorber',
  'Spring Purchase': 'Leaf Spring',
  'Ball Joint Purchase': 'Ball Joint',
  'Tie Rod End Purchase': 'Tie Rod End',
  'Wheel Bearing Purchase': 'Wheel Bearing',
  'Spark Plug Purchase': 'Spark Plug',
  'Glow Plug Purchase': 'Glow Plug',
  'Belt Purchase': 'Drive Belt',
  'Windshield Wiper Purchase': 'Windshield Wiper',
  'Light Bulb Purchase': 'Light Bulb',
  'Fuse Purchase': 'Fuse',
};

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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);

  // Get recently used tasks from localStorage
  const recentTasks = useMemo(() => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentMaintenanceTasks') || '[]');
      return recent.slice(0, 3); // Top 3 recent tasks
    } catch {
      return [];
    }
  }, []);

  const allOptions = useMemo(() => {
    const combined = [...options, ...customOptions];
    // Put recent tasks at top if not searching
    if (!searchTerm && recentTasks.length > 0) {
      const recent = recentTasks.filter(task => combined.includes(task));
      const remaining = combined.filter(opt => !recentTasks.includes(opt));
      return [...recent, ...remaining];
    }
    return combined;
  }, [options, customOptions, recentTasks, searchTerm]);

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

  // Save to recent tasks
  const saveToRecent = (task) => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentMaintenanceTasks') || '[]');
      const updated = [task, ...recent.filter(t => t !== task)].slice(0, 10);
      localStorage.setItem('recentMaintenanceTasks', JSON.stringify(updated));
    } catch (error) {
      logger.warn('Could not save recent task:', error);
    }
  };

  const handleSelect = (option) => {
    saveToRecent(option);
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

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
          if (!multiSelect) {
            setIsOpen(false);
          }
        } else if (showAddButton) {
          handleAddNew();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        if (!multiSelect) {
          setIsOpen(false);
        }
        break;
    }
  };

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [highlightedIndex, isOpen]);

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
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayText}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all`}
          aria-label={label}
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => {
              const isSelected = selectedValues.includes(option);
              const isHighlighted = idx === highlightedIndex;
              const isRecent = !searchTerm && recentTasks.includes(option);

              return (
                <div
                  key={idx}
                  ref={(el) => (optionRefs.current[idx] = el)}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                    isHighlighted ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-green-50'
                  } ${
                    isSelected ? 'bg-green-100 font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {isRecent && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        RECENT
                      </span>
                    )}
                    <span className={`text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {option}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              );
            })
          ) : showAddButton ? (
            <div
              ref={(el) => (optionRefs.current[0] = el)}
              onClick={handleAddNew}
              className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-green-600 ${
                highlightedIndex === 0 ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-green-50'
              }`}
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

  // AUTO-CREATE PARTS BASED ON PURCHASE TASKS
  useEffect(() => {
    if (groupData.serviceType === 'purchase' || groupData.serviceType === 'both') {
      const purchaseTasks = groupData.tasks.filter(task => task.includes('Purchase'));
      const existingPartTypes = (groupData.parts || []).map(p => p.partType);

      // Create parts for purchase tasks that don't have corresponding parts yet
      const newParts: any[] = [];
      purchaseTasks.forEach(task => {
        const partType = TASK_TO_PART_MAPPING[task];
        if (partType && !existingPartTypes.includes(partType)) {
          newParts.push({
            id: `part-${Date.now()}-${Math.random()}`,
            partType: partType,
            quantity: 1,
            partName: '',
            brand: '',
            serialNumber: '',
            warrantyPeriod: '',
            warrantyDocument: null,
            tyrePositions: []
          });
        }
      });

      if (newParts.length > 0) {
        onChange({
          ...groupData,
          parts: [...(groupData.parts || []), ...newParts],
        });
      }
    }
  }, [groupData.tasks, groupData.serviceType]);

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

  // Filter tasks based on service type
  const getFilteredTasks = (serviceType: string) => {
    if (serviceType === 'purchase') {
      // Show only purchase tasks (tasks ending with "Purchase")
      return MAINTENANCE_TASKS.filter(task => task.includes('Purchase'));
    }
    if (serviceType === 'labor') {
      // Show only labor/service tasks (tasks NOT ending with "Purchase")
      return MAINTENANCE_TASKS.filter(task => !task.includes('Purchase'));
    }
    // For 'both' or empty, show all tasks
    return MAINTENANCE_TASKS;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-visible shadow-sm">
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
                logger.debug('New vendor added:', newVendor);
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
                options={getFilteredTasks(groupData.serviceType)}
                value={groupData.tasks}
                onChange={(val) => onChange({ ...groupData, tasks: val })}
                onAddNew={(newTask) => logger.debug('New task added:', newTask)}
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

              {/* Extra Notes - MOVED TO END AND MADE SMALLER (70% reduction) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra Notes
                </label>
                <textarea
                  value={groupData.notes || ''}
                  onChange={(e) => onChange({ ...groupData, notes: e.target.value })}
                  rows={1}
                  placeholder="Any additional information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  style={{ minHeight: '36px', resize: 'vertical' }}
                />
              </div>
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
        logger.error('Error fetching vendors:', error);
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

/**
 * Converts service groups with task names to service groups with task IDs
 * Call this function before submitting the form
 */
export const convertServiceGroupsToDatabase = async (
  serviceGroups: any[]
): Promise<any[]> => {
  if (!Array.isArray(serviceGroups) || serviceGroups.length === 0) {
    return [];
  }

  logger.debug('Converting service groups for database...', serviceGroups);

  const convertedGroups = await Promise.all(
    serviceGroups.map(async (group) => {
      logger.debug('Converting group:', group);
      logger.debug('Group tasks:', group.tasks);

      // Convert task names to IDs
      const taskIds = await convertTaskNamesToIds(group.tasks || []);
      logger.debug('Converted task IDs:', taskIds);

      const converted = {
        vendor_id: group.vendor || '',
        tasks: taskIds, // Now contains UUIDs
        cost: group.cost || 0,
        battery_tracking: false,
        tyre_tracking: false,
        service_type: group.serviceType || '',
        notes: group.notes || '',
        // Include any other fields you need
      };

      logger.debug('Converted group:', converted);
      return converted;
    })
  );

  logger.debug('Service groups converted for database:', convertedGroups);

  return convertedGroups;
};

export default ServiceGroupsSection;
