import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Sparkles } from 'lucide-react';
import { KPICard as KPICardType } from '../../hooks/useKPICards';
import { formatDistanceToNow } from 'date-fns';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AnimatedKPICard');

interface AnimatedKPICardProps {
  kpi: KPICardType;
  variant?: 'compact' | 'full';
  index?: number;
  isNewBatch?: boolean;
  staggerDelay?: number;
}

const AnimatedKPICard: React.FC<AnimatedKPICardProps> = ({ 
  kpi, 
  variant = 'full',
  index = 0,
  isNewBatch = false,
  staggerDelay = 150
}) => {
  const [isVisible, setIsVisible] = useState(!isNewBatch);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Staggered appearance for new KPI batches
  useEffect(() => {
    if (isNewBatch) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
        
        // Remove animation class after animation completes
        setTimeout(() => {
          setIsAnimating(false);
        }, 600);
      }, index * staggerDelay);

      return () => clearTimeout(timer);
    }
  }, [isNewBatch, index, staggerDelay]);

  // Intersection observer for scroll-triggered animations
  useEffect(() => {
    if (!cardRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
            setIsAnimating(true);
            setTimeout(() => {
              setIsAnimating(false);
            }, 600);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observerRef.current.observe(cardRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isVisible]);

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
      fuel: {
        bg: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20',
        border: 'border-orange-200 dark:border-orange-700',
        text: 'text-orange-700 dark:text-orange-300',
        icon: 'text-orange-600 dark:text-orange-400',
        glow: 'shadow-orange-200/50'
      },
      pnl: {
        bg: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-300',
        icon: 'text-purple-600 dark:text-purple-400',
        glow: 'shadow-purple-200/50'
      },
      utilization: {
        bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20',
        border: 'border-indigo-200 dark:border-indigo-700',
        text: 'text-indigo-700 dark:text-indigo-300',
        icon: 'text-indigo-600 dark:text-indigo-400',
        glow: 'shadow-indigo-200/50'
      },
      mileage: {
        bg: 'from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/20',
        border: 'border-teal-200 dark:border-teal-700',
        text: 'text-teal-700 dark:text-teal-300',
        icon: 'text-teal-600 dark:text-teal-400',
        glow: 'shadow-teal-200/50'
      },
      vehicles: {
        bg: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20',
        border: 'border-cyan-200 dark:border-cyan-700',
        text: 'text-cyan-700 dark:text-cyan-300',
        icon: 'text-cyan-600 dark:text-cyan-400',
        glow: 'shadow-cyan-200/50'
      },
      revenue: {
        bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20',
        border: 'border-emerald-200 dark:border-emerald-700',
        text: 'text-emerald-700 dark:text-emerald-300',
        icon: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-200/50'
      },
      expenses: {
        bg: 'from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20',
        border: 'border-rose-200 dark:border-rose-700',
        text: 'text-rose-700 dark:text-rose-300',
        icon: 'text-rose-600 dark:text-rose-400',
        glow: 'shadow-rose-200/50'
      },
      maintenance: {
        bg: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-200/50'
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

  const formatValueForDisplay = (value: string, payload: any) => {
    // Handle emoji-based ranked lists
    const emojiPattern = /[\u{1F3C5}\u{1F947}\u{1F948}\u{1F949}\u{1F3C6}\u{26A1}\u{1F525}\u{1F3C3}]/gu;
    
    if (emojiPattern.test(value)) {
      const items = value.split(emojiPattern)
        .map(item => item.trim())
        .filter(item => item.length > 0);

      if (payload.items && Array.isArray(payload.items)) {
        return payload.items.map((itemData: any, idx: number) => {
          const name = itemData.name || itemData.driver_name || itemData.vehicle_id || `Item ${idx + 1}`;
          const val = itemData.value || itemData.distance || itemData.mileage || 0;
          const unit = itemData.unit || payload.unit || '';
          
          const formattedValue = typeof val === 'number'
            ? val.toLocaleString('en-IN')
            : val;

          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
          return `${medal} ${name}: ${formattedValue}${unit}`;
        });
      }

      return items.map((item, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        return `${medal} ${item}`;
      });
    }

    // Handle comma-separated lists
    if (value.includes(',') && (value.includes(':') || value.match(/[A-Z.]+:\s*[#,\d]+/))) {
      const items = value.split(',').map(item => item.trim());
      
      if (payload.items && Array.isArray(payload.items)) {
        return payload.items.map((itemData: any, idx: number) => {
          const name = itemData.name || itemData.driver_name || itemData.vehicle_id || `Item ${idx + 1}`;
          const val = itemData.value || itemData.distance || itemData.mileage || 0;
          const unit = itemData.unit || payload.unit || '';
          
          const formattedValue = typeof val === 'number'
            ? val.toLocaleString('en-IN')
            : val;

          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
          return `${medal} ${name}: ${formattedValue}${unit}`;
        });
      }

      return items.map((item, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        if (item.match(/#[,#]+/)) {
          const parts = item.split(':');
          const namePart = parts[0]?.trim() || '';
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

  const colors = getThemeColors(kpi.theme);
  const valueLines = formatValueForDisplay(kpi.kpi_value_human, kpi.kpi_payload);
  const isMultiLine = valueLines.length > 1;

  // Check if this KPI was recently updated (within last 15 minutes)
  const isRecentlyUpdated = () => {
    const updateTime = new Date(kpi.computed_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - updateTime.getTime()) / 60000;
    return diffMinutes < 15;
  };

  const cardClasses = `
    bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl 
    transition-all overflow-hidden border-l-4
    ${colors.border.replace('border-', 'border-l-')}
    ${!isVisible ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
    ${isAnimating ? 'animate-slideInUp' : ''}
    ${isRecentlyUpdated() && isNewBatch ? `shadow-lg ${colors.glow}` : ''}
  `;

  if (variant === 'compact') {
    return (
      <div 
        ref={cardRef}
        className={`
          bg-gradient-to-br ${colors.bg} p-4 rounded-xl border ${colors.border} 
          shadow-sm hover:shadow-md transition-all
          ${!isVisible ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          ${isAnimating ? 'animate-fadeInScale' : ''}
        `}
      >
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

  return (
    <div ref={cardRef} className={cardClasses}>
      {/* New Badge for recently updated KPIs */}
      {isRecentlyUpdated() && isNewBatch && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-semibold rounded-full animate-pulse">
            <Sparkles className="w-3 h-3" />
            NEW
          </span>
        </div>
      )}

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
            {valueLines.map((line, idx) => (
              <div 
                key={idx} 
                className={`
                  text-xl font-bold ${colors.text} leading-tight
                  ${isAnimating ? 'animate-fadeInStagger' : ''}
                `}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : (
          <div className={`
            text-4xl font-bold ${colors.text} mb-4 break-words
            ${isAnimating ? 'animate-numberCount' : ''}
          `}>
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

export default AnimatedKPICard;
