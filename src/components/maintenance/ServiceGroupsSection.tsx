import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Plus, Trash2, Wrench, DollarSign, FileText, CheckSquare, ChevronDown, ChevronUp, Upload, Package, Store, IndianRupee, X, Check, Truck } from 'lucide-react';
import { getVendors as getVendorsOld } from '../../utils/storage';
import { getVendors, createVendorFromName, Vendor } from '../../utils/vendorStorage';
import { supabase } from '../../utils/supabaseClient';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { createLogger } from '../../utils/logger';
import { getCurrentUserId, getUserActiveOrganization } from '../../utils/supaHelpers';
import PartReplacement from './PartReplacement';
import LineItemsGridEntry from './LineItemsGridEntry';
import CostEntryModeToggle, { CostEntryMode, getDefaultCostEntryMode } from './CostEntryModeToggle';
import { calculateLineItemsTotal } from '../../utils/maintenanceLineItemsStorage';
import { getLineItemsFromTasks, getPartNameFromTask } from '../../utils/taskToItemsMapping';

const logger = createLogger('ServiceGroupsSection');

/**
 * Converts task names to task IDs by querying maintenance_tasks_catalog
 * Auto-creates custom tasks if they don't exist in the catalog
 */
const convertTaskNamesToIds = async (taskNames: string[]): Promise<string[]> => {
  if (!Array.isArray(taskNames) || taskNames.length === 0) {
    return [];
  }

  try {
    // Get current user and their organization
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.error('No user ID found in convertTaskNamesToIds');
      return [];
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.error('No organization found for user in convertTaskNamesToIds');
      return [];
    }

    // Query the catalog to get UUIDs for the task names
    const { data, error } = await supabase
      .from('maintenance_tasks_catalog')
      .select('id, task_name')
      .in('task_name', taskNames)
      .eq('active', true)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Error fetching task IDs:', error);
      return [];
    }

    // Create a map of task names to IDs
    const nameToIdMap = new Map(
      (data || []).map(task => [task.task_name, task.id])
    );

    // Find tasks that don't exist in catalog (custom tasks)
    const missingTasks = taskNames.filter(name => !nameToIdMap.has(name));

    // Auto-create missing tasks in the catalog
    if (missingTasks.length > 0) {
      logger.debug(`Auto-creating ${missingTasks.length} custom tasks in catalog:`, missingTasks);
      
      const tasksToInsert = missingTasks.map(taskName => ({
        task_name: taskName,
        task_category: 'Custom', // Categorize all custom tasks together
        is_category: false,
        organization_id: organizationId,
        active: true
      }));

      const { data: insertedTasks, error: insertError } = await supabase
        .from('maintenance_tasks_catalog')
        .insert(tasksToInsert)
        .select('id, task_name');

      if (insertError) {
        logger.error('Error creating custom tasks:', insertError);
        // Don't fail completely - continue with tasks that exist
      } else if (insertedTasks) {
        // Add newly created tasks to the map
        insertedTasks.forEach(task => {
          nameToIdMap.set(task.task_name, task.id);
        });
        logger.debug(`✅ Created ${insertedTasks.length} custom tasks successfully`);
      }
    }

    // Convert names to IDs, maintaining order
    const taskIds = taskNames
      .map(name => nameToIdMap.get(name))
      .filter((id): id is string => id !== undefined);

    logger.debug('Converted task names to IDs:', {
      input: taskNames,
      output: taskIds,
      customTasksCreated: missingTasks,
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
  
  // Line items support
  use_line_items?: boolean;
  line_items?: Array<{
    id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    subtotal?: number;
    item_order: number;
  }>;
  cost_entry_mode?: CostEntryMode; // UI preference for this group (quick or detailed)
  
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
  numberOfTyres?: number;
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
  numberOfTyres,
  vendors,
  loadingVendors,
  setVendors
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

  const handleTaskRemove = (taskToRemove: string) => {
    const newTasks = groupData.tasks.filter(t => t !== taskToRemove);
    const updates: any = { 
      ...groupData, 
      tasks: newTasks
    };
    
    // If in detailed mode, update line items based on new tasks
    if (groupData.cost_entry_mode === 'detailed' && groupData.use_line_items) {
      // Keep existing line items - user may have customized them
      if (groupData.line_items && groupData.line_items.length > 0) {
        updates.line_items = groupData.line_items;
      } else if (newTasks.length > 0) {
        // Generate new line items from task names
        updates.line_items = newTasks.map((taskName, index) => ({
          item_name: taskName,
          description: '',
          quantity: 1,
          unit_price: 0,
          item_order: index,
        }));
      }
    }
    
    onChange(updates);
  };
  
  // Handle task selection - auto-populate line items if in detailed mode
  const handleTasksChange = (newTasks: string[]) => {
    const updates: any = {
      ...groupData,
      tasks: newTasks,
    };
    
    // If in detailed mode, auto-populate line items from tasks (use actual task names)
    if (groupData.cost_entry_mode === 'detailed' && groupData.use_line_items) {
      // Only auto-populate if line items are empty or match previous tasks
      const shouldAutoPopulate = !groupData.line_items || groupData.line_items.length === 0;
      
      if (shouldAutoPopulate && newTasks.length > 0) {
        // Use the actual task names as line items
        updates.line_items = newTasks.map((taskName, index) => ({
          item_name: taskName,
          description: '',
          quantity: 1,
          unit_price: 0,
          item_order: index,
        }));
      }
    }
    
    onChange(updates);
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
    <div className="bg-white border border-gray-300 rounded-none sm:rounded-lg overflow-visible">
      {/* Header - Hidden for first service group, shown only for additional ones with Remove button */}
      {canRemove && (
        <div className="bg-gray-50 px-2 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-green-600" />
            Shop/Mechanic {index + 1}
          </h3>
          <button
            type="button"
            onClick={onRemove}
            className="px-2 sm:px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs sm:text-sm font-medium flex items-center gap-1 min-h-[44px] sm:min-h-0"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      )}

      <div className="p-2 sm:p-3">
        {/* Quick Entry Fields - Always Visible */}
        <div className="border-0 sm:border sm:border-gray-200 rounded-none sm:rounded-lg p-1 sm:p-3 bg-white sm:bg-gray-50 mb-2 sm:mb-3">
          <div className="space-y-2 sm:space-y-3">
            {/* Service Type Selector - Button Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What did you do here? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...groupData, serviceType: 'purchase' })}
                  className={`px-3 sm:px-4 py-3 rounded-lg font-medium text-xs sm:text-sm transition-all border-2 min-h-[44px] ${
                    groupData.serviceType === 'purchase'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                      : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  Bought Parts Only
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...groupData, serviceType: 'labor' })}
                  className={`px-3 sm:px-4 py-3 rounded-lg font-medium text-xs sm:text-sm transition-all border-2 min-h-[44px] ${
                    groupData.serviceType === 'labor'
                      ? 'bg-purple-500 text-white border-purple-600 shadow-md'
                      : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  Got Service/Repair Done
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...groupData, serviceType: 'both' })}
                  className={`px-3 sm:px-4 py-3 rounded-lg font-medium text-xs sm:text-sm transition-all border-2 min-h-[44px] ${
                    groupData.serviceType === 'both'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-md'
                      : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  Bought Parts + Got Them Installed
                </button>
              </div>
              {/* Hint text removed per user request - service types are self-explanatory */}
            </div>

            <InlineSearchableDropdown
              label="Shop/Mechanic Name"
              options={vendors.map(v => v.vendor_name)}
              value={groupData.vendor}
              onChange={(val) => onChange({ ...groupData, vendor: val })}
              onAddNew={async (newVendorName) => {
                try {
                  logger.debug('Creating new vendor:', newVendorName);
                  const newVendor = await createVendorFromName(newVendorName);
                  if (newVendor) {
                    // Add to local state
                    setVendors(prev => [...prev, newVendor]);
                    // Set as selected
                    onChange({ ...groupData, vendor: newVendor.vendor_name });
                    logger.debug('Vendor created and saved to database:', newVendor);
                  }
                } catch (error) {
                  logger.error('Error creating vendor:', error);
                  // Still add to local state even if DB save fails
                  setVendors(prev => [...prev, {
                    id: `temp-${Date.now()}`,
                    vendor_name: newVendorName,
                    organization_id: ''
                  }]);
                  onChange({ ...groupData, vendor: newVendorName });
                }
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
                onChange={handleTasksChange}
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

            {/* Cost Entry Section with Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Cost <span className="text-red-500">*</span>
                </label>
                <CostEntryModeToggle
                  value={groupData.cost_entry_mode || 'quick'}
                  onChange={(mode) => {
                    const updates: any = { 
                      ...groupData, 
                      cost_entry_mode: mode,
                      use_line_items: mode === 'detailed'
                    };
                    
                    // Initialize line items if switching to detailed mode
                    if (mode === 'detailed') {
                      // Auto-populate from selected tasks if empty
                      if (!groupData.line_items || groupData.line_items.length === 0) {
                        // Use the actual task names as line items (not extracted parts)
                        const taskNames = groupData.tasks || [];
                        if (taskNames.length > 0) {
                          updates.line_items = taskNames.map((taskName, index) => ({
                            item_name: taskName,
                            description: '',
                            quantity: 1,
                            unit_price: 0,
                            item_order: index,
                          }));
                        } else {
                          updates.line_items = [];
                        }
                      }
                    }
                    
                    // Clear line items if switching to quick mode
                    if (mode === 'quick') {
                      updates.line_items = [];
                    }
                    
                    onChange(updates);
                  }}
                />
              </div>

              {/* Quick Mode - Direct Cost Input */}
              {(!groupData.cost_entry_mode || groupData.cost_entry_mode === 'quick') && (
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
              )}

              {/* Detailed Mode - Grid with Line Items */}
              {groupData.cost_entry_mode === 'detailed' && (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <LineItemsGridEntry
                    items={groupData.line_items || []}
                    onChange={(items) => {
                      const total = calculateLineItemsTotal(items);
                      onChange({ 
                        ...groupData, 
                        line_items: items,
                        cost: total 
                      });
                    }}
                  />
                  {groupData.line_items && groupData.line_items.length > 0 && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 mt-2">
                      Total from line items: <span className="font-semibold">₹{(groupData.cost || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
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
                        numberOfTyres={numberOfTyres}
                        availableLineItems={
                          groupData.line_items?.map(item => item.item_name) || []
                        }
                      />
                    ))}

                    <button
                      type="button"
                      onClick={addPart}
                      className="w-full py-2 sm:py-3 border border-dashed border-gray-300 rounded sm:rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50 flex items-center justify-center gap-1 sm:gap-2 font-medium text-sm sm:text-base"
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
  numberOfTyres,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Fetch vendors from database
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorData = await getVendors();
        setVendors(vendorData);
        logger.debug(`Loaded ${vendorData.length} vendors from database`);
      } catch (error) {
        logger.error('Error fetching vendors:', error);
        setVendors([]);
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
      bills: []
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
        <h3 className="section-title flex items-center gap-2">
          Service Groups 
          {serviceGroups.length > 0 && (
            <span className="text-sm font-normal text-gray-500">- Shop/Mechanic 1</span>
          )}
        </h3>
      </div>

      <div className="space-y-3">
        {serviceGroups.map((group, index) => (
          <ServiceGroup
            key={group.id}
            groupData={group}
            onChange={(updated) => updateServiceGroup(index, updated)}
            onRemove={() => removeServiceGroup(group.id)}
            index={index}
            canRemove={serviceGroups.length > 1}
            vehicleType={vehicleType}
            numberOfTyres={numberOfTyres}
            vendors={vendors}
            loadingVendors={loadingVendors}
            setVendors={setVendors}
          />
        ))}

        <button
            type="button"
            onClick={addServiceGroup}
          className="w-full py-2 sm:py-4 border border-dashed border-gray-300 rounded sm:rounded-xl text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 flex items-center justify-center gap-1 sm:gap-2 font-semibold text-sm sm:text-lg"
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
 * Converts vendor name to vendor UUID by looking up in the database
 */
const convertVendorNameToId = async (vendorName: string): Promise<string> => {
  if (!vendorName) return '';

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.error('[convertVendorNameToId] No user ID found');
      return '';
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.error('[convertVendorNameToId] No organization found');
      return '';
    }

    // Query vendors table to find vendor by name
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .select('id')
      .eq('vendor_name', vendorName)
      .eq('organization_id', organizationId)
      .eq('active', true)
      .single();

    if (error || !data) {
      logger.warn(`[convertVendorNameToId] Could not find vendor ID for name: "${vendorName}"`, error);
      return '';
    }

    logger.debug(`[convertVendorNameToId] Converted vendor name "${vendorName}" to ID: ${data.id}`);
    return data.id;
  } catch (error) {
    logger.error('[convertVendorNameToId] Error:', error);
    return '';
  }
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
    serviceGroups.map(async (group, index) => {
      logger.debug(`[Group ${index}] Input group:`, group);
      logger.debug(`[Group ${index}] Vendor name:`, group.vendor);
      logger.debug(`[Group ${index}] Tasks:`, group.tasks);

      // Convert task names to IDs
      const taskIds = await convertTaskNamesToIds(group.tasks || []);
      logger.debug(`[Group ${index}] Converted task IDs:`, taskIds);

      // Convert vendor name to vendor UUID
      const vendorId = await convertVendorNameToId(group.vendor);
      logger.debug(`[Group ${index}] Converted vendor ID:`, vendorId);

      const converted: any = {
        vendor_id: vendorId, // Now contains vendor UUID
        tasks: taskIds, // Now contains UUIDs
        service_cost: group.cost || 0, // ✅ FIX: Map 'cost' to 'service_cost' for database
        service_type: group.serviceType || '',
        bill_url: group.bill_url || [],
        parts_data: group.parts || [], // ✅ FIX: Map 'parts' to 'parts_data' for database
        use_line_items: group.use_line_items || false, // ✅ Line items flag
        // NOTE: line_items are NOT stored directly in service_tasks table
        // They are handled separately via maintenance_service_line_items table
        // NOTE: File objects (bill_file, etc.) are uploaded separately, only URLs go to DB
        // NOTE: Removed zombie columns: notes, battery_warranty_url, tyre_warranty_url, *_file
      };
      
      // Keep line_items for frontend processing but don't send to DB
      if (group.line_items) {
        converted._line_items = group.line_items; // Use underscore prefix to indicate it's for processing only
      }

      // NOTE: battery_data and tyre_data columns were removed as zombie code
      // Use unified parts_data system instead (tracked via maintenance_parts_catalog)

      logger.debug(`[Group ${index}] FINAL CONVERTED - vendor_id="${converted.vendor_id}"`, converted);

      if (!converted.vendor_id) {
        logger.error(`[Group ${index}] ⚠️ WARNING: vendor_id is EMPTY! Original vendor was:`, group.vendor);
      }

      return converted;
    })
  );

  logger.debug('Service groups converted for database:', convertedGroups);

  return convertedGroups;
};

export default ServiceGroupsSection;
