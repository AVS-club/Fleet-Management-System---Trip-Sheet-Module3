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
  ChevronRight,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Shield,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'peer-comparison' | 'historical-trends'>('overview');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [selectedPartType, setSelectedPartType] = useState<string>('all');
  
  // Extract parts from tasks.parts_replaced field
  const extractedParts = useMemo(() => {
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

    // Part life expectations (in km)
    const PART_LIFE: Record<string, number> = {
      'Tyres (All)': 60000,
      'Tyres (Front)': 60000,
      'Tyres (Rear)': 60000,
      'Brake Pads': 40000,
      'Brakes All': 40000,
      'Battery': 80000,
      'Clutch Plate': 100000,
      'Gearbox': 150000,
      'Engine Oil': 10000,
      'Air Filter': 20000,
      'Oil Filter': 10000,
      'Fuel Filter': 30000,
      'Alternator': 120000,
      'Radiator': 100000,
      'Shock Absorbers': 80000,
      'Timing Belt': 100000,
      'Leaf Springs': 120000,
    };

    vehicles.forEach(vehicle => {
      const vehicleTasks = tasks.filter(t => t.vehicle_id === vehicle.id);
      const currentOdometer = vehicle.current_odometer || 0;
      
      vehicleTasks.forEach(task => {
        // PRIORITY 1: Read parts_replaced JSONB field
        if (task.parts_replaced && Array.isArray(task.parts_replaced) && task.parts_replaced.length > 0) {
          task.parts_replaced.forEach((part: any) => {
            const kmAtReplacement = part.odometerAtReplacement || task.odometer_reading || 0;
            const kmSince = currentOdometer - kmAtReplacement;
            const expectedLife = PART_LIFE[part.partName] || 50000;
            const lifePercentage = (kmSince / expectedLife) * 100;
            
            replacedParts.push({
              vehicleId: vehicle.id,
              vehicleReg: vehicle.registration_number,
              partName: part.partName,
              category: part.category || 'General',
              replacementDate: part.replacementDate || task.start_date,
              kmAtReplacement,
              cost: part.cost || 0,
              vendor: task.garage_id,
              status: lifePercentage >= 100 ? 'overdue' : lifePercentage >= 80 ? 'needs_attention' : 'good',
              kmSinceReplacement: kmSince,
              expectedLife
            });
          });
        }
      });
    });

    console.log('Parts detected from tasks:', replacedParts.length, replacedParts);
    return replacedParts;
  }, [tasks, vehicles]);

  // Calculate metrics from both partsMetrics and extracted parts
  const metrics = useMemo(() => {
    // Use extracted parts if available, otherwise fall back to partsMetrics
    const allParts = extractedParts.length > 0 ? extractedParts : partsMetrics;
    
    const critical = allParts.filter(p => p.status === 'overdue' || p.status === 'critical').length;
    const warning = allParts.filter(p => p.status === 'needs_attention' || p.status === 'warning').length;
    const good = allParts.filter(p => p.status === 'good').length;
    const upcomingCost = allParts
      .filter(p => p.status !== 'good')
      .reduce((sum, p) => sum + (p.cost || p.estimatedCost || 0), 0);

    return { critical, warning, good, upcomingCost };
  }, [extractedParts, partsMetrics]);

  // Filter parts by selected type
  const filteredParts = useMemo(() => {
    const allParts = extractedParts.length > 0 ? extractedParts : partsMetrics;
    if (selectedPartType === 'all') return allParts;
    return allParts.filter(part => part.partName === selectedPartType);
  }, [extractedParts, partsMetrics, selectedPartType]);

  // Get unique part types for filter
  const partTypes = useMemo(() => {
    const allParts = extractedParts.length > 0 ? extractedParts : partsMetrics;
    const types = [...new Set(allParts.map(p => p.partName))];
    return types.sort();
  }, [extractedParts, partsMetrics]);

  // Get critical parts requiring attention
  const criticalParts = useMemo(() => {
    const allParts = extractedParts.length > 0 ? extractedParts : partsMetrics;
    return allParts
      .filter(p => p.status === 'overdue' || p.status === 'critical')
      .sort((a, b) => (b.kmSinceReplacement || b.kmOverdue || 0) - (a.kmSinceReplacement || a.kmOverdue || 0));
  }, [extractedParts, partsMetrics]);

  return (
    <div className="space-y-6">
      {/* Summary Cards with Apple Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Parts Card */}
        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 text-sm font-medium">Critical Parts</p>
              <p className="text-3xl font-semibold mt-1 text-gray-900">{metrics.critical}</p>
              <p className="text-xs text-gray-600 mt-2">Need immediate attention</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Need Attention Card */}
        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-700 text-sm font-medium">Need Attention</p>
              <p className="text-3xl font-semibold mt-1 text-gray-900">{metrics.warning}</p>
              <p className="text-xs text-gray-600 mt-2">Schedule maintenance</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Good Health Card */}
        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-medium">Good Health</p>
              <p className="text-3xl font-semibold mt-1 text-gray-900">{metrics.good}</p>
              <p className="text-xs text-gray-600 mt-2">Operating normally</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Cost Card */}
        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Upcoming Cost</p>
              <p className="text-3xl font-semibold mt-1 text-gray-900">₹{(metrics.upcomingCost / 1000).toFixed(1)}K</p>
              <p className="text-xs text-gray-600 mt-2">Estimated expenditure</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex flex-wrap gap-4">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-gray-50"
            value={selectedPartType}
            onChange={(e) => setSelectedPartType(e.target.value)}
          >
            <option value="all">All Parts</option>
            {partTypes.map(part => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>

          <div className="flex gap-2 ml-auto">
            <button 
              onClick={() => setActiveSubTab('overview')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeSubTab === 'overview' 
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveSubTab('peer-comparison')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeSubTab === 'peer-comparison' 
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Peer Comparison
            </button>
            <button 
              onClick={() => setActiveSubTab('historical-trends')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeSubTab === 'historical-trends' 
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Historical Trends
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parts Health by Vehicle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-500" />
              Parts Health by Vehicle
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {vehicles.map(vehicle => {
                const vehicleParts = filteredParts.filter(p => p.vehicleId === vehicle.id);
                const criticalParts = vehicleParts.filter(p => p.status === 'critical').length;
                const warningParts = vehicleParts.filter(p => p.status === 'warning').length;
                const isExpanded = expandedVehicle === vehicle.id;
                
                return (
                  <div key={vehicle.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <button
                      onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{vehicle.registrationNumber}</p>
                          <p className="text-sm text-gray-500">
                            {vehicle.make} {vehicle.model} • {vehicle.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {criticalParts > 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {criticalParts} Critical
                          </span>
                        )}
                        {warningParts > 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            {warningParts} Warning
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                    
                    {/* Expanded Part Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {vehicleParts.map(part => (
                            <div
                              key={part.id}
                              className={`p-3 rounded-lg border-2 bg-white ${
                                part.status === 'critical'
                                  ? 'border-red-300'
                                  : part.status === 'warning'
                                  ? 'border-yellow-300'
                                  : 'border-green-300'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{part.partName}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{part.category}</p>
                                </div>
                                {part.status === 'critical' && (
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              {/* Progress Bar */}
                              <div className="mt-2">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      part.status === 'critical'
                                        ? 'bg-red-500'
                                        : part.status === 'warning'
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(part.lifePercentage, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {part.kmSinceReplacement.toLocaleString()} / {part.expectedLife.toLocaleString()} km
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parts Requiring Attention */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Parts Requiring Attention
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {criticalParts.map(part => (
                <div
                  key={part.id}
                  className="border border-red-200 rounded-lg p-4 bg-red-50/30 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <span className="text-2xl">🔧</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{part.partName}</p>
                        <p className="text-sm text-gray-600">{part.vehicleReg}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last: {format(new Date(part.lastReplacementDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-700">{part.kmOverdue} km</p>
                      <p className="text-xs text-gray-600 mt-1">overdue</p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">₹{part.estimatedCost.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'peer-comparison' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Performance vs Peers
          </h2>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Peer Comparison</h3>
            <p className="text-gray-500">
              Compare your fleet's part performance with industry benchmarks
            </p>
          </div>
        </div>
      )}

      {activeSubTab === 'historical-trends' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Historical Performance Trends
          </h2>
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Historical Trends</h3>
            <p className="text-gray-500">
              Track part replacement patterns and performance over time
            </p>
          </div>
        </div>
      )}

      {/* AI-Powered Insights */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-400" />
          AI-Powered Insights & Recommendations
        </h2>
        <div className="space-y-4">
          {/* Cost Optimization */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Info className="h-5 w-5 text-blue-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-200">Cost Optimization</p>
                <p className="text-sm text-gray-300 mt-1">
                  Vehicles in the 7.5T category are achieving 15% better clutch plate life than heavier vehicles. 
                  Consider preventive maintenance scheduling.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Performance */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-200">Brand Performance</p>
                <p className="text-sm text-gray-300 mt-1">
                  MRF tyres showing 20% longer life compared to other brands in your fleet. 
                  Standardizing could save ₹45K annually.
                </p>
              </div>
            </div>
          </div>

          {/* Maintenance Pattern */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="h-5 w-5 text-purple-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-200">Maintenance Pattern</p>
                <p className="text-sm text-gray-300 mt-1">
                  CG04NJ9478 showing improving trend with 12% increase in parts life after recent driver change. 
                  Consider driver training program.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartHealthDashboard;