import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Award, AlertCircle, Users } from 'lucide-react';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { getTagBasedPartsHealthMetrics, getLastFourDigits } from '@/utils/partsAnalytics';

interface TagBasedComparisonProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  selectedTags: string[];
}

const TagBasedComparison: React.FC<TagBasedComparisonProps> = ({
  tasks,
  vehicles,
  selectedTags
}: TagBasedComparisonProps) => {
  const tagMetrics = useMemo(() => {
    return getTagBasedPartsHealthMetrics(
      tasks,
      vehicles,
      selectedTags.length > 0 ? selectedTags : undefined
    );
  }, [tasks, vehicles, selectedTags]);

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
      const tagColor = metrics[0]?.tagColor || '#737373';
      
      const avgLife = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (m.lifeRemainingPercentage || 0), 0) / metrics.length
        : 0;
      const criticalCount = metrics.filter(m => m.status === 'overdue').length;
      const warningCount = metrics.filter(m => m.status === 'needs_attention').length;
      const goodCount = metrics.filter(m => m.status === 'good').length;
      const totalCost = metrics.reduce((sum, m) => sum + (m.averageCost || 0), 0);
      
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
    }).sort((a, b) => b.avgLife - a.avgLife);
  }, [tagMetrics]);

  const fleetAverage = useMemo(() => {
    if (tagMetrics.length === 0) return 0;
    return Math.round(
      tagMetrics.reduce((sum, m) => sum + (m.lifeRemainingPercentage || 0), 0) / tagMetrics.length
    );
  }, [tagMetrics]);

  if (metricsByTag.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <BarChart3 className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Comparison Data</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {selectedTags.length > 0
            ? 'No maintenance data found for vehicles with selected tags.'
            : 'Add tags to vehicles and record maintenance tasks to see comparisons.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fleet Overview - Brand Gradient */}
      <div className="rounded-xl shadow-lg p-4 sm:p-6 text-white overflow-hidden relative"
           style={{ background: 'linear-gradient(135deg, #0aa073 0%, #0b3c74 100%)' }}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Fleet Overview</h2>
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <div className="text-white/70 text-xs sm:text-sm">Avg Part Life</div>
            <div className="text-2xl sm:text-3xl font-bold">{fleetAverage}%</div>
          </div>
          <div>
            <div className="text-white/70 text-xs sm:text-sm">Tag Groups</div>
            <div className="text-2xl sm:text-3xl font-bold">{metricsByTag.length}</div>
          </div>
          <div>
            <div className="text-white/70 text-xs sm:text-sm">Vehicles</div>
            <div className="text-2xl sm:text-3xl font-bold">
              {metricsByTag.reduce((sum, t) => sum + t.vehicleCount, 0)}
            </div>
          </div>
          <div>
            <div className="text-white/70 text-xs sm:text-sm">Critical</div>
            <div className="text-2xl sm:text-3xl font-bold">
              {metricsByTag.reduce((sum, t) => sum + t.criticalCount, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Tag Comparison Cards - Neutral with Color Accents */}
      <div className="space-y-4">
        {metricsByTag.map((tag, index) => (
          <div
            key={tag.tagId}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Tag Header - Neutral with colored left strip */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-l-4 relative"
                 style={{ borderLeftColor: tag.tagColor }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {tag.tagName}
                    </h3>
                    {index === 0 && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
                        Best
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <Users className="inline h-3 w-3 mr-1" />
                    {tag.vehicleCount} vehicle(s)
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{tag.avgLife}%</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Avg Life</div>
                </div>
              </div>
            </div>

            {/* Tag Body */}
            <div className="p-4 space-y-4">
              {/* Performance vs Fleet - Neutral */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">vs Fleet Average</span>
                <div className="flex items-center gap-2">
                  {tag.avgLife > fleetAverage ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-teal-600" />
                      <span className="text-teal-600 font-bold text-sm sm:text-base">
                        +{tag.avgLife - fleetAverage}%
                      </span>
                    </>
                  ) : tag.avgLife < fleetAverage ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 font-bold text-sm sm:text-base">
                        {tag.avgLife - fleetAverage}%
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-600 font-bold">±0%</span>
                  )}
                </div>
              </div>

              {/* Status Breakdown - Bright only for critical/warning */}
              <div className="grid grid-cols-3 gap-2">
                {/* Critical - Bright Red */}
                <div className={`text-center p-2 sm:p-3 rounded-lg border ${
                  tag.criticalCount > 0 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-xl sm:text-2xl font-bold ${
                    tag.criticalCount > 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {tag.criticalCount}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Critical</div>
                </div>
                
                {/* Warning - Bright Amber */}
                <div className={`text-center p-2 sm:p-3 rounded-lg border ${
                  tag.warningCount > 0 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-xl sm:text-2xl font-bold ${
                    tag.warningCount > 0 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {tag.warningCount}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Warning</div>
                </div>
                
                {/* Good - Neutral */}
                <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300">{tag.goodCount}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Good</div>
                </div>
              </div>

              {/* Best and Worst Performers - Neutral */}
              {tag.bestVehicle && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 border-l-4"
                       style={{ borderLeftColor: tag.tagColor }}>
                    <Award className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Best Performer
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {tag.bestVehicle.registration}
                        </span>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono rounded">
                          {getLastFourDigits(tag.bestVehicle.registration)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {tag.bestVehicle.lifePercentage}% avg part life
                      </div>
                    </div>
                  </div>

                  {tag.worstVehicle && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 border-l-4 border-l-gray-400 dark:border-l-gray-500">
                      <AlertCircle className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Needs Attention
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {tag.worstVehicle.registration}
                          </span>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono rounded">
                            {getLastFourDigits(tag.worstVehicle.registration)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {tag.worstVehicle.lifePercentage}% avg part life
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estimated Cost - Neutral */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Est. Upcoming Cost</div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  ₹{Math.round(tag.totalCost).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights - Dark Neutral */}
      <div className="rounded-xl shadow-lg p-4 sm:p-6 text-white"
           style={{ background: 'linear-gradient(135deg, #262626 0%, #171717 100%)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold">AI-Powered Insights</h3>
        </div>
        
        <div className="space-y-3">
          {(() => {
            const bestTag = metricsByTag[0];
            const worstTag = metricsByTag[metricsByTag.length - 1];
            
            return (
              <>
                {bestTag && (
                  <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold text-white">{bestTag.tagName}</span> vehicles 
                      performing {bestTag.avgLife - fleetAverage}% above fleet average. 
                      Consider sharing their maintenance practices.
                    </p>
                  </div>
                )}
                
                {worstTag && worstTag.tagId !== bestTag?.tagId && (
                  <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-200">
                      <span className="font-semibold text-white">{worstTag.tagName}</span> vehicles 
                      need attention. Parts averaging {worstTag.avgLife}% life, 
                      {fleetAverage - worstTag.avgLife}% below fleet average.
                    </p>
                  </div>
                )}

                {metricsByTag.length > 2 && (
                  <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-200">
                      Performance gap of {bestTag.avgLife - worstTag.avgLife}% suggests 
                      opportunity for standardizing maintenance procedures.
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