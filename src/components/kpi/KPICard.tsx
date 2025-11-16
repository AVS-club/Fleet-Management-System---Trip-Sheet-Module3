import React from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { KPICard as KPICardType } from '../../hooks/useKPICards';
import { formatDistanceToNow } from 'date-fns';
import { createLogger } from '../../utils/logger';

const logger = createLogger('KPICard');

interface KPICardProps {
  kpi: KPICardType;
  variant?: 'compact' | 'full';
}

const KPICard: React.FC<KPICardProps> = ({ kpi, variant = 'full' }) => {
  const getThemeColors = (theme: string) => {
    const colors = {
      distance: {
        bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400'
      },
      trips: {
        bg: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-600 dark:text-green-400'
      },
      fuel: {
        bg: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20',
        border: 'border-orange-200 dark:border-orange-700',
        text: 'text-orange-700 dark:text-orange-300',
        icon: 'text-orange-600 dark:text-orange-400'
      },
      pnl: {
        bg: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-300',
        icon: 'text-purple-600 dark:text-purple-400'
      },
      utilization: {
        bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20',
        border: 'border-indigo-200 dark:border-indigo-700',
        text: 'text-indigo-700 dark:text-indigo-300',
        icon: 'text-indigo-600 dark:text-indigo-400'
      },
      mileage: {
        bg: 'from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/20',
        border: 'border-teal-200 dark:border-teal-700',
        text: 'text-teal-700 dark:text-teal-300',
        icon: 'text-teal-600 dark:text-teal-400'
      },
      vehicles: {
        bg: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20',
        border: 'border-cyan-200 dark:border-cyan-700',
        text: 'text-cyan-700 dark:text-cyan-300',
        icon: 'text-cyan-600 dark:text-cyan-400'
      },
      revenue: {
        bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20',
        border: 'border-emerald-200 dark:border-emerald-700',
        text: 'text-emerald-700 dark:text-emerald-300',
        icon: 'text-emerald-600 dark:text-emerald-400'
      },
      expenses: {
        bg: 'from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20',
        border: 'border-rose-200 dark:border-rose-700',
        text: 'text-rose-700 dark:text-rose-300',
        icon: 'text-rose-600 dark:text-rose-400'
      },
      maintenance: {
        bg: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400'
      }
    };
    return colors[theme as keyof typeof colors] || colors.distance;
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
    if (!kpi.kpi_payload.trend) return 'text-gray-500';

    // For profit/revenue, up is good, down is bad
    if (kpi.theme === 'pnl' || kpi.theme === 'revenue') {
      return kpi.kpi_payload.trend === 'up' ? 'text-green-600' : 'text-red-600';
    }

    // For expenses, down is good, up is bad
    if (kpi.theme === 'expenses') {
      return kpi.kpi_payload.trend === 'down' ? 'text-green-600' : 'text-red-600';
    }

    // For most metrics, up is good
    return kpi.kpi_payload.trend === 'up' ? 'text-green-600' :
           kpi.kpi_payload.trend === 'down' ? 'text-red-600' : 'text-gray-500';
  };

  const colors = getThemeColors(kpi.theme);

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-br ${colors.bg} p-4 rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${colors.text}`}>
            {kpi.kpi_title}
          </span>
          {kpi.kpi_payload.trend && (
            <span className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
            </span>
          )}
        </div>
        <div className={`text-2xl font-bold ${colors.text}`}>
          {kpi.kpi_value_human}
        </div>
        {kpi.kpi_payload.change && (
          <div className={`text-xs mt-1 ${getTrendColor()}`}>
            {kpi.kpi_payload.change}
          </div>
        )}
      </div>
    );
  }

  // Helper function to format multi-line values for better display
  const formatValueForDisplay = (value: string, payload: any) => {
    // Log payload for debugging (remove in production)
    if (value.includes('AMAN') || value.includes('9478')) {
      logger.debug('KPI Debug:', { title: kpi.kpi_title, value, payload });
    }

    // Remove emojis and split by them to get separate entries
    // This handles patterns like "🏅 9478: 39.8 km/l 🏅 7689: 22.7 km/l 🏅 7690: 21.8 km/l"
    const emojiPattern = /[\u{1F3C5}\u{1F947}\u{1F948}\u{1F949}\u{1F3C6}\u{26A1}\u{1F525}\u{1F3C3}]/gu;

    // Check if value contains emojis (likely a ranked list)
    if (emojiPattern.test(value)) {
      // Split by emoji and filter out empty entries
      const items = value.split(emojiPattern)
        .map(item => item.trim())
        .filter(item => item.length > 0);

      // Try to get actual values from payload if available
      if (payload.items && Array.isArray(payload.items)) {
        logger.debug('Using payload.items:', payload.items);
        return payload.items.map((itemData: any, index: number) => {
          const name = itemData.name || itemData.driver_name || itemData.vehicle_id || `Item ${index + 1}`;
          const val = itemData.value || itemData.distance || itemData.mileage || 0;
          const unit = itemData.unit || payload.unit || '';

          // Format large numbers with proper formatting
          const formattedValue = typeof val === 'number'
            ? val.toLocaleString('en-IN')
            : val;

          // Add rank medal emoji
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          return `${medal} ${name}: ${formattedValue}${unit}`;
        });
      }

      // Format the existing items
      return items.map((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        return `${medal} ${item}`;
      });
    }

    // Check if this is a "Top 3" or ranked list style value without emojis
    if (value.includes(',') && (value.includes(':') || value.match(/[A-Z.]+:\s*[#,\d]+/))) {
      // Handle patterns like "AMAN: #,###km, M.SITARAM: 6,272km, MANOJ: 6,160km"
      // Split by comma and format each item on a new line
      const items = value.split(',').map(item => item.trim());

      // Try to get actual values from payload if available
      if (payload.items && Array.isArray(payload.items)) {
        return payload.items.map((itemData: any, index: number) => {
          const name = itemData.name || itemData.driver_name || itemData.vehicle_id || `Item ${index + 1}`;
          const val = itemData.value || itemData.distance || itemData.mileage || 0;
          const unit = itemData.unit || payload.unit || '';

          // Format large numbers with proper formatting
          const formattedValue = typeof val === 'number'
            ? val.toLocaleString('en-IN')
            : val;

          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          return `${medal} ${name}: ${formattedValue}${unit}`;
        });
      }

      // If no structured data in payload, try to clean up the existing value
      return items.map((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';

        // Replace "#,###" pattern with "value hidden" or try to extract from other sources
        if (item.match(/#[,#]+/)) {
          // Extract name part and any visible numbers
          const parts = item.split(':');
          const namePart = parts[0]?.trim() || '';

          // Check if there are actual numbers after the hashes
          const valuePart = parts[1]?.trim() || '';
          const actualNumbers = valuePart.replace(/#[,#]+/g, '').trim();

          if (actualNumbers && actualNumbers.length > 0) {
            return `${medal} ${namePart}: ${actualNumbers}`;
          }

          return namePart ? `${medal} ${namePart}: (data hidden)` : `${medal} ${item}`;
        }
        return `${medal} ${item}`;
      });
    }
    return [value];
  };

  const valueLines = formatValueForDisplay(kpi.kpi_value_human, kpi.kpi_payload);
  const isMultiLine = valueLines.length > 1;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border-l-4 ${colors.border.replace('border-', 'border-l-')}`}>
      <div className={`bg-gradient-to-r ${colors.bg} p-4 border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${colors.text}`}>
              {kpi.kpi_title}
            </h3>
            {kpi.kpi_payload.period && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {kpi.kpi_payload.period}
              </p>
            )}
          </div>
          <div className={`flex items-center gap-2 ${getTrendColor()}`}>
            {getTrendIcon()}
            {kpi.kpi_payload.change && (
              <span className="text-sm font-semibold">
                {kpi.kpi_payload.change}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {isMultiLine ? (
          <div className={`space-y-1.5 mb-4`}>
            {valueLines.map((line, index) => (
              <div key={index} className={`text-xl font-bold ${colors.text} leading-tight`}>
                {line}
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-4xl font-bold ${colors.text} mb-4 break-words`}>
            {kpi.kpi_value_human}
          </div>
        )}

        {kpi.kpi_payload.comparison && (
          <div className="space-y-2">
            {Object.entries(kpi.kpi_payload.comparison).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace('_', ' ')}:
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {value} {kpi.kpi_payload.unit || ''}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(kpi.computed_at), { addSuffix: true })}
            </span>
          </div>
          <span className="capitalize">{kpi.theme}</span>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
