import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronDown, ChevronUp, Heart, Share2, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';
import { KPICard as KPICardType } from '../../hooks/useKPICards';
import { formatDistanceToNow } from 'date-fns';
import { 
  generateKPIInsight, 
  getKPICategoryInfo, 
  getKPIUrgency 
} from '../../utils/kpiInsights';

interface EnhancedKPICardProps {
  kpi: KPICardType;
  variant?: 'compact' | 'full';
  index?: number;
  showInsights?: boolean;
}

const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({ 
  kpi, 
  variant = 'full',
  index = 0,
  showInsights = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const categoryInfo = getKPICategoryInfo(kpi.kpi_key);
  const urgency = getKPIUrgency(kpi);
  const aiInsight = generateKPIInsight(kpi);

  const getThemeColors = (theme: string) => {
    const colors = {
      distance: {
        bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-200/50'
      },
      trips: {
        bg: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-600 dark:text-green-400',
        glow: 'shadow-green-200/50'
      },
      success: {
        bg: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-600 dark:text-green-400',
        glow: 'shadow-green-200/50'
      },
      primary: {
        bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-200/50'
      },
      info: {
        bg: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20',
        border: 'border-cyan-200 dark:border-cyan-700',
        text: 'text-cyan-700 dark:text-cyan-300',
        icon: 'text-cyan-600 dark:text-cyan-400',
        glow: 'shadow-cyan-200/50'
      },
      warning: {
        bg: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-200/50'
      },
      danger: {
        bg: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-700 dark:text-red-300',
        icon: 'text-red-600 dark:text-red-400',
        glow: 'shadow-red-200/50'
      },
      default: {
        bg: 'from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-700 dark:text-gray-300',
        icon: 'text-gray-600 dark:text-gray-400',
        glow: 'shadow-gray-200/50'
      }
    };
    return colors[theme as keyof typeof colors] || colors.default;
  };

  const getTrendIcon = () => {
    if (!kpi.kpi_payload.trend) return <Minus className="h-4 w-4" />;

    switch (kpi.kpi_payload.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    const changePercent = kpi.kpi_payload.change_percent || 0;
    
    // For revenue/profit, down is bad
    if (kpi.kpi_key.includes('revenue') || kpi.kpi_key.includes('profit')) {
      if (changePercent < -50) return 'text-red-600 dark:text-red-400';
      if (changePercent < -20) return 'text-orange-600 dark:text-orange-400';
      if (changePercent > 20) return 'text-green-600 dark:text-green-400';
    }
    
    return 'text-gray-500 dark:text-gray-400';
  };

  const getUrgencyIndicator = () => {
    switch (urgency) {
      case 'critical':
        return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-100' };
      case 'warning':
        return { icon: <Info className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'success':
        return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-100' };
      default:
        return null;
    }
  };

  const colors = getThemeColors(kpi.theme);
  const urgencyIndicator = getUrgencyIndicator();

  const handleShare = () => {
    const text = `${kpi.kpi_title}: ${kpi.kpi_value_human}`;
    if (navigator.share) {
      navigator.share({ title: kpi.kpi_title, text });
    } else {
      navigator.clipboard.writeText(text);
      // Could add a toast notification here
    }
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl 
      transition-all duration-300 overflow-hidden border-l-4
      ${colors.border.replace('border-', 'border-l-')}
      ${isExpanded ? 'ring-2 ring-offset-2 ' + colors.border : ''}
    `}>
      {/* Header with category badge and urgency */}
      <div className={`bg-gradient-to-r ${colors.bg} px-4 py-3 border-b ${colors.border}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${categoryInfo.badgeColor}`}>
                <span>{categoryInfo.icon}</span>
                <span>{categoryInfo.badge}</span>
              </span>
              {urgencyIndicator && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${urgencyIndicator.bg} ${urgencyIndicator.color}`}>
                  {urgencyIndicator.icon}
                  <span className="capitalize">{urgency}</span>
                </span>
              )}
            </div>
            
            {/* Title */}
            <h3 className={`text-lg font-semibold ${colors.text} truncate`}>
              {kpi.kpi_title}
            </h3>
            {kpi.kpi_payload.period && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {kpi.kpi_payload.period}
              </p>
            )}
          </div>

          {/* Trend Indicator */}
          {kpi.kpi_payload.change_percent !== undefined && (
            <div className={`flex items-center gap-1.5 ${getTrendColor()} flex-shrink-0`}>
              {getTrendIcon()}
              <span className="text-sm font-bold whitespace-nowrap">
                {kpi.kpi_payload.change_percent > 0 ? '+' : ''}
                {kpi.kpi_payload.change_percent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Value Display */}
        <div className={`text-3xl sm:text-4xl font-bold ${colors.text} mb-3 break-words`}>
          {kpi.kpi_value_human}
        </div>

        {/* Comparison Details */}
        {(kpi.kpi_payload.current_value !== undefined || kpi.kpi_payload.previous_value !== undefined) && (
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            {kpi.kpi_payload.current_value !== undefined && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Current</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {kpi.kpi_payload.current_value.toLocaleString()}
                </div>
              </div>
            )}
            {kpi.kpi_payload.previous_value !== undefined && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Previous</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {kpi.kpi_payload.previous_value.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Insight */}
        {showInsights && aiInsight && (
          <div className="mb-4">
            <div className={`
              p-3 rounded-lg border-l-4
              ${urgency === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-400' : 
                urgency === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400' :
                urgency === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-400' :
                'bg-blue-50 dark:bg-blue-900/20 border-blue-400'}
            `}>
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {aiInsight}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        {kpi.kpi_payload.comparison && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span>View Details</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {Object.entries(kpi.kpi_payload.comparison).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {value} {kpi.kpi_payload.unit || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Social Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(kpi.computed_at), { addSuffix: true })}
            </span>
          </div>

          {/* Social Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-full transition-colors ${
                isLiked 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}
              title="Like this metric"
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
              title="Share this metric"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedKPICard;

