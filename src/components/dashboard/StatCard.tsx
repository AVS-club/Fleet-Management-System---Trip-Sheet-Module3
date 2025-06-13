import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
  warning?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  warning = false,
}) => {
  return (
    <div className={twMerge(clsx(
      "card p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all", 
      warning && "border-l-4 border-warning-500 dark:border-warning-600", 
      className
    ))}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
          <div className="mt-1 flex items-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
            {subtitle && <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</span>}
          </div>
        </div>
        
        {icon && (
          <div className="bg-primary-50 dark:bg-primary-900/30 p-2 rounded-md">
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-3 flex items-center">
          <span className={clsx(
            "text-sm font-medium mr-1",
            trend.isPositive ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;