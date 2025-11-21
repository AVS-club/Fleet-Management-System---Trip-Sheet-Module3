import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Package, AlertCircle, Wrench, CircleDot } from 'lucide-react';
import { getVendors, createVendor } from '@/utils/vendorStorage';
import { Vendor } from '@/types/vendor';
import { createLogger } from '@/utils/logger';
import { toast } from 'react-toastify';

const logger = createLogger('ServiceGroupsSection');

interface ServiceTask {
  id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface ServiceGroup {
  id: string;
  vendor_id: string;
  tasks: ServiceTask[];
  total_cost: number;
}

interface ServiceGroupsSectionProps {
  serviceGroups: ServiceGroup[];
  onChange: (groups: ServiceGroup[]) => void;
  vehicleType?: string;
  numberOfTyres?: number;
}

// Export function to convert service groups to database format
export const convertServiceGroupsToDatabase = async (serviceGroups: ServiceGroup[]): Promise<ServiceGroup[]> => {
  // This function converts service groups to the format expected by the database
  // Currently just returns the groups as-is since they're already in the right format
  return serviceGroups.map(group => ({
    ...group,
    // Ensure vendor_id is set
    vendor_id: group.vendor_id || '',
    // Ensure tasks array exists
    tasks: (group.tasks || []).map(task => ({
      ...task,
      // Ensure all task fields are present
      id: task.id || crypto.randomUUID(),
      description: task.description || '',
      quantity: task.quantity || 1,
      unit_cost: task.unit_cost || 0,
      total_cost: task.total_cost || (task.quantity || 1) * (task.unit_cost || 0)
    })),
    // Recalculate total cost
    total_cost: group.total_cost || (group.tasks || []).reduce((sum, task) => sum + (task.total_cost || 0), 0)
  }));
};

// Common service templates based on vehicle type and tire count
const getServiceTemplates = (vehicleType?: string, numberOfTyres?: number) => {
  const templates: { [key: string]: ServiceTask[] } = {
    general: [
      { id: '1', description: 'Engine Oil Change', quantity: 1, unit_cost: 2000, total_cost: 2000 },
      { id: '2', description: 'Oil Filter Replacement', quantity: 1, unit_cost: 500, total_cost: 500 },
      { id: '3', description: 'Air Filter Cleaning/Replacement', quantity: 1, unit_cost: 800, total_cost: 800 },
      { id: '4', description: 'Coolant Top-up/Replacement', quantity: 1, unit_cost: 1200, total_cost: 1200 },
    ],
    tyres: [
      { 
        id: 't1', 
        description: 'Tyre Rotation/Alignment', 
        quantity: numberOfTyres || 4, 
        unit_cost: 200, 
        total_cost: (numberOfTyres || 4) * 200 
      },
      { 
        id: 't2', 
        description: 'Tyre Pressure Check & Inflation', 
        quantity: numberOfTyres || 4, 
        unit_cost: 50, 
        total_cost: (numberOfTyres || 4) * 50 
      },
      { 
        id: 't3', 
        description: 'Tyre Replacement', 
        quantity: 1, 
        unit_cost: 8000, 
        total_cost: 8000 
      },
      { 
        id: 't4', 
        description: 'Wheel Balancing', 
        quantity: numberOfTyres || 4, 
        unit_cost: 150, 
        total_cost: (numberOfTyres || 4) * 150 
      },
    ],
    brakes: [
      { id: 'b1', description: 'Brake Pad Inspection/Replacement', quantity: 4, unit_cost: 1500, total_cost: 6000 },
      { id: 'b2', description: 'Brake Fluid Check/Top-up', quantity: 1, unit_cost: 800, total_cost: 800 },
      { id: 'b3', description: 'Brake Line Inspection', quantity: 1, unit_cost: 500, total_cost: 500 },
    ],
    electrical: [
      { id: 'e1', description: 'Battery Check/Replacement', quantity: 1, unit_cost: 5000, total_cost: 5000 },
      { id: 'e2', description: 'Alternator Inspection', quantity: 1, unit_cost: 1000, total_cost: 1000 },
      { id: 'e3', description: 'Starter Motor Check', quantity: 1, unit_cost: 1200, total_cost: 1200 },
      { id: 'e4', description: 'Lights & Indicators Check', quantity: 1, unit_cost: 500, total_cost: 500 },
    ],
  };

  // Adjust templates based on vehicle type
  if (vehicleType === 'truck' || vehicleType === 'trailer') {
    templates.heavy = [
      { id: 'h1', description: 'Differential Oil Change', quantity: 1, unit_cost: 3000, total_cost: 3000 },
      { id: 'h2', description: 'Transmission Fluid Check', quantity: 1, unit_cost: 2500, total_cost: 2500 },
      { id: 'h3', description: 'Clutch Adjustment/Replacement', quantity: 1, unit_cost: 8000, total_cost: 8000 },
      { id: 'h4', description: 'Suspension Check', quantity: 1, unit_cost: 2000, total_cost: 2000 },
    ];
  }

  return templates;
};

const ServiceGroupsSection: React.FC<ServiceGroupsSectionProps> = ({
  serviceGroups,
  onChange,
  vehicleType,
  numberOfTyres
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState<{ [groupId: string]: boolean }>({});

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const vendorList = await getVendors();
      setVendors(vendorList);
    } catch (error) {
      logger.error('Error loading vendors:', error);
      toast.error('Failed to load vendors');
    }
  };

