import React, { useState, useMemo } from 'react';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { PartHealthMetrics } from '@/utils/partsAnalytics';
import { 
  AlertTriangle,
  CheckCircle,
  Activity,
  Gauge,
  Info,
  Calendar,
  DollarSign,
  Wrench,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface PartHealthDashboardProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  partsMetrics: PartHealthMetrics[];
}

const PartHealthDashboard: React.FC<PartHealthDashboardProps> = ({
  tasks,
  vehicles,
  partsMetrics
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'light' | 'medium' | 'heavy' | 'all'>('all');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  
  // Calculate GVW categories
  const categorizeByGVW = (vehicle: Vehicle) => {
    const gvw = vehicle.gvw || 0;
    if (gvw < 5000) return 'light';
    if (gvw < 10000) return 'medium';
    return 'heavy';
  };
  
  // ENHANCED: Get all parts - uses BOTH partsMetrics AND extracts from tasks
  const getAllReplacedParts = useMemo(() => {
    const replacedParts: Array<{
      vehicleId: string;
      vehicleReg: string;
      partName: string;
      category: string;
      replacementDate: string;
      kmAtReplacement: number;
      cost: number;
      vendor?: string;
      status: 'good' | 'needs_attention' | 'overdue';
      kmSinceReplacement: number;
      expectedLife: number;
    }> = [];

    // FIRST: Use existing partsMetrics if available
    if (partsMetrics && partsMetrics.length > 0) {
      partsMetrics.forEach(metric => {
        const vehicle = vehicles.find(v => v.id === metric.vehicleId);
        if (vehicle) {
          replacedParts.push({
            vehicleId: metric.vehicleId,
            vehicleReg: vehicle.registrationNumber,
            partName: metric.partName,
            category: metric.category,
            replacementDate: metric.lastReplacementDate || new Date().toISOString(),
            kmAtReplacement: metric.lastReplacementKm || 0,
            cost: metric.estimatedCost || 0,
            vendor: metric.lastVendor,
            status: metric.status,
            kmSinceReplacement: metric.kmSinceReplacement || 0,
            expectedLife: metric.expectedLife || 50000
          });
        }
      });
    }

    // SECOND: Extract from maintenance tasks (broader detection)
    vehicles.forEach(vehicle => {
      const vehicleTasks = tasks.filter(t => t.vehicle_id === vehicle.id);
      
      vehicleTasks.forEach(task => {
        if (task.service_groups && Array.isArray(task.service_groups)) {
          task.service_groups.forEach(group => {
            if (group.services && Array.isArray(group.services)) {
              group.services.forEach(service => {
                // ENHANCED: Much broader keyword list
                const partKeywords = [
                  'tyre', 'tire', 'battery', 'brake', 'clutch', 'filter', 'oil',
                  'leaf spring', 'shock', 'alternator', 'radiator', 'belt', 'chain',
                  'pad', 'disc', 'drum', 'fluid', 'coolant', 'transmission',
                  'gearbox', 'suspension', 'steering', 'bearing', 'bushing',
                  'hose', 'pump', 'injector', 'spark plug', 'wiper', 'bulb',
                  'replace', 'replacement', 'change', 'new'
                ];
                
                const serviceName = service.name?.toLowerCase() || '';
                const groupName = group.group_name?.toLowerCase() || '';
                
                // Check if service or group name contains part keywords
                const isPartReplacement = partKeywords.some(keyword => 
                  serviceName.includes(keyword) || groupName.includes(keyword)
                );
                
                // Also check if task description suggests replacement
                const taskDescription = task.description?.toLowerCase() || '';
                const hasReplacementContext = taskDescription.includes('replace') || 
                                             taskDescription.includes('change') ||
                                             taskDescription.includes('new');
                
                if (isPartReplacement || hasReplacementContext) {
                  const currentKm = vehicle.current_odometer || 0;
                  const taskKm = task.odometer_reading || 0;
                  const kmSince = Math.max(0, currentKm - taskKm);
                  
                  // Estimate expected life based on part type
                  let expectedLife = 50000; // default
                  if (serviceName.includes('tyre') || serviceName.includes('tire')) expectedLife = 60000;
                  if (serviceName.includes('battery')) expectedLife = 80000;
                  if (serviceName.includes('brake')) expectedLife = 40000;
                  if (serviceName.includes('clutch')) expectedLife = 80000;
                  if (serviceName.includes('filter')) expectedLife = 20000;
                  if (serviceName.includes('oil')) expectedLife = 10000;
                  if (serviceName.includes('suspension') || serviceName.includes('leaf')) expectedLife = 100000;
                  
                  // Determine status
                  let status: 'good' | 'needs_attention' | 'overdue' = 'good';
                  const lifePercentage = (kmSince / expectedLife) * 100;
                  if (lifePercentage >= 100) status = 'overdue';
                  else if (lifePercentage >= 80) status = 'needs_attention';
                  
                  // Check if this part already exists (avoid duplicates)
                  const exists = replacedParts.some(p => 
                    p.vehicleId === vehicle.id && 
                    p.partName === (service.name || 'Unknown Part')
                  );
                  
                  if (!exists) {
                    replacedParts.push({
                      vehicleId: vehicle.id,
                      vehicleReg: vehicle.registrationNumber,
                      partName: service.name || group.group_name || 'Unknown Part',
                      category: group.group_name || 'General Maintenance',
                      replacementDate: task.task_date,
                      kmAtReplacement: taskKm,
                      cost: service.service_cost || group.total_cost || 0,
                      vendor: task.vendor_name,
                      status,
                      kmSinceReplacement: kmSince,
                      expectedLife
                    });
                  }
                }
              });
            }
          });
        }
      });
    });

    return replacedParts;
  }, [tasks, vehicles, partsMetrics]);
  
  // Group vehicles by GVW category with stats
  const categoryStats = useMemo(() => {
    const stats = {
      light: { count: 0, totalParts: 0, criticalParts: 0 },
      medium: { count: 0, totalParts: 0, criticalParts: 0 },
      heavy: { count: 0, totalParts: 0, criticalParts: 0 },
    };
    
    vehicles.forEach(vehicle => {
      const category = categorizeByGVW(vehicle);
      stats[category].count++;
      
      const vehicleParts = getAllReplacedParts.filter(p => p.vehicleId === vehicle.id);
      stats[category].totalParts += vehicleParts.length;
      stats[category].criticalParts += vehicleParts.filter(
        p => p.status === 'overdue' || p.status === 'needs_attention'
      ).length;
    });
    
    return stats;
  }, [vehicles, getAllReplacedParts]);
  
  // Filter vehicles based on selected category
  const filteredVehicles = useMemo(() => {
    if (selectedCategory === 'all') return vehicles;
    return vehicles.filter(v => categorizeByGVW(v) === selectedCategory);
  }, [vehicles, selectedCategory]);
  
  // Get parts for a specific vehicle
  const getVehicleParts = (vehicleId: string) => {
    return getAllReplacedParts.filter(p => p.vehicleId === vehicleId);
  };
  
  return (
    <div className="space-y-6">
      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* All Categories Card */}
        <div
          onClick={() => setSelectedCategory('all')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
            selectedCategory === 'all'
              ? 'border-primary-500 bg-primary-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">All Categories</h3>
            <Activity className="h-5 w-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Vehicles</p>
        </div>

        {/* Light Category Card */}
        <div
          onClick={() => setSelectedCategory('light')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
            selectedCategory === 'light'
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-700">Light (&lt; 5T)</h3>
            <div className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              {categoryStats.light.count}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{categoryStats.light.totalParts}</p>
          <p className="text-xs text-gray-500 mt-1">
            {categoryStats.light.criticalParts} need attention
          </p>
        </div>

        {/* Medium Category Card */}
        <div
          onClick={() => setSelectedCategory('medium')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
            selectedCategory === 'medium'
              ? 'border-yellow-500 bg-yellow-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-yellow-700">Medium (5-10T)</h3>
            <div className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
              {categoryStats.medium.count}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{categoryStats.medium.totalParts}</p>
          <p className="text-xs text-gray-500 mt-1">
            {categoryStats.medium.criticalParts} need attention
          </p>
        </div>

        {/* Heavy Category Card */}
        <div
          onClick={() => setSelectedCategory('heavy')}
          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
            selectedCategory === 'heavy'
              ? 'border-orange-500 bg-orange-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-700">Heavy (&gt; 10T)</h3>
            <div className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
              {categoryStats.heavy.count}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{categoryStats.heavy.totalParts}</p>
          <p className="text-xs text-gray-500 mt-1">
            {categoryStats.heavy.criticalParts} need attention
          </p>
        </div>
      </div>

      {/* DEBUG INFO - Remove after testing */}
      {getAllReplacedParts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">No Parts Data Found</p>
              <p className="text-xs text-yellow-700 mt-1">
                Total vehicles: {vehicles.length} | Total tasks: {tasks.length}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                This usually means maintenance tasks don't have part replacement records yet. 
                Add maintenance tasks with services like "Tyre Replacement", "Battery Change", etc.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Parts Health Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Vehicle Parts Health
            {selectedCategory !== 'all' && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredVehicles.length} vehicles)
              </span>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredVehicles.map(vehicle => {
            const vehicleParts = getVehicleParts(vehicle.id);
            const category = categorizeByGVW(vehicle);
            const isExpanded = expandedVehicle === vehicle.id;
            
            // Calculate summary stats
            const totalParts = vehicleParts.length;
            const criticalParts = vehicleParts.filter(p => p.status === 'overdue').length;
            const warningParts = vehicleParts.filter(p => p.status === 'needs_attention').length;
            const healthyParts = vehicleParts.filter(p => p.status === 'good').length;
            
            return (
              <div key={vehicle.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Vehicle Header - Always Visible */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          {vehicle.registrationNumber}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          category === 'light' 
                            ? 'bg-blue-100 text-blue-700'
                            : category === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {category.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-gray-500">
                          {vehicle.type}
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-500">
                          {vehicle.current_odometer?.toLocaleString()} km
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-500">
                          GVW: {vehicle.gvw ? `${(vehicle.gvw / 1000).toFixed(1)}T` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex items-center gap-4">
                      {criticalParts > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{criticalParts}</span>
                        </div>
                      )}
                      {warningParts > 0 && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Activity className="h-4 w-4" />
                          <span className="text-sm font-medium">{warningParts}</span>
                        </div>
                      )}
                      {healthyParts > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{healthyParts}</span>
                        </div>
                      )}
                      <span className="text-sm text-gray-500">
                        ({totalParts} parts)
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Parts Detail */}
                {isExpanded && vehicleParts.length > 0 && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {vehicleParts.map((part, index) => {
                        const lifePercentage = Math.min(
                          (part.kmSinceReplacement / part.expectedLife) * 100,
                          100
                        );
                        const remainingKm = Math.max(0, part.expectedLife - part.kmSinceReplacement);
                        
                        return (
                          <div 
                            key={`${part.vehicleId}-${part.partName}-${index}`}
                            className={`p-3 rounded-lg border-2 bg-white ${
                              part.status === 'overdue'
                                ? 'border-red-300'
                                : part.status === 'needs_attention'
                                ? 'border-yellow-300'
                                : 'border-green-300'
                            }`}
                          >
                            {/* Part Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {part.partName}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {part.category}
                                </p>
                              </div>
                              {part.status === 'overdue' && (
                                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 ml-2" />
                              )}
                              {part.status === 'needs_attention' && (
                                <Activity className="h-4 w-4 text-yellow-600 flex-shrink-0 ml-2" />
                              )}
                              {part.status === 'good' && (
                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                              )}
                            </div>

                            {/* Part Stats */}
                            <div className="space-y-2 text-xs text-gray-600">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Gauge className="h-3 w-3" />
                                  Since Replacement
                                </span>
                                <span className="font-medium">{part.kmSinceReplacement.toLocaleString()} km</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Installed
                                </span>
                                <span className="font-medium">
                                  {new Date(part.replacementDate).toLocaleDateString('en-IN', {
                                    year: '2-digit',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                              {part.vendor && (
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    Vendor
                                  </span>
                                  <span className="font-medium truncate ml-2">{part.vendor}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Cost
                                </span>
                                <span className="font-medium">₹{part.cost.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Health</span>
                                <span className={`font-medium ${
                                  part.status === 'overdue'
                                    ? 'text-red-700'
                                    : part.status === 'needs_attention'
                                    ? 'text-yellow-700'
                                    : 'text-green-700'
                                }`}>
                                  {Math.round(100 - lifePercentage)}%
                                </span>
                              </div>
                              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    part.status === 'overdue'
                                      ? 'bg-red-600'
                                      : part.status === 'needs_attention'
                                      ? 'bg-yellow-600'
                                      : 'bg-green-600'
                                  }`}
                                  style={{ width: `${lifePercentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {remainingKm > 0 
                                  ? `${remainingKm.toLocaleString()} km remaining`
                                  : 'Replacement overdue'
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Parts Message */}
                {isExpanded && vehicleParts.length === 0 && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50 text-center">
                    <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No part replacement history found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Parts will appear here once maintenance tasks with part replacements are recorded
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredVehicles.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Vehicles Found</h3>
            <p className="text-gray-500">
              No vehicles in the {selectedCategory} category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartHealthDashboard;