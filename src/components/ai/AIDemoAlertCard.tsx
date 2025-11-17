import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, Award, AlertCircle, MapPin, Users, Store, FileText, IndianRupee, Calendar, BarChart3 } from 'lucide-react';
import { DemoAIInsight } from '@/constants/demoAiInsights';

interface AIDemoAlertCardProps {
  insight: DemoAIInsight;
  onAction?: (insightId: string) => void;
}

export default function AIDemoAlertCard({ insight, onAction }: AIDemoAlertCardProps) {

  const renderComparison = () => {
    if (insight.insights?.type !== 'comparison' || !insight.insights.comparison) return null;
    const { better, worse, reason } = insight.insights.comparison;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Best Performer</span>
            </div>
            <p className="text-sm font-bold text-green-900 dark:text-green-100">{better}</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">Needs Review</span>
            </div>
            <p className="text-sm font-bold text-red-900 dark:text-red-100">{worse}</p>
          </div>
        </div>
        {reason && (
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">{reason}</p>
        )}
      </div>
    );
  };

  const renderRanking = () => {
    if (insight.insights?.type !== 'ranking' || !insight.insights.ranking) return null;
    const { top, bottom } = insight.insights.ranking;
    
    return (
      <div className="mt-4 space-y-3">
        {top.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Top Performers</span>
            </div>
            <div className="space-y-1">
              {top.map((name, idx) => (
                <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">{idx + 1}. {name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {bottom.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase">Needs Attention</span>
            </div>
            <div className="space-y-1">
              {bottom.map((name, idx) => (
                <div key={idx} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">{name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVariation = () => {
    if (insight.insights?.type !== 'variation' || !insight.insights.variation) return null;
    const { previous, current, difference, route, vehicleNumber } = insight.insights.variation;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-2">Route</p>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{route}</p>
          {vehicleNumber && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Vehicle: {vehicleNumber}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Previous</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{previous}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase mb-1">Current</p>
            <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{current}</p>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">{difference}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderItems = () => {
    if (!insight.insights?.items || insight.insights.items.length === 0) return null;
    
    return (
      <div className="mt-4 space-y-2">
        {insight.insights.items.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-2.5 border ${
              item.highlight
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${
                  item.highlight
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {item.label}
                </span>
                {item.vehicleNumber && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Vehicle: {item.vehicleNumber}
                  </span>
                )}
              </div>
              {item.value && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  item.highlight
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {item.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVendor = () => {
    if (insight.insights?.type !== 'vendor' || !insight.insights.vendor) return null;
    const { better, worse, item, reason } = insight.insights.vendor;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-2">Item</p>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{item}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Better Deal</span>
            </div>
            <p className="text-sm font-bold text-green-900 dark:text-green-100">{better.name}</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">{better.location}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Vehicle: {better.vehicleNumber}</p>
            <p className="text-xs font-semibold text-green-800 dark:text-green-200 mt-2">{better.savings}</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">Previous Purchase</span>
            </div>
            <p className="text-sm font-bold text-red-900 dark:text-red-100">{worse.name}</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{worse.location}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Vehicle: {worse.vehicleNumber}</p>
            <p className="text-xs font-semibold text-red-800 dark:text-red-200 mt-2">{worse.timeAgo}</p>
          </div>
        </div>
        {reason && (
          <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
            {reason}
          </p>
        )}
      </div>
    );
  };

  const renderDocument = () => {
    if (insight.insights?.type !== 'document' || !insight.insights.document) return null;
    const { estimatedCost, period, breakdown } = insight.insights.document;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Estimated Cost</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{estimatedCost}</p>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-purple-200 dark:border-purple-800">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{period}</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Breakdown</p>
          <div className="space-y-2">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.type}</span>
                </div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                  {item.count} {item.count === 1 ? 'item' : 'items'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGrowth = () => {
    if (insight.insights?.type !== 'growth' || !insight.insights.growth) return null;
    const { period, previousPeriod, metrics, remark } = insight.insights.growth;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Current Period</p>
                <p className="text-sm font-bold text-green-900 dark:text-green-100">{period}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">vs</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{previousPeriod}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{metric.label}</span>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <p className={`text-xl font-bold ${
                  metric.trend === 'up' 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        {remark && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-l-4 border-blue-500 dark:border-blue-400">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{remark}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 border-purple-500 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
            <span className="text-2xl">{insight.icon}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                {insight.title}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                AI Insight
              </span>
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {insight.summary}
            </p>

            {/* Tags */}
            {insight.tags && insight.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {insight.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Insights Content */}
            {insight.insights?.type === 'comparison' && renderComparison()}
            {insight.insights?.type === 'ranking' && renderRanking()}
            {insight.insights?.type === 'variation' && renderVariation()}
            {insight.insights?.type === 'vendor' && renderVendor()}
            {insight.insights?.type === 'document' && renderDocument()}
            {insight.insights?.type === 'growth' && renderGrowth()}
            {insight.insights?.items && !insight.insights.comparison && !insight.insights.ranking && !insight.insights.variation && !insight.insights.vendor && !insight.insights.document && !insight.insights.growth && renderItems()}

            {/* Time stamp */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AVS AI Insights</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