  const addServiceGroup = () => {
    const newGroup: ServiceGroup = {
      id: `group_${Date.now()}`,
      vendor_id: '',
      tasks: [],
      total_cost: 0
    };
    onChange([...serviceGroups, newGroup]);
    setExpandedGroups(new Set([...expandedGroups, newGroup.id]));
  };

  const removeServiceGroup = (groupId: string) => {
    onChange(serviceGroups.filter(g => g.id !== groupId));
  };

  const updateServiceGroup = (groupId: string, updates: Partial<ServiceGroup>) => {
    onChange(serviceGroups.map(g => 
      g.id === groupId ? { ...g, ...updates } : g
    ));
  };

  const addTaskToGroup = (groupId: string, task?: ServiceTask) => {
    const group = serviceGroups.find(g => g.id === groupId);
    if (!group) return;

    const newTask: ServiceTask = task || {
      id: `task_${Date.now()}`,
      description: '',
      quantity: 1,
      unit_cost: 0,
      total_cost: 0
    };

    const updatedTasks = [...group.tasks, newTask];
    const totalCost = updatedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    
    updateServiceGroup(groupId, { tasks: updatedTasks, total_cost: totalCost });
  };

  const updateTask = (groupId: string, taskId: string, updates: Partial<ServiceTask>) => {
    const group = serviceGroups.find(g => g.id === groupId);
    if (!group) return;

    const updatedTasks = group.tasks.map(t => {
      if (t.id === taskId) {
        const quantity = updates.quantity ?? t.quantity ?? 1;
        const unit_cost = updates.unit_cost ?? t.unit_cost ?? 0;
        const total_cost = quantity * unit_cost;
        return { ...t, ...updates, total_cost };
      }
      return t;
    });

    const totalCost = updatedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    updateServiceGroup(groupId, { tasks: updatedTasks, total_cost: totalCost });
  };

