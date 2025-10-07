import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge,
  X
} from 'lucide-react';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle, Tag } from '@/types';
import { 
  getVehiclePartHealth,
  getLastFourDigits
} from '@/utils/partsAnalytics';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';

interface PartHealthDashboardProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  partsMetrics: any[];
  activeSubTab: 'overview' | 'peer-comparison' | 'historical-trends';
  onSubTabChange: (tab: 'overview' | 'peer-comparison' | 'historical-trends') => void;
}

const PartHealthDashboard: React.FC<PartHealthDashboardProps> = ({
  tasks,
  vehicles,
  partsMetrics,
}) => {
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [showPartFilter, setShowPartFilter] = useState(false);
  const [selectedPartType, setSelectedPartType] = useState<string>('all');

  // Get unique part types
  const partTypes = useMemo(() => {
    const types = new Set<string>();
    vehicles.forEach(vehicle => {
      const vehicleParts = getVehiclePartHealth(vehicle.id, tasks, vehicles);
      vehicleParts.forEach(part => types.add(part.partName));
    });
    return Array.from(types).sort();
  }, [vehicles, tasks]);

  // Filter vehicles with parts requiring attention
  const vehiclesNeedingAttention = useMemo(() => {
    return vehicles.filter(vehicle => {
      const vehicleParts = getVehiclePartHealth(vehicle.id, tasks, vehicles);
      return vehicleParts.some(p => p.status === 'overdue' || p.status === 'needs_attention');
    }).slice(0, 5); // Show top 5
  }, [vehicles, tasks]);

  return (
    <div className="space-y-4">
      {/* Part Type Filter - Collapsible */}
      {partTypes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setShowPartFilter(!showPartFilter)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {selectedPartType === 'all' ? 'All Parts' : selectedPartType}
                </div>
                <div className="text-xs text-gray-500">Tap to filter</div>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
              showPartFilter ? 'rotate-180' : ''
            }`} />
          </button>

          {showPartFilter && (
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSelectedPartType('all');
                    setShowPartFilter(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPartType === 'all'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All Parts
                </button>
                {partTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedPartType(type);
                      setShowPartFilter(false);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                      selectedPartType === type
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Critical Parts Alert - Mobile Optimized */}
      {vehiclesNeedingAttention.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 shadow-sm p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-red-900 mb-1">
                Immediate Attention Required
              </h3>
              <p className="text-xs text-red-700">
                {vehiclesNeedingAttention.length} vehicle(s) need maintenance
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {vehiclesNeedingAttention.map(vehicle => {
              const vehicleParts = getVehiclePartHealth(vehicle.id, tasks, vehicles);
              const criticalParts = vehicleParts.filter(p => 
                p.status === 'overdue' || p.status === 'needs_attention'
              );
              const lastFour = getLastFourDigits(vehicle.registration_number);

              return (
                <div 
                  key={vehicle.id}
                  className="bg-white rounded-lg p-3 border border-red-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {vehicle.make} {vehicle.model}
                        </span>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-mono rounded">
                          {lastFour}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {vehicle.registration_number}
                      </div>
                    </div>
                    <span className="flex-shrink-0 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                      {criticalParts.length}
                    </span>
                  </div>

                  {vehicle.tags && vehicle.tags.length > 0 && (
                    <div className="mb-2">
                      <VehicleTagBadges tags={vehicle.tags} size="sm" maxVisible={2} />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {criticalParts.slice(0, 3).map((part, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1">
                          {part.partName}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded font-medium ${
                            part.status === 'overdue' 
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {part.lifePercentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                    {criticalParts.length > 3 && (
                      <div className="text-xs text-gray-500 text-center pt-1">
                        +{criticalParts.length - 3} more parts
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Vehicles List - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Fleet Health Overview
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {vehicles.length} vehicle(s) · Tap to expand details
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {vehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No vehicles available</p>
            </div>
          ) : (
            vehicles.map(vehicle => {
              const vehicleParts = getVehiclePartHealth(vehicle.id, tasks, vehicles);
              const criticalCount = vehicleParts.filter(p => p.status === 'overdue').length;
              const warningCount = vehicleParts.filter(p => p.status === 'needs_attention').length;
              const goodCount = vehicleParts.filter(p => p.status === 'good').length;
              const isExpanded = expandedVehicle === vehicle.id;
              const lastFour = getLastFourDigits(vehicle.registration_number);

              // Filter parts if needed
              const filteredParts = selectedPartType === 'all' 
                ? vehicleParts 
                : vehicleParts.filter(p => p.partName === selectedPartType);

              return (
                <div key={vehicle.id} className="bg-white">
                  {/* Vehicle Header - Touch Friendly */}
                  <button
                    onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
                    className="w-full p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Indicator */}
                      <div className={`flex-shrink-0 w-1 h-12 rounded-full ${
                        criticalCount > 0 ? 'bg-red-500' :
                        warningCount > 0 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />

                      {/* Vehicle Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">
                            {vehicle.make} {vehicle.model}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-mono rounded">
                            {lastFour}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-2 truncate">
                          {vehicle.registration_number}
                        </div>

                        {vehicle.tags && vehicle.tags.length > 0 && (
                          <div className="mb-2">
                            <VehicleTagBadges tags={vehicle.tags} size="sm" maxVisible={3} />
                          </div>
                        )}

                        {/* Status Pills */}
                        <div className="flex gap-2 flex-wrap">
                          {criticalCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                              <AlertTriangle className="h-3 w-3" />
                              {criticalCount} Critical
                            </span>
                          )}
                          {warningCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                              <Activity className="h-3 w-3" />
                              {warningCount} Warning
                            </span>
                          )}
                          {goodCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                              <CheckCircle2 className="h-3 w-3" />
                              {goodCount} Good
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Parts Details */}
                  {isExpanded && filteredParts.length > 0 && (
                    <div className="px-4 pb-4 space-y-2 bg-gray-50">
                      {filteredParts.map((part, idx) => (
                        <div 
                          key={idx}
                          className={`bg-white rounded-lg p-3 border-2 ${
                            part.status === 'overdue' ? 'border-red-300 bg-red-50/50' :
                            part.status === 'needs_attention' ? 'border-yellow-300 bg-yellow-50/50' :
                            'border-green-300 bg-green-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {part.partName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {part.kmSinceReplacement.toLocaleString()} km used
                              </div>
                            </div>
                            <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold ${
                              part.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              part.status === 'needs_attention' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {part.lifePercentage}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                                part.status === 'overdue' ? 'bg-red-500' :
                                part.status === 'needs_attention' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${part.lifePercentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && filteredParts.length === 0 && (
                    <div className="px-4 pb-4 text-center text-sm text-gray-500">
                      No parts data available
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PartHealthDashboard;