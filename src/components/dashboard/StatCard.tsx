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
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}) => {
  return (
    <div className={twMerge(clsx("card p-5", className))}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <div className="mt-1 flex items-center">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {subtitle && <span className="ml-1 text-sm text-gray-500">{subtitle}</span>}
          </div>
        </div>
        
        {icon && (
          <div className="bg-primary-50 p-2 rounded-md">
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-3 flex items-center">
          <span className={clsx(
            "text-sm font-medium mr-1",
            trend.isPositive ? "text-success-600" : "text-error-600"
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;