  const removeTask = (groupId: string, taskId: string) => {
    const group = serviceGroups.find(g => g.id === groupId);
    if (!group) return;

    const updatedTasks = group.tasks.filter(t => t.id !== taskId);
    const totalCost = updatedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    
    updateServiceGroup(groupId, { tasks: updatedTasks, total_cost: totalCost });
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const applyTemplate = (groupId: string, templateKey: string) => {
    const templates = getServiceTemplates(vehicleType, numberOfTyres);
    const templateTasks = templates[templateKey] || [];
    
    templateTasks.forEach(task => {
      addTaskToGroup(groupId, { ...task, id: `task_${Date.now()}_${Math.random()}` });
    });
    
    setShowTemplates({ ...showTemplates, [groupId]: false });
  };

  const totalMaintenanceCost = serviceGroups.reduce((sum, g) => sum + (g.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-600" />
          Service Groups
          {numberOfTyres && (
            <span className="text-sm font-normal text-gray-600 flex items-center gap-1">
              <CircleDot className="h-4 w-4" />
              Vehicle has {numberOfTyres} tyres
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={addServiceGroup}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Service Group
        </button>
      </div>

      {serviceGroups.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-3">No service groups added yet</p>
          <button
            type="button"
            onClick={addServiceGroup}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first service group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {serviceGroups.map((group, index) => (
            <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleGroupExpansion(group.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedGroups.has(group.id) ? 
                      <ChevronUp className="h-5 w-5" /> : 
                      <ChevronDown className="h-5 w-5" />
                    }
                  </button>
                  
                  <span className="font-medium text-gray-900">Group {index + 1}</span>
                  
                  <select
                    value={group.vendor_id}
                    onChange={(e) => updateServiceGroup(group.id, { vendor_id: e.target.value })}
                    className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                  
                  <span className="text-sm font-medium text-gray-700">
                    Total: ₹{(group.total_cost || 0).toLocaleString()}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeServiceGroup(group.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {expandedGroups.has(group.id) && (
                <div className="p-4 space-y-3">
                  {/* Quick Templates */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">Quick add:</span>
                    <button
                      type="button"
                      onClick={() => setShowTemplates({ ...showTemplates, [group.id]: !showTemplates[group.id] })}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Service Templates
                    </button>
                  </div>

                  {showTemplates[group.id] && (
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Select template to add common services:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyTemplate(group.id, 'general')}
                          className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg"
                        >
                          General Service
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(group.id, 'tyres')}
                          className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg flex items-center gap-1"
                        >
                          <CircleDot className="h-3 w-3" />
                          Tyre Services ({numberOfTyres || 4} tyres)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(group.id, 'brakes')}
                          className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg"
                        >
                          Brake Service
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTemplate(group.id, 'electrical')}
                          className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg"
                        >
                          Electrical
                        </button>
                        {(vehicleType === 'truck' || vehicleType === 'trailer') && (
                          <button
                            type="button"
                            onClick={() => applyTemplate(group.id, 'heavy')}
                            className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg"
                          >
                            Heavy Vehicle
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Task List */}
                  <div className="space-y-2">
                    {group.tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No tasks added. Use templates or add manually.
                      </p>
                    ) : (
                      group.tasks.map((task, taskIndex) => (
                        <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600 w-8">{taskIndex + 1}.</span>
                          
                          <input
                            type="text"
                            value={task.description}
                            onChange={(e) => updateTask(group.id, task.id, { description: e.target.value })}
                            placeholder="Service description"
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                            required
                          />
                          
                          <input
                            type="number"
                            value={task.quantity}
                            onChange={(e) => updateTask(group.id, task.id, { quantity: parseInt(e.target.value) || 0 })}
                            placeholder="Qty"
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                            min="1"
                            required
                          />
                          
                          <input
                            type="number"
                            value={task.unit_cost}
                            onChange={(e) => updateTask(group.id, task.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                            placeholder="Unit cost"
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                            min="0"
                            step="0.01"
                            required
                          />
                          
                          <span className="text-sm font-medium text-gray-700 w-20 text-right">
                            ₹{(task.total_cost || 0).toLocaleString()}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => removeTask(group.id, task.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addTaskToGroup(group.id)}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="h-4 w-4 inline mr-1" />
                    Add Task
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total Summary */}
      {serviceGroups.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Total Maintenance Cost:</span>
          </div>
          <span className="text-xl font-bold text-blue-600">
            ₹{(totalMaintenanceCost || 0).toLocaleString()}
          </span>
        </div>
      )}

      {/* Tyre Information Alert */}
      {numberOfTyres && numberOfTyres > 6 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Heavy Vehicle Detected</p>
            <p>This vehicle has {numberOfTyres} tyres. Consider adding tyre-specific maintenance tasks for proper tracking.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceGroupsSection;