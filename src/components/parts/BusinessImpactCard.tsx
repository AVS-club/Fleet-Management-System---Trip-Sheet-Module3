import React from 'react';
import { AlertTriangle, TrendingDown, IndianRupee, Clock, Shield } from 'lucide-react';

interface BusinessImpactCardProps {
  part: {
    id: string;
    name: string;
    icon: string;
    category: string;
    remainingLife: number;
    avgCost: number;
    downTimeHours: number;
    businessImpact: string;
    complianceRisk: string;
    revenueLossPerDay: number;
    criticalThreshold: number;
    standardLifeKm: number;
  };
  vehicle: {
    id: string;
    registration_number: string;
    gvw?: number;
  };
}

export const BusinessImpactCard: React.FC<BusinessImpactCardProps> = ({ part, vehicle }) => {
  const getDaysUntilCritical = () => {
    const kmPerDay = 200; // Average fleet km/day
    return Math.floor(part.remainingLife / kmPerDay);
  };

  const getTotalImpactCost = () => {
    const daysDown = part.downTimeHours / 24;
    const revenueLoss = part.revenueLossPerDay * daysDown;
    const repairCost = part.avgCost;
    const towingCost = 5000;
    return revenueLoss + repairCost + towingCost;
  };

  const getUrgencyLevel = () => {
    const daysUntilCritical = getDaysUntilCritical();
    if (daysUntilCritical <= 7) return 'critical';
    if (daysUntilCritical <= 30) return 'high';
    if (daysUntilCritical <= 60) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();
  
  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case 'critical': return 'from-red-50 to-red-100 border-red-300';
      case 'high': return 'from-orange-50 to-orange-100 border-orange-300';
      case 'medium': return 'from-yellow-50 to-yellow-100 border-yellow-300';
      default: return 'from-gray-50 to-gray-100 border-gray-300';
    }
  };

  const getUrgencyTextColor = () => {
    switch (urgencyLevel) {
      case 'critical': return 'text-red-800';
      case 'high': return 'text-orange-800';
      case 'medium': return 'text-yellow-800';
      default: return 'text-gray-800';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getUrgencyColor()} rounded-lg p-4 border shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold ${getUrgencyTextColor()} flex items-center gap-2`}>
          <AlertTriangle className="h-4 w-4" />
          Business Impact Alert
        </h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          urgencyLevel === 'critical' ? 'bg-red-200 text-red-800' :
          urgencyLevel === 'high' ? 'bg-orange-200 text-orange-800' :
          urgencyLevel === 'medium' ? 'bg-yellow-200 text-yellow-800' :
          'bg-gray-200 text-gray-800'
        }`}>
          {urgencyLevel.toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-3">
        {/* Vehicle Info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">{vehicle.registration_number}</span>
          {vehicle.gvw && (
            <span className="text-gray-500">• GVW: {(vehicle.gvw / 1000).toFixed(1)}T</span>
          )}
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-gray-600" />
              <span className="text-xs text-gray-600">Days until critical</span>
            </div>
            <p className={`font-bold text-lg ${getUrgencyTextColor()}`}>
              {getDaysUntilCritical()} days
            </p>
          </div>
          
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="h-3 w-3 text-gray-600" />
              <span className="text-xs text-gray-600">Revenue at risk</span>
            </div>
            <p className={`font-bold text-lg ${getUrgencyTextColor()}`}>
              ₹{part.revenueLossPerDay.toLocaleString()}/day
            </p>
          </div>
        </div>
        
        {/* Total Impact Cost */}
        <div className="bg-white/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-3 w-3 text-gray-600" />
            <span className="text-xs text-gray-600">Total impact cost</span>
          </div>
          <p className={`font-bold text-lg ${getUrgencyTextColor()}`}>
            ₹{getTotalImpactCost().toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Includes: Repair ₹{part.avgCost.toLocaleString()} + Downtime ₹{(part.revenueLossPerDay * (part.downTimeHours / 24)).toLocaleString()} + Towing ₹5,000
          </p>
        </div>
        
        {/* Risk Details */}
        <div className="space-y-2 pt-2 border-t border-gray-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-700">Business Risk</p>
              <p className="text-xs text-red-600">{part.businessImpact}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Shield className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-700">Compliance Risk</p>
              <p className="text-xs text-orange-600">{part.complianceRisk}</p>
            </div>
          </div>
        </div>
        
        {/* Action Required */}
        {urgencyLevel === 'critical' && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mt-3">
            <p className="text-xs font-bold text-red-800 text-center">
              🚨 IMMEDIATE ACTION REQUIRED 🚨
            </p>
            <p className="text-xs text-red-700 text-center mt-1">
              Schedule replacement within 7 days to avoid breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
