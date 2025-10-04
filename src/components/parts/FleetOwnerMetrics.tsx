import React from 'react';
import { TrendingUp, AlertTriangle, IndianRupee, Truck, Shield, Clock } from 'lucide-react';

interface PartData {
  id: string;
  vehicleId: string;
  partType: string;
  partName: string;
  status: 'critical' | 'warning' | 'good';
  remainingLife: number;
  avgCost: number;
  revenueLossPerDay: number;
  downTimeHours: number;
  businessImpact: string;
  complianceRisk: string;
  criticalThreshold: number;
  standardLifeKm: number;
}

interface FleetOwnerMetricsProps {
  partsData: PartData[];
}

export const FleetOwnerMetrics: React.FC<FleetOwnerMetricsProps> = ({ partsData }) => {
  const calculateFleetMetrics = () => {
    const criticalParts = partsData.filter(p => p.status === 'critical');
    const warningParts = partsData.filter(p => p.status === 'warning');
    
    const totalRevenueAtRisk = criticalParts.reduce((sum, p) => 
      sum + p.revenueLossPerDay, 0
    );
    
    const totalRepairCost = criticalParts.reduce((sum, p) => 
      sum + p.avgCost, 0
    );
    
    const breakdownProbability = partsData.length > 0 
      ? (criticalParts.length / partsData.length) * 100 
      : 0;
    
    const vehiclesAtRisk = new Set(criticalParts.map(p => p.vehicleId)).size;
    
    const totalDowntimeHours = criticalParts.reduce((sum, p) => 
      sum + p.downTimeHours, 0
    );
    
    const avgDaysUntilCritical = criticalParts.length > 0
      ? criticalParts.reduce((sum, p) => {
          const kmPerDay = 200;
          return sum + Math.floor(p.remainingLife / kmPerDay);
        }, 0) / criticalParts.length
      : 0;
    
    const complianceRiskParts = partsData.filter(p => 
      p.complianceRisk.toLowerCase().includes('fine') || 
      p.complianceRisk.toLowerCase().includes('violation') ||
      p.complianceRisk.toLowerCase().includes('audit')
    ).length;

    return {
      totalRevenueAtRisk,
      totalRepairCost,
      breakdownProbability,
      vehiclesAtRisk,
      totalDowntimeHours,
      avgDaysUntilCritical,
      complianceRiskParts,
      criticalPartsCount: criticalParts.length,
      warningPartsCount: warningParts.length,
      totalPartsCount: partsData.length
    };
  };

  const metrics = calculateFleetMetrics();

  const getRiskLevel = () => {
    if (metrics.breakdownProbability > 30) return 'critical';
    if (metrics.breakdownProbability > 15) return 'high';
    if (metrics.breakdownProbability > 5) return 'medium';
    return 'low';
  };

  const riskLevel = getRiskLevel();

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'critical': return 'from-red-600 to-red-700';
      case 'high': return 'from-orange-600 to-orange-700';
      case 'medium': return 'from-yellow-600 to-yellow-700';
      default: return 'from-green-600 to-green-700';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getRiskColor()} rounded-xl p-6 text-white mb-6 shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          📊 Fleet Owner Decision Dashboard
        </h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          riskLevel === 'critical' ? 'bg-red-500' :
          riskLevel === 'high' ? 'bg-orange-500' :
          riskLevel === 'medium' ? 'bg-yellow-500' :
          'bg-green-500'
        }`}>
          {riskLevel.toUpperCase()} RISK
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-4 w-4 text-yellow-300" />
            <p className="text-purple-200 text-sm font-medium">Daily Revenue at Risk</p>
          </div>
          <p className="text-3xl font-bold">
            ₹{metrics.totalRevenueAtRisk.toLocaleString()}
          </p>
          <p className="text-xs text-purple-200 mt-1">
            {metrics.criticalPartsCount} critical parts
          </p>
        </div>
        
        <div className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            <p className="text-purple-200 text-sm font-medium">Breakdown Probability</p>
          </div>
          <p className="text-3xl font-bold">
            {metrics.breakdownProbability.toFixed(1)}%
          </p>
          <p className="text-xs text-purple-200 mt-1">
            {metrics.vehiclesAtRisk} vehicles at risk
          </p>
        </div>
        
        <div className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-blue-300" />
            <p className="text-purple-200 text-sm font-medium">Vehicles at Risk</p>
          </div>
          <p className="text-3xl font-bold">
            {metrics.vehiclesAtRisk}
          </p>
          <p className="text-xs text-purple-200 mt-1">
            {metrics.totalPartsCount} total parts monitored
          </p>
        </div>
        
        <div className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-300" />
            <p className="text-purple-200 text-sm font-medium">Urgent Repair Budget</p>
          </div>
          <p className="text-3xl font-bold">
            ₹{(metrics.totalRepairCost / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-purple-200 mt-1">
            {metrics.totalDowntimeHours}h total downtime
          </p>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3 w-3 text-blue-300" />
            <p className="text-purple-200 text-xs font-medium">Avg Days Until Critical</p>
          </div>
          <p className="text-xl font-bold">
            {metrics.avgDaysUntilCritical > 0 ? Math.round(metrics.avgDaysUntilCritical) : 'N/A'}
          </p>
        </div>
        
        <div className="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3 w-3 text-orange-300" />
            <p className="text-purple-200 text-xs font-medium">Compliance Risk Parts</p>
          </div>
          <p className="text-xl font-bold">
            {metrics.complianceRiskParts}
          </p>
        </div>
        
        <div className="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3 w-3 text-yellow-300" />
            <p className="text-purple-200 text-xs font-medium">Warning Parts</p>
          </div>
          <p className="text-xl font-bold">
            {metrics.warningPartsCount}
          </p>
        </div>
      </div>

      {/* Risk Assessment */}
      {riskLevel === 'critical' && (
        <div className="mt-4 bg-red-500/30 border border-red-400 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-300" />
            <p className="font-bold text-red-200">CRITICAL FLEET ALERT</p>
          </div>
          <p className="text-sm text-red-100">
            Your fleet has a {metrics.breakdownProbability.toFixed(1)}% breakdown probability. 
            Immediate action required to prevent revenue loss of ₹{metrics.totalRevenueAtRisk.toLocaleString()}/day.
          </p>
        </div>
      )}

      {riskLevel === 'high' && (
        <div className="mt-4 bg-orange-500/30 border border-orange-400 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-300" />
            <p className="font-bold text-orange-200">HIGH RISK FLEET</p>
          </div>
          <p className="text-sm text-orange-100">
            Schedule preventive maintenance within 30 days to avoid potential breakdowns.
          </p>
        </div>
      )}
    </div>
  );
};
