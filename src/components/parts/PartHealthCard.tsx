import React from 'react';
import { PartHealthMetrics } from '../../utils/partsAnalytics';
import { AlertTriangle, Calendar, IndianRupee, Gauge, Shield, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface PartHealthCardProps {
  part: PartHealthMetrics;
  onClick?: () => void;
}

const PartHealthCard: React.FC<PartHealthCardProps> = ({ part, onClick }) => {
  // Get status color and styling
  const getStatusStyling = () => {
    switch (part.status) {
      case 'overdue':
        return {
          badge: 'bg-error-100 text-error-800 border-error-200',
          card: 'border-error-200 bg-error-50',
          progress: 'bg-error-500',
          label: 'Overdue'
        };
      case 'needs_attention':
        return {
          badge: 'bg-warning-100 text-warning-800 border-warning-200',
          card: 'border-warning-200 bg-warning-50',
          progress: 'bg-warning-500',
          label: 'Needs Attention'
        };
      case 'good':
        return {
          badge: 'bg-success-100 text-success-800 border-success-200',
          card: 'border-gray-200 bg-white',
          progress: 'bg-success-500',
          label: 'Good'
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          card: 'border-gray-200 bg-gray-50',
          progress: 'bg-gray-400',
          label: 'No Data'
        };
    }
  };

  const styling = getStatusStyling();

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  // Get progress bar color based on percentage
  const getProgressColor = () => {
    if (part.lifeRemainingPercentage >= 30) return 'bg-success-500';
    if (part.lifeRemainingPercentage >= 10) return 'bg-warning-500';
    return 'bg-error-500';
  };

  return (
    <div 
      className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${styling.card}`}
      onClick={onClick}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={part.partName}>
            {part.icon}
          </span>
          <h3 className="font-medium text-gray-900 text-sm">{part.partName}</h3>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styling.badge}`}>
          {styling.label}
        </span>
      </div>

      {/* Alerts */}
      {part.alerts.length > 0 && (
        <div className="mb-3 p-2 bg-error-50 border border-error-200 rounded-md">
          <div className="flex items-center gap-1 text-error-700">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-xs font-medium">{part.alerts.length} Alert{part.alerts.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="space-y-3">
        {/* Last Replaced */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>Last Replaced</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatDate(part.lastReplacedDate)}
          </span>
        </div>

        {/* Vehicles Affected - Only show if > 0 */}
        {part.vehiclesAffected > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <AlertTriangle className="h-3 w-3" />
              <span>Vehicles Affected</span>
            </div>
            <span className="font-medium text-error-600">
              {part.vehiclesAffected}
            </span>
          </div>
        )}

        {/* Average Cost */}
        {part.averageCost > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <IndianRupee className="h-3 w-3" />
              <span>Avg. Cost</span>
            </div>
            <span className="font-medium text-gray-900">
              ₹{part.averageCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        {/* Max KM Since Replacement */}
        {part.maxKmSinceReplacement > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <Gauge className="h-3 w-3" />
              <span>Max KM Since</span>
            </div>
            <span className="font-medium text-gray-900">
              {part.maxKmSinceReplacement.toLocaleString('en-IN')} km
            </span>
          </div>
        )}

        {/* Warranty Status */}
        {part.warrantyStatus && part.warrantyStatus !== 'unknown' && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Warranty</span>
            </div>
            <span className={`font-medium ${
              part.warrantyStatus === 'valid' ? 'text-success-600' :
              part.warrantyStatus === 'expiring' ? 'text-warning-600' : 'text-error-600'
            }`}>
              {part.warrantyStatus === 'valid' ? 'Valid' :
               part.warrantyStatus === 'expiring' ? 'Expiring' : 'Expired'}
            </span>
          </div>
        )}

        {/* Best Brand */}
        {part.brandPerformance?.bestBrand && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <TrendingUp className="h-3 w-3" />
              <span>Best Brand</span>
            </div>
            <span className="font-medium text-success-600">
              {part.brandPerformance.bestBrand}
            </span>
          </div>
        )}
      </div>

      {/* Life Remaining Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Life Remaining</span>
          <span className="text-xs font-medium text-gray-900">
            {part.lifeRemainingPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.max(2, part.lifeRemainingPercentage)}%` }}
          />
        </div>
      </div>

      {/* Click indicator */}
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default PartHealthCard;