import React from 'react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
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
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
          <div className="text-2xl font-semibold mt-1">{value}</div>
          {subtitle && <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{subtitle}</div>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm font-medium ${trend.value >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                {trend.value}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
      </div>
    </div>
  );
};

export default StatCard;