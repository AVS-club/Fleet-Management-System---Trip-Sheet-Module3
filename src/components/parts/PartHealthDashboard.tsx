import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Activity, AlertTriangle, CheckCircle2, TrendingUp, Tag as TagIcon } from 'lucide-react';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle, Tag } from '@/types';
import { 
  getTagBasedPartsHealthMetrics,
  getVehiclePartHealth,
  getLastFourDigits,
  TagBasedPartHealthMetrics
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
  activeSubTab,
  onSubTabChange
}) => {
  const [selectedPartType, setSelectedPartType] = useState<string>('all');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from vehicles
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, Tag>();
    vehicles.forEach(vehicle => {
      if (vehicle.tags) {
        vehicle.tags.forEach(tag => {
          if (!tagMap.has(tag.id)) {
            tagMap.set(tag.id, tag);
          }
        });
      }
    });
    return Array.from(tagMap.values());
  }, [vehicles]);

  // Get tag-aware metrics
  const tagBasedMetrics = useMemo(() => {
    return getTagBasedPartsHealthMetrics(
      tasks,
      vehicles,
      selectedTags.length > 0 ? selectedTags : undefined
    );
  }, [tasks, vehicles, selectedTags]);

  // Filter vehicles by selected tags
  const filteredVehicles = useMemo(() => {
    if (selectedTags.length === 0) return vehicles;
    
    return vehicles.filter(vehicle => {
      if (!vehicle.tags || vehicle.tags.length === 0) return false;
      return vehicle.tags.some(tag => selectedTags.includes(tag.id));
    });
  }, [vehicles, selectedTags]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const critical = tagBasedMetrics.filter(p => p.status === 'overdue').length;
    const warning = tagBasedMetrics.filter(p => p.status === 'needs_attention').length;
    const good = tagBasedMetrics.filter(p => p.status === 'good').length;
    const upcomingCost = tagBasedMetrics
      .filter(p => p.status !== 'good')
      .reduce((sum, p) => sum + (p.averageCost || 0), 0);

    return { critical, warning, good, upcomingCost };
  }, [tagBasedMetrics]);

  // Get unique part types
  const partTypes = useMemo(() => {
    const types = [...new Set(tagBasedMetrics.map(p => p.partName))];
    return types.sort();
  }, [tagBasedMetrics]);

  return (
    <div className="space-y-6">
      {/* Tag Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <TagIcon className="h-5 w-5 text-gray-400" />
          <label className="text-sm font-medium text-gray-700">Filter by Tags:</label>
          <div className="flex flex-wrap gap-2 flex-1">
            {availableTags.length === 0 ? (
              <span className="text-sm text-gray-500 italic">No tags available</span>
            ) : (
              <>
                <button
                  onClick={() => setSelectedTags([])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedTags.length === 0
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Vehicles
                </button>
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (selectedTags.includes(tag.id)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag.id));
                      } else {
                        setSelectedTags([...selectedTags, tag.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color_hex : undefined
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        {selectedTags.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredVehicles.length} vehicle(s) with selected tag(s)
          </div>
        )}
      </div>

      {/* Parts Filter Dropdown */}
      <div className="flex items-center gap-3">
        <select
          value={selectedPartType}
          onChange={(e) => setSelectedPartType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Parts</option>
          {partTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* Sub-tabs */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => onSubTabChange('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'overview'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onSubTabChange('peer-comparison')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'peer-comparison'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tag-Based Comparison
          </button>
          <button
            onClick={() => onSubTabChange('historical-trends')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'historical-trends'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Historical Trends
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parts Health by Vehicle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Parts Health by Vehicle
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {selectedTags.length > 0 
                    ? 'No vehicles found with selected tags'
                    : 'No vehicles available'
                  }
                </div>
              ) : (
                filteredVehicles.map(vehicle => {
                  const vehicleParts = getVehiclePartHealth(vehicle.id, tasks, vehicles);
                  const criticalParts = vehicleParts.filter(p => p.status === 'overdue').length;
                  const warningParts = vehicleParts.filter(p => p.status === 'needs_attention').length;
                  const isExpanded = expandedVehicle === vehicle.id;
                  const lastFour = getLastFourDigits(vehicle.registration_number);

                  return (
                    <div key={vehicle.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <button
                        onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {vehicle.make} {vehicle.model}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">
                                {lastFour}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mb-2">
                              {vehicle.registration_number}
                            </div>
                            {vehicle.tags && vehicle.tags.length > 0 && (
                              <VehicleTagBadges tags={vehicle.tags} size="sm" maxVisible={3} />
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {criticalParts > 0 && (
                              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                {criticalParts}
                              </span>
                            )}
                            {warningParts > 0 && (
                              <span className="flex items-center gap-1 text-sm text-yellow-600 font-medium">
                                <Activity className="h-4 w-4" />
                                {warningParts}
                              </span>
                            )}
                            {criticalParts === 0 && warningParts === 0 && (
                              <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Good
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && vehicleParts.length > 0 && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
                          {vehicleParts.map((part, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{part.partName}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  part.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  part.status === 'needs_attention' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {part.lifePercentage}% Life
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    part.status === 'overdue' ? 'bg-red-500' :
                                    part.status === 'needs_attention' ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${part.lifePercentage}%` }}
                                />
                              </div>
                              <div className="mt-2 text-xs text-gray-600">
                                {part.kmSinceReplacement.toLocaleString()} km since replacement
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Parts Requiring Attention */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Parts Requiring Attention
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredVehicles.map(vehicle => {
                const vehicleParts = getVehiclePartHealth(vehicle.id, tasks, vehicles);
                const criticalParts = vehicleParts.filter(p => 
                  p.status === 'overdue' || p.status === 'needs_attention'
                );
                
                if (criticalParts.length === 0) return null;
                
                const lastFour = getLastFourDigits(vehicle.registration_number);

                return (
                  <div key={vehicle.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {vehicle.make} {vehicle.model}
                      </span>
                      <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-mono rounded">
                        {lastFour}
                      </span>
                    </div>
                    {vehicle.tags && vehicle.tags.length > 0 && (
                      <div className="mb-2">
                        <VehicleTagBadges tags={vehicle.tags} size="sm" maxVisible={2} />
                      </div>
                    )}
                    <div className="space-y-2">
                      {criticalParts.map((part, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{part.partName}</span>
                          <span className="text-gray-600"> - {part.lifePercentage}% remaining</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartHealthDashboard;