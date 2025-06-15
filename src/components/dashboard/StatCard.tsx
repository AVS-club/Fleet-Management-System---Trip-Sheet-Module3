import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HelpCircle } from 'lucide-react';

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
  tooltip?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  warning = false,
  tooltip,
}) => {
  return (
    <div className={twMerge(clsx(
      "card p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all shadow-sm hover:shadow-md", 
      warning && "border-l-4 border-warning-500 dark:border-warning-600", 
      className
    ))}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <h3 className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</h3>
            {tooltip && (
              <div className="relative group ml-1">
                <button className="text-gray-400 hover:text-gray-600">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  {tooltip}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center">
            <span className="text-xl font-bold text-gray-900 dark:text-white">{value}</span>
            {subtitle && <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>}
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
            "text-xs font-medium mr-1",
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