import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { getTagBasedPartsHealthMetrics, getLastFourDigits } from '@/utils/partsAnalytics';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';

interface TagBasedComparisonProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  selectedTags: string[];
}

const TagBasedComparison: React.FC<TagBasedComparisonProps> = ({
  tasks,
  vehicles,
  selectedTags
}) => {
  // Get tag-based metrics
  const tagMetrics = useMemo(() => {
    return getTagBasedPartsHealthMetrics(
      tasks,
      vehicles,
      selectedTags.length > 0 ? selectedTags : undefined
    );
  }, [tasks, vehicles, selectedTags]);

  // Group metrics by tag
  const metricsByTag = useMemo(() => {
    const grouped = new Map<string, typeof tagMetrics>();
    
    tagMetrics.forEach(metric => {
      const tagKey = metric.tagId || 'untagged';
      if (!grouped.has(tagKey)) {
        grouped.set(tagKey, []);
      }
      grouped.get(tagKey)!.push(metric);
    });
    
    return Array.from(grouped.entries()).map(([tagId, metrics]) => {
      const tagName = metrics[0]?.tagName || 'Untagged';
      const tagColor = metrics[0]?.tagColor || '#94a3b8';
      
      // Calculate tag-level statistics
      const avgLife = metrics.reduce((sum, m) => sum + (m.lifeRemainingPercentage || 0), 0) / metrics.length;
      const criticalCount = metrics.filter(m => m.status === 'overdue').length;
      const warningCount = metrics.filter(m => m.status === 'needs_attention').length;
      const goodCount = metrics.filter(m => m.status === 'good').length;
      const totalCost = metrics.reduce((sum, m) => sum + (m.averageCost || 0), 0);
      
      // Get peer comparison data
      const peerData = metrics[0]?.peerComparison;
      
      return {
        tagId,
        tagName,
        tagColor,
        avgLife: Math.round(avgLife),
        criticalCount,
        warningCount,
        goodCount,
        totalCost,
        vehicleCount: peerData?.totalVehiclesInTag || 0,
        bestVehicle: peerData?.bestPerformingVehicle,
        worstVehicle: peerData?.worstPerformingVehicle,
        metrics
      };
    });
  }, [tagMetrics]);

  // Calculate overall fleet average for comparison
  const fleetAverage = useMemo(() => {
    if (tagMetrics.length === 0) return 0;
    return Math.round(
      tagMetrics.reduce((sum, m) => sum + (m.lifeRemainingPercentage || 0), 0) / tagMetrics.length
    );
  }, [tagMetrics]);

  if (metricsByTag.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">
          {selectedTags.length > 0 
            ? 'No maintenance data found for vehicles with selected tags'
            : 'Add tags to vehicles and record maintenance tasks to see tag-based comparisons'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fleet-wide summary */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Fleet Overview</h2>
          <BarChart3 className="h-6 w-6" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-blue-100 text-sm">Average Part Life</div>
            <div className="text-3xl font-bold">{fleetAverage}%</div>
          </div>
          <div>
            <div className="text-blue-100 text-sm">Tag Groups</div>
            <div className="text-3xl font-bold">{metricsByTag.length}</div>
          </div>
          <div>
            <div className="text-blue-100 text-sm">Total Vehicles</div>
            <div className="text-3xl font-bold">
              {metricsByTag.reduce((sum, t) => sum + t.vehicleCount, 0)}
            </div>
          </div>
          <div>
            <div className="text-blue-100 text-sm">Critical Parts</div>
            <div className="text-3xl font-bold">
              {metricsByTag.reduce((sum, t) => sum + t.criticalCount, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Tag comparison cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metricsByTag.map(tag => (
          <div key={tag.tagId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tag header */}
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: tag.tagColor }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{tag.tagName}</h3>
                  <p className="text-sm opacity-90">{tag.vehicleCount} vehicle(s)</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{tag.avgLife}%</div>
                  <div className="text-sm opacity-90">Avg Life</div>
                </div>
              </div>
            </div>

            {/* Tag body */}
            <div className="p-4 space-y-4">
              {/* Performance indicator */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">vs Fleet Average</span>
                <div className="flex items-center gap-2">
                  {tag.avgLife > fleetAverage ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-bold">
                        +{tag.avgLife - fleetAverage}%
                      </span>
                    </>
                  ) : tag.avgLife < fleetAverage ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 font-bold">
                        {tag.avgLife - fleetAverage}%
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-600 font-bold">±0%</span>
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{tag.criticalCount}</div>
                  <div className="text-xs text-gray-600">Critical</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">{tag.warningCount}</div>
                  <div className="text-xs text-gray-600">Warning</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{tag.goodCount}</div>
                  <div className="text-xs text-gray-600">Good</div>
                </div>
              </div>

              {/* Best and worst performers */}
              {tag.bestVehicle && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Award className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-green-700 mb-1">Best Performer</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {tag.bestVehicle.registration}
                        </span>
                        <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-mono rounded flex-shrink-0">
                          {getLastFourDigits(tag.bestVehicle.registration)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {Math.round(tag.bestVehicle.lifePercentage)}% avg part life
                      </div>
                    </div>
                  </div>

                  {tag.worstVehicle && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-red-700 mb-1">Needs Attention</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {tag.worstVehicle.registration}
                          </span>
                          <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-mono rounded flex-shrink-0">
                            {getLastFourDigits(tag.worstVehicle.registration)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round(tag.worstVehicle.lifePercentage)}% avg part life
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estimated maintenance cost */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700 mb-1">Estimated Upcoming Cost</div>
                <div className="text-xl font-bold text-blue-900">
                  ₹{tag.totalCost.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Insights section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-300" />
          </div>
          <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
        </div>
        
        <div className="space-y-3">
          {/* Find tag with best performance */}
          {(() => {
            const bestTag = metricsByTag.reduce((best, current) => 
              current.avgLife > best.avgLife ? current : best
            , metricsByTag[0]);
            
            const worstTag = metricsByTag.reduce((worst, current) => 
              current.avgLife < worst.avgLife ? current : worst
            , metricsByTag[0]);
            
            return (
              <>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white">{bestTag.tagName}</span> vehicles 
                    are performing {bestTag.avgLife - fleetAverage}% above fleet average. 
                    Consider sharing their maintenance practices with other teams.
                  </p>
                </div>
                
                {worstTag.tagId !== bestTag.tagId && (
                  <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold text-white">{worstTag.tagName}</span> vehicles 
                      need attention. Their parts are averaging {worstTag.avgLife}% life remaining, 
                      {fleetAverage - worstTag.avgLife}% below fleet average.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default TagBasedComparison;
