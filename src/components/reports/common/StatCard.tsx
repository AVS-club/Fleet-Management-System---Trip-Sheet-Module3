import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  className = ""
}) => {
  return (
    <div className={`stat-card bg-gray-50 p-4 rounded-lg border-l-4 border-green-500 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-2xl text-green-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
