import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
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
}) => {
  // Calculate 12-month historical data
  const trends = useMemo(() => {
    return calculateHistoricalTrends(tasks, vehicles, 12);
  }, [tasks, vehicles]);

  // Filter trends by selected tags if applicable
  const filteredTrends = useMemo(() => {
    if (selectedTags.length === 0) return trends;
    
    return trends.map(trend => {
      const filteredByTag = trend.byTag?.filter(t => selectedTags.includes(t.tagId));
      return {
        ...trend,
        byTag: filteredByTag
      };
    });
  }, [trends, selectedTags]);

  // Calculate trend indicators
  const trendStats = useMemo(() => {
    if (filteredTrends.length < 2) return null;
    
    const recent = filteredTrends.slice(-3);
    const previous = filteredTrends.slice(-6, -3);
    
    const recentAvgCost = recent.reduce((sum, t) => sum + t.totalCost, 0) / recent.length;
    const previousAvgCost = previous.reduce((sum, t) => sum + t.totalCost, 0) / previous.length;
    const costTrend = ((recentAvgCost - previousAvgCost) / previousAvgCost) * 100;
    
    const recentAvgReplacements = recent.reduce((sum, t) => sum + t.replacementCount, 0) / recent.length;
    const previousAvgReplacements = previous.reduce((sum, t) => sum + t.replacementCount, 0) / previous.length;
    const replacementTrend = ((recentAvgReplacements - previousAvgReplacements) / previousAvgReplacements) * 100;
    
    return {
      costTrend: Math.round(costTrend),
      replacementTrend: Math.round(replacementTrend),
      recentAvgCost: Math.round(recentAvgCost),
      recentAvgReplacements: Math.round(recentAvgReplacements)
    };
  }, [filteredTrends]);

  // Get max values for scaling
  const maxCost = filteredTrends.length > 0 ? Math.max(...filteredTrends.map(t => t.totalCost)) : 1;
  const maxReplacements = filteredTrends.length > 0 ? Math.max(...filteredTrends.map(t => t.replacementCount)) : 1;

  if (filteredTrends.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data</h3>
        <p className="text-gray-500">
          Maintenance history will appear here once you start recording tasks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Summary Cards */}
      {trendStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Cost Trend</span>
              {trendStats.costTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {trendStats.costTrend > 0 ? '+' : ''}{trendStats.costTrend}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Last 3 months</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Monthly Cost</span>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ₹{trendStats.recentAvgCost.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-500 mt-1">Recent average</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Replacement Trend</span>
              {trendStats.replacementTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {trendStats.replacementTrend > 0 ? '+' : ''}{trendStats.replacementTrend}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Last 3 months</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Replacements</span>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {trendStats.recentAvgReplacements}
            </div>
            <div className="text-xs text-gray-500 mt-1">Per month</div>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">12-Month Trend Analysis</h3>
        
        {/* Cost trend */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Monthly Maintenance Cost</span>
            <span className="text-sm text-gray-500">₹{maxCost.toLocaleString('en-IN')}</span>
          </div>
          <div className="space-y-2">
            {filteredTrends.map((trend, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 flex-shrink-0">{trend.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                    style={{ width: `${(trend.totalCost / maxCost) * 100}%` }}
                  >
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                      ₹{trend.totalCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Replacement count trend */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Monthly Part Replacements</span>
            <span className="text-sm text-gray-500">{maxReplacements} parts</span>
          </div>
          <div className="space-y-2">
            {filteredTrends.map((trend, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 flex-shrink-0">{trend.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all"
                    style={{ width: `${(trend.replacementCount / maxReplacements) * 100}%` }}
                  >
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                      {trend.replacementCount} parts
                    </span>
                  </div>
                </div>
                {trend.criticalIssues > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs font-medium">{trend.criticalIssues}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tag-based breakdown if available */}
        {selectedTags.length === 0 && filteredTrends[0]?.byTag && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">By Vehicle Tag (Current Month)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredTrends[filteredTrends.length - 1]?.byTag?.map((tagData, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">{tagData.tagName}</div>
                  <div className="text-lg font-bold text-gray-900">{tagData.count}</div>
                  <div className="text-xs text-gray-500">replacements</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Pattern Analysis</h3>
        <div className="space-y-3">
          {trendStats && (
            <>
              {trendStats.costTrend > 15 && (
                <div className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                  <TrendingUp className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Maintenance costs have increased by <strong>{trendStats.costTrend}%</strong> over 
                    the last 3 months. Consider reviewing maintenance schedules and part suppliers.
                  </p>
                </div>
              )}
              
              {trendStats.replacementTrend > 20 && (
                <div className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Part replacement frequency is up by <strong>{trendStats.replacementTrend}%</strong>. 
                    This may indicate increased vehicle usage or aging fleet components.
                  </p>
                </div>
              )}
              
              {trendStats.costTrend < -10 && trendStats.replacementTrend < 0 && (
                <div className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                  <TrendingDown className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    Great news! Both costs and replacement frequency are trending downward. 
                    Your preventive maintenance strategy appears to be working effectively.
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
