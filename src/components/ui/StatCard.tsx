import React from 'react';
import { cn } from '../../utils/cn';

interface StatTrend {
  value: number;
  label: string;
  isPositive?: boolean;
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
        <div className="mt-2 sm:mt-3 flex items-center">
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
      )}
    </div>
  );
};

export default StatCard;
