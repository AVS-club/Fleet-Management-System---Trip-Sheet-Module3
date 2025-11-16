import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, IndianRupee, AlertTriangle, Activity, BarChart2 } from 'lucide-react';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { calculateHistoricalTrends } from '@/utils/partsAnalytics';

interface HistoricalTrendsProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  selectedTags: string[];
}

const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({
  tasks,
  vehicles,
  selectedTags
}: HistoricalTrendsProps) => {
  const trends = useMemo(() => {
    return calculateHistoricalTrends(tasks, vehicles, 12);
  }, [tasks, vehicles]);

  const trendStats = useMemo(() => {
    if (trends.length < 2) return null;
    
    const recent = trends.slice(-3);
    const previous = trends.slice(-6, -3);
    
    const recentAvgCost = recent.reduce((sum, t) => sum + t.totalCost, 0) / recent.length;
    const previousAvgCost = previous.length > 0 
      ? previous.reduce((sum, t) => sum + t.totalCost, 0) / previous.length 
      : recentAvgCost;
    const costTrend = previousAvgCost > 0 
      ? ((recentAvgCost - previousAvgCost) / previousAvgCost) * 100 
      : 0;
    
    const recentAvgReplacements = recent.reduce((sum, t) => sum + t.replacementCount, 0) / recent.length;
    const previousAvgReplacements = previous.length > 0
      ? previous.reduce((sum, t) => sum + t.replacementCount, 0) / previous.length
      : recentAvgReplacements;
    const replacementTrend = previousAvgReplacements > 0
      ? ((recentAvgReplacements - previousAvgReplacements) / previousAvgReplacements) * 100
      : 0;
    
    return {
      costTrend: Math.round(costTrend),
      replacementTrend: Math.round(replacementTrend),
      recentAvgCost: Math.round(recentAvgCost),
      recentAvgReplacements: Math.round(recentAvgReplacements)
    };
  }, [trends]);

  const maxCost = trends.length > 0 ? Math.max(...trends.map(t => t.totalCost), 1) : 1;
  const maxReplacements = trends.length > 0 ? Math.max(...trends.map(t => t.replacementCount), 1) : 1;

  if (trends.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Calendar className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Historical Data</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Maintenance history will appear here once you start recording tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats - Clean White Cards */}
      {trendStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Cost Trend - Bright if increasing */}
          <div className={`rounded-xl shadow-sm border p-3 sm:p-4 ${
            trendStats.costTrend > 15 
              ? 'bg-red-50 border-red-200' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Cost Trend</span>
              {trendStats.costTrend > 0 ? (
                <TrendingUp className={`h-4 w-4 ${trendStats.costTrend > 15 ? 'text-red-500' : 'text-gray-500'}`} />
              ) : (
                <TrendingDown className="h-4 w-4 text-teal-600" />
              )}
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${
              trendStats.costTrend > 15 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {trendStats.costTrend > 0 ? '+' : ''}{trendStats.costTrend}%
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Last 3 months</div>
          </div>

          {/* Avg Cost - Neutral */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Avg Cost</span>
              <IndianRupee className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              ₹{Math.round(trendStats.recentAvgCost / 1000)}K
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Per month</div>
          </div>

          {/* Replacement Trend - Bright if increasing */}
          <div className={`rounded-xl shadow-sm border p-3 sm:p-4 ${
            trendStats.replacementTrend > 20 
              ? 'bg-amber-50 border-amber-200' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Parts Trend</span>
              {trendStats.replacementTrend > 0 ? (
                <TrendingUp className={`h-4 w-4 ${trendStats.replacementTrend > 20 ? 'text-amber-500' : 'text-gray-500'}`} />
              ) : (
                <TrendingDown className="h-4 w-4 text-teal-600" />
              )}
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${
              trendStats.replacementTrend > 20 ? 'text-amber-600' : 'text-gray-900'
            }`}>
              {trendStats.replacementTrend > 0 ? '+' : ''}{trendStats.replacementTrend}%
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Last 3 months</div>
          </div>

          {/* Avg Replacements - Neutral */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Avg Parts</span>
              <Activity className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {trendStats.recentAvgReplacements}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Per month</div>
          </div>
        </div>
      )}

      {/* Timeline Charts - White Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          12-Month Analysis
        </h3>
        
        {/* Cost Trend Chart - Brand color bars */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Maintenance Cost</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              ₹{Math.round(maxCost / 1000)}K max
            </span>
          </div>
          <div className="space-y-2">
            {trends.map((trend, idx) => (
              <div key={idx} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 w-12 sm:w-16 flex-shrink-0 text-right">
                  {trend.month}
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 sm:h-8 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(trend.totalCost / maxCost) * 100}%`,
                      background: 'linear-gradient(90deg, #0aa073 0%, #0db885 100%)'
                    }}
                  >
                    {trend.totalCost > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-medium text-white">
                        ₹{Math.round(trend.totalCost / 1000)}K
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Replacement Count Chart - Neutral gray bars */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Part Replacements</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{maxReplacements} max</span>
          </div>
          <div className="space-y-2">
            {trends.map((trend, idx) => (
              <div key={idx} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 w-12 sm:w-16 flex-shrink-0 text-right">
                  {trend.month}
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 sm:h-8 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(trend.replacementCount / maxReplacements) * 100}%`,
                      background: 'linear-gradient(90deg, #737373 0%, #a3a3a3 100%)'
                    }}
                  >
                    {trend.replacementCount > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-medium text-white">
                        {trend.replacementCount}
                      </span>
                    )}
                  </div>
                </div>
                {/* Critical issues - bright red indicator */}
                {trend.criticalIssues > 0 && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 flex-shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px] sm:text-xs font-medium">{trend.criticalIssues}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tag-based Breakdown - With tag color strips */}
        {selectedTags.length === 0 && trends[trends.length - 1]?.byTag && 
         trends[trends.length - 1].byTag!.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Current Month by Tag
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {trends[trends.length - 1]?.byTag?.map((tagData, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 border-l-4"
                  style={{ borderLeftColor: tagData.tagColor }}
                >
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1 truncate" title={tagData.tagName}>
                    {tagData.tagName}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                    {tagData.count}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    ₹{Math.round(tagData.cost / 1000)}K
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pattern Analysis - Dark neutral with bright highlights */}
      <div className="rounded-xl shadow-lg p-4 sm:p-6 text-white dark:text-gray-100"
           style={{ background: 'linear-gradient(135deg, #404040 0%, #262626 100%)' }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4">Pattern Analysis</h3>
        <div className="space-y-3">
          {trendStats && (
            <>
              {/* Critical trend - bright red */}
              {trendStats.costTrend > 15 && (
                <div className="flex items-start gap-3 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                  <TrendingUp className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-200">
                    Maintenance costs increased by <strong className="text-red-300">{trendStats.costTrend}%</strong> over 
                    the last 3 months. Review schedules and suppliers.
                  </p>
                </div>
              )}
              
              {/* Warning trend - bright amber */}
              {trendStats.replacementTrend > 20 && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-200">
                    Part replacement frequency up <strong className="text-amber-300">{trendStats.replacementTrend}%</strong>. 
                    May indicate increased usage or aging components.
                  </p>
                </div>
              )}
              
              {/* Good trend - brand green */}
              {trendStats.costTrend < -10 && trendStats.replacementTrend < 0 && (
                <div className="flex items-start gap-3 p-3 bg-teal-500/20 rounded-lg border border-teal-500/30">
                  <TrendingDown className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-200">
                    Great news! Costs and replacements trending downward. 
                    Your preventive maintenance strategy is working.
                  </p>
                </div>
              )}

              {/* Stable - neutral */}
              {Math.abs(trendStats.costTrend) < 10 && Math.abs(trendStats.replacementTrend) < 10 && (
                <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                  <Activity className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-200">
                    Maintenance patterns stable with minimal fluctuation. 
                    Continue current practices.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricalTrends;