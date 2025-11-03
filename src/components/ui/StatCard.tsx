import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface StatTrend {
  value: number;
  label: string;
  isPositive?: boolean;
  dateRangeTooltip?: string; // Tooltip showing the date ranges being compared
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: StatTrend;
  className?: string;
  warning?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  warning = false,
  onClick,
}) => {
  const trendPositive = trend ? (trend.isPositive ?? trend.value >= 0) : undefined;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={cn(
        "card p-3 sm:p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all",
        warning && "border-l-4 border-warning-500 dark:border-warning-600",
        className,
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    > 
      <div className="flex justify-between items-start gap-2">
        <div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-sans font-medium">{title}</h3>
          <div className="mt-1 flex flex-wrap items-center">
            <span className="text-xl sm:text-2xl font-display font-bold tracking-tight-plus text-gray-900 dark:text-white">{value}</span>
            {subtitle && (
              <span className="ml-1 text-xs sm:text-sm font-sans text-gray-500 dark:text-gray-400">{subtitle}</span>
            )}
          </div>
        </div>
        {icon && (
          <div className="bg-primary-50 dark:bg-primary-900/30 p-1 sm:p-2 rounded-md flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 sm:mt-3 flex items-center relative">
          <div
            className="flex items-center cursor-help"
            onMouseEnter={() => trend.dateRangeTooltip && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={(e) => {
              // Mobile tap support - toggle tooltip on tap
              if (trend.dateRangeTooltip) {
                e.stopPropagation(); // Prevent card click
                setShowTooltip(!showTooltip);
              }
            }}
          >
            <span
              className={cn(
                "text-xs sm:text-sm font-sans font-medium mr-1",
                trendPositive ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"
              )}
            >
              {trendPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs sm:text-xs font-sans text-gray-500 dark:text-gray-400">{trend.label}</span>
          </div>

          {/* Tooltip - shown on hover (desktop) or tap (mobile) */}
          {trend.dateRangeTooltip && showTooltip && (
            <div className="absolute bottom-full left-0 mb-2 z-50 w-max max-w-xs">
              <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-sans rounded-lg px-3 py-2 shadow-lg">
                <div className="whitespace-pre-line">{trend.dateRangeTooltip}</div>
                {/* Arrow */}
                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
