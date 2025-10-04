import React, { useState, useEffect } from 'react';
import { 
  Settings, AlertTriangle, CheckCircle, TrendingUp, Activity, 
  Battery, Disc, Wrench, Filter, RefreshCw, ChevronDown, 
  ChevronUp, Calendar, DollarSign, BarChart3, Clock,
  Zap, CircuitBoard, Gauge, Shield, Info
} from 'lucide-react';
import { FLEET_PARTS_DEFINITIONS } from '../constants/fleetParts';
import { BusinessImpactCard } from '../components/parts/BusinessImpactCard';
import { FleetOwnerMetrics } from '../components/parts/FleetOwnerMetrics';

// Mock data generation
const generateMockData = () => {
  const vehicles = [
    { id: 'v1', registration: 'CG04NJ9478', gvw: 7500, type: 'truck', make: 'Tata', model: 'Ace' },
    { id: 'v2', registration: 'OD15T3494', gvw: 12000, type: 'truck', make: 'Ashok Leyland', model: 'Boss' },
    { id: 'v3', registration: 'CG04NC0316', gvw: 7500, type: 'truck', make: 'Tata', model: 'Ace' },
    { id: 'v4', registration: 'CG04NC9672', gvw: 3500, type: 'pickup', make: 'Mahindra', model: 'Bolero' },
    { id: 'v5', registration: 'CG04QE5604', gvw: 3500, type: 'pickup', make: 'Mahindra', model: 'Bolero' },
  ];

  const partTypes = FLEET_PARTS_DEFINITIONS;

  // Generate historical replacement data
  const generateReplacementHistory = (vehicleId, partType) => {
    const history = [];
    const startOdometer = Math.floor(Math.random() * 5000);
    let currentOdometer = startOdometer;
    
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      const replacementKm = currentOdometer + partType.standardLifeKm * (0.7 + Math.random() * 0.6);
      history.push({
        date: new Date(Date.now() - (365 - i * 120) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        odometer: Math.floor(replacementKm),
        cost: Math.floor(partType.avgCost * (0.8 + Math.random() * 0.4)),
        brand: ['MRF', 'CEAT', 'Apollo', 'Exide', 'Amaron'][Math.floor(Math.random() * 5)],
        lifeAchieved: Math.floor(replacementKm - currentOdometer)
      });
      currentOdometer = replacementKm;
    }
    
    return history;
  };

  const partsData = [];
  vehicles.forEach(vehicle => {
    partTypes.forEach(partType => {
      const history = generateReplacementHistory(vehicle.id, partType);
      const lastReplacement = history[history.length - 1];
      const currentOdometer = lastReplacement.odometer + Math.floor(Math.random() * partType.standardLifeKm);
      const kmSinceReplacement = currentOdometer - lastReplacement.odometer;
      const remainingLife = partType.standardLifeKm - kmSinceReplacement;
      
      partsData.push({
        vehicleId: vehicle.id,
        vehicleReg: vehicle.registration,
        vehicleGVW: vehicle.gvw,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        partType: partType.id,
        partName: partType.name,
        partIcon: partType.icon,
        currentOdometer,
        lastReplacement: lastReplacement.date,
        lastReplacementOdometer: lastReplacement.odometer,
        kmSinceReplacement,
        remainingLife,
        lifePercentage: Math.max(0, Math.min(100, (remainingLife / partType.standardLifeKm) * 100)),
        status: remainingLife < partType.criticalThreshold ? 'critical' : 
                remainingLife < partType.criticalThreshold * 2 ? 'warning' : 'good',
        estimatedCost: lastReplacement.cost * 1.1,
        avgCost: partType.avgCost,
        downTimeHours: partType.downTimeHours,
        businessImpact: partType.businessImpact,
        complianceRisk: partType.complianceRisk,
        revenueLossPerDay: partType.revenueLossPerDay,
        history,
        avgLifeAchieved: history.reduce((sum, h) => sum + h.lifeAchieved, 0) / history.length,
        trend: history.length > 1 ? 
          (history[history.length - 1].lifeAchieved - history[0].lifeAchieved) / history[0].lifeAchieved * 100 : 0
      });
    });
  });

  return { vehicles, partTypes, partsData };
};

const PartsHealthAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPart, setSelectedPart] = useState('all');
  const [selectedGVWCategory, setSelectedGVWCategory] = useState('all');
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const [data, setData] = useState({ vehicles: [], partTypes: [], partsData: [] });

  useEffect(() => {
    setData(generateMockData());
  }, []);

  const { vehicles, partTypes, partsData } = data;

  // Calculate GVW categories with enhanced colors
  const gvwCategories = [
    { id: 'light', name: 'Light (< 5T)', min: 0, max: 5000, color: 'border-blue-300 bg-blue-100/40' },
    { id: 'medium', name: 'Medium (5-10T)', min: 5000, max: 10000, color: 'border-amber-300 bg-amber-100/40' },
    { id: 'heavy', name: 'Heavy (> 10T)', min: 10000, max: Infinity, color: 'border-orange-300 bg-orange-100/40' }
  ];

  const getGVWCategory = (gvw) => {
    return gvwCategories.find(cat => gvw >= cat.min && gvw < cat.max);
  };

  // Filter data based on selections
  const filteredData = partsData.filter(part => {
    if (selectedPart !== 'all' && part.partType !== selectedPart) return false;
    if (selectedGVWCategory !== 'all') {
      const category = getGVWCategory(part.vehicleGVW);
      if (category?.id !== selectedGVWCategory) return false;
    }
    return true;
  });

  // Calculate analytics metrics
  const calculateMetrics = () => {
    const critical = filteredData.filter(p => p.status === 'critical').length;
    const warning = filteredData.filter(p => p.status === 'warning').length;
    const good = filteredData.filter(p => p.status === 'good').length;
    const upcomingCost = filteredData
      .filter(p => p.status !== 'good')
      .reduce((sum, p) => sum + p.estimatedCost, 0);

    return { critical, warning, good, upcomingCost };
  };

  const metrics = calculateMetrics();

  // Get peer comparison data
  const getPeerComparison = (vehicleId, partType) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;

    const category = getGVWCategory(vehicle.gvw);
    const peers = partsData.filter(p => 
      p.partType === partType && 
      p.vehicleId !== vehicleId &&
      getGVWCategory(p.vehicleGVW)?.id === category?.id
    );

    if (peers.length === 0) return null;

    const currentVehiclePart = partsData.find(p => 
      p.vehicleId === vehicleId && p.partType === partType
    );

    const avgPeerLife = peers.reduce((sum, p) => sum + p.avgLifeAchieved, 0) / peers.length;
    const comparison = ((currentVehiclePart?.avgLifeAchieved || 0) - avgPeerLife) / avgPeerLife * 100;

    return {
      avgPeerLife: Math.round(avgPeerLife),
      vehicleLife: Math.round(currentVehiclePart?.avgLifeAchieved || 0),
      performanceVsPeers: comparison,
      peerCount: peers.length
    };
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'text-red-700 bg-red-100/70';
      case 'warning': return 'text-amber-700 bg-amber-100/70';
      case 'good': return 'text-emerald-700 bg-emerald-100/70';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage < 20) return 'bg-red-500';
    if (percentage < 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Settings className="h-8 w-8 text-blue-600" />
                Parts Health & Analytics
              </h1>
              <p className="text-gray-600 mt-1">Comprehensive vehicle parts monitoring and predictive analysis</p>
            </div>
            <button className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-md border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">Critical Parts</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">{metrics.critical}</p>
                <p className="text-xs text-gray-600 mt-2">Need immediate attention</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-700 text-sm font-medium">Need Attention</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">{metrics.warning}</p>
                <p className="text-xs text-gray-600 mt-2">Schedule maintenance</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-medium">Good Health</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">{metrics.good}</p>
                <p className="text-xs text-gray-600 mt-2">Operating normally</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-700 text-sm font-medium">Upcoming Cost</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">₹{(metrics.upcomingCost / 1000).toFixed(1)}K</p>
                <p className="text-xs text-gray-600 mt-2">Estimated expenditure</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Owner Metrics - Always visible */}
        <FleetOwnerMetrics partsData={filteredData} />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex flex-wrap gap-4">
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-gray-50"
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value)}
            >
              <option value="all">All Parts</option>
              {partTypes.map(part => (
                <option key={part.id} value={part.id}>
                  {part.icon} {part.name}
                </option>
              ))}
            </select>

            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-gray-50"
              value={selectedGVWCategory}
              onChange={(e) => setSelectedGVWCategory(e.target.value)}
            >
              <option value="all">All GVW Categories</option>
              {gvwCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <div className="flex gap-2 ml-auto">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'comparison' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Peer Comparison
              </button>
              <button 
                onClick={() => setActiveTab('trends')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'trends' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Historical Trends
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parts by Vehicle */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                Parts Health by Vehicle
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vehicles.map(vehicle => {
                  const vehicleParts = filteredData.filter(p => p.vehicleId === vehicle.id);
                  const isExpanded = expandedVehicle === vehicle.id;
                  const category = getGVWCategory(vehicle.gvw);
                  
                  return (
                    <div key={vehicle.id} className={`border rounded-lg ${category?.color} shadow-sm`}>
                      <button
                        onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <p className="font-semibold text-gray-800">{vehicle.registration}</p>
                            <p className="text-sm text-gray-600">
                              {vehicle.make} {vehicle.model} • GVW: {(vehicle.gvw / 1000).toFixed(1)}T
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              vehicleParts.filter(p => p.status === 'critical').length > 0
                                ? 'bg-red-200 text-red-800'
                                : vehicleParts.filter(p => p.status === 'warning').length > 0
                                ? 'bg-amber-200 text-amber-800'
                                : 'bg-emerald-200 text-emerald-800'
                            }`}>
                              {vehicleParts.filter(p => p.status === 'critical').length > 0
                                ? `${vehicleParts.filter(p => p.status === 'critical').length} Critical`
                                : vehicleParts.filter(p => p.status === 'warning').length > 0
                                ? `${vehicleParts.filter(p => p.status === 'warning').length} Warning`
                                : 'All Good'}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-white/80 p-4 space-y-3">
                          {vehicleParts.map(part => (
                            <div key={`${part.vehicleId}-${part.partType}`} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{part.partIcon}</span>
                                  <span className="font-medium text-gray-700">{part.partName}</span>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(part.status)}`}>
                                  {part.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${getProgressBarColor(part.lifePercentage)}`}
                                  style={{ width: `${part.lifePercentage}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>{part.kmSinceReplacement.toLocaleString()} km used</span>
                                <span>{part.remainingLife.toLocaleString()} km remaining</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical Parts List */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Parts Requiring Attention
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredData
                  .filter(p => p.status !== 'good')
                  .sort((a, b) => a.remainingLife - b.remainingLife)
                  .slice(0, 10)
                  .map(part => {
                    const vehicle = vehicles.find(v => v.id === part.vehicleId);
                    return (
                      <div key={`${part.vehicleId}-${part.partType}`} className="space-y-3">
                        <div className={`p-4 rounded-lg border ${
                          part.status === 'critical' 
                            ? 'bg-red-100/50 border-red-300' 
                            : 'bg-amber-100/50 border-amber-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {part.partIcon} {part.partName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {part.vehicleReg} • Last: {part.lastReplacement}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                part.status === 'critical' ? 'text-red-700' : 'text-amber-700'
                              }`}>
                                {part.remainingLife.toLocaleString()} km
                              </p>
                              <p className="text-sm text-gray-600">
                                ₹{part.estimatedCost.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Business Impact Card */}
                        {vehicle && (
                          <BusinessImpactCard 
                            part={part} 
                            vehicle={vehicle} 
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance vs Peers (Same GVW Category)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vehicles.map(vehicle => {
                const category = getGVWCategory(vehicle.gvw);
                const vehicleParts = filteredData.filter(p => p.vehicleId === vehicle.id);
                
                return (
                  <div key={vehicle.id} className={`border rounded-lg p-4 ${category?.color}`}>
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-800">{vehicle.registration}</h3>
                      <p className="text-sm text-gray-600">
                        {vehicle.make} {vehicle.model} • {category?.name}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {vehicleParts.map(part => {
                        const comparison = getPeerComparison(vehicle.id, part.partType);
                        if (!comparison) return null;
                        
                        return (
                          <div key={part.partType} className="bg-white/90 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-700">
                                {part.partIcon} {part.partName}
                              </span>
                              <span className={`text-sm font-bold ${
                                comparison.performanceVsPeers > 0 
                                  ? 'text-emerald-700' 
                                  : 'text-red-700'
                              }`}>
                                {comparison.performanceVsPeers > 0 ? '+' : ''}
                                {comparison.performanceVsPeers.toFixed(1)}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Vehicle Avg</p>
                                <p className="font-semibold text-gray-800">{comparison.vehicleLife.toLocaleString()} km</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Peer Avg ({comparison.peerCount} vehicles)</p>
                                <p className="font-semibold text-gray-800">{comparison.avgPeerLife.toLocaleString()} km</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Historical Performance Trends
            </h2>
            <div className="space-y-6">
              {vehicles.map(vehicle => {
                const vehicleParts = filteredData.filter(p => p.vehicleId === vehicle.id);
                
                return (
                  <div key={vehicle.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-800 mb-4">
                      {vehicle.registration} - {vehicle.make} {vehicle.model}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vehicleParts.map(part => (
                        <div key={part.partType} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-gray-700">
                              {part.partIcon} {part.partName}
                            </span>
                            <span className={`text-sm font-bold ${
                              part.trend > 0 ? 'text-emerald-700' : 'text-red-700'
                            }`}>
                              {part.trend > 0 ? '↑' : '↓'} {Math.abs(part.trend).toFixed(1)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600 font-medium">Replacement History</p>
                            {part.history.slice(-3).map((h, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-gray-600">{h.date}</span>
                                <span className="font-medium text-gray-700">{h.lifeAchieved.toLocaleString()} km</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Avg Life</span>
                              <span className="font-semibold text-gray-800">
                                {Math.round(part.avgLifeAchieved).toLocaleString()} km
                              </span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-gray-600">Next Est.</span>
                              <span className="font-semibold text-blue-700">
                                @ {(part.lastReplacementOdometer + Math.round(part.avgLifeAchieved)).toLocaleString()} km
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI-Powered Insights */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            AI-Powered Insights & Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-300" />
                <span className="font-medium">Cost Optimization</span>
              </div>
              <p className="text-sm text-gray-300">
                Vehicles in the 7.5T category are achieving 15% better clutch plate life than heavier vehicles. 
                Consider preventive maintenance scheduling.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-300" />
                <span className="font-medium">Brand Performance</span>
              </div>
              <p className="text-sm text-gray-300">
                MRF tyres showing 20% longer life compared to other brands in your fleet. 
                Standardizing could save ₹45K annually.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-purple-300" />
                <span className="font-medium">Maintenance Pattern</span>
              </div>
              <p className="text-sm text-gray-300">
                CG04NJ9478 showing improving trend with 12% increase in parts life after recent driver change. 
                Consider driver training program.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartsHealthAnalytics;
