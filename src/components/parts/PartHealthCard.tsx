import React, { memo } from 'react';
import { PartHealthMetrics } from '../../utils/partsAnalytics';
import { AlertTriangle, Calendar, IndianRupee, Gauge, Shield, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface PartHealthCardProps {
  part: PartHealthMetrics;
  onClick?: () => void;
}

const PartHealthCard: React.FC<PartHealthCardProps> = memo(({ part, onClick }) => {
  // Get status color and styling
  const getStatusStyling = () => {
    switch (part.status) {
      case 'overdue':
        return {
          badge: 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-200 border-error-200 dark:border-error-800',
          card: 'border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20',
          progress: 'bg-error-500 dark:bg-error-600',
          label: 'Overdue'
        };
      case 'needs_attention':
        return {
          badge: 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200 border-warning-200 dark:border-warning-800',
          card: 'border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20',
          progress: 'bg-warning-500 dark:bg-warning-600',
          label: 'Needs Attention'
        };
      case 'good':
        return {
          badge: 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200 border-success-200 dark:border-success-800',
          card: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
          progress: 'bg-success-500 dark:bg-success-600',
          label: 'Good'
        };
      default:
        return {
          badge: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
          card: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
          progress: 'bg-gray-400 dark:bg-gray-600',
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
    if (part.lifeRemainingPercentage >= 30) return 'bg-success-500 dark:bg-success-600';
    if (part.lifeRemainingPercentage >= 10) return 'bg-warning-500 dark:bg-warning-600';
    return 'bg-error-500 dark:bg-error-600';
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
          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{part.partName}</h3>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styling.badge}`}>
          {styling.label}
        </span>
      </div>

      {/* Alerts */}
      {part.alerts.length > 0 && (
        <div className="mb-3 p-2 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md">
          <div className="flex items-center gap-1 text-error-700 dark:text-error-300">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-xs font-medium">{part.alerts.length} Alert{part.alerts.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="space-y-3">
        {/* Last Replaced */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>Last Replaced</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatDate(part.lastReplacedDate)}
          </span>
        </div>

        {/* Vehicles Affected - Only show if > 0 */}
        {part.vehiclesAffected > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Vehicles Affected</span>
            </div>
            <span className="font-medium text-error-600 dark:text-error-400">
              {part.vehiclesAffected}
            </span>
          </div>
        )}

        {/* Average Cost */}
        {part.averageCost > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <IndianRupee className="h-3 w-3" />
              <span>Avg. Cost</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹{part.averageCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        {/* Max KM Since Replacement */}
        {part.maxKmSinceReplacement > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Gauge className="h-3 w-3" />
              <span>Max KM Since</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {part.maxKmSinceReplacement.toLocaleString('en-IN')} km
            </span>
          </div>
        )}

        {/* Warranty Status */}
        {part.warrantyStatus && part.warrantyStatus !== 'unknown' && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Shield className="h-3 w-3" />
              <span>Warranty</span>
            </div>
            <span className={`font-medium ${
              part.warrantyStatus === 'valid' ? 'text-success-600 dark:text-success-400' :
              part.warrantyStatus === 'expiring' ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'
            }`}>
              {part.warrantyStatus === 'valid' ? 'Valid' :
               part.warrantyStatus === 'expiring' ? 'Expiring' : 'Expired'}
            </span>
          </div>
        )}

        {/* Best Brand */}
        {part.brandPerformance?.bestBrand && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-3 w-3" />
              <span>Best Brand</span>
            </div>
            <span className="font-medium text-success-600 dark:text-success-400">
              {part.brandPerformance.bestBrand}
            </span>
          </div>
        )}
      </div>

      {/* Life Remaining Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Life Remaining</span>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
            {part.lifeRemainingPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.max(2, part.lifeRemainingPercentage)}%` }}
          />
        </div>
      </div>

      {/* Click indicator */}
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full"></div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.part.partName === nextProps.part.partName &&
    prevProps.part.status === nextProps.part.status &&
    prevProps.part.lifeRemainingPercentage === nextProps.part.lifeRemainingPercentage &&
    prevProps.part.alerts.length === nextProps.part.alerts.length
  );
});

PartHealthCard.displayName = 'PartHealthCard';

export default PartHealthCard;
