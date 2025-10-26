import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  event: any;
}

export default function KPICard({ event }: KPICardProps) {
  const payload = event.entity_json;
  
  const getThemeColor = () => {
    switch (payload?.theme) {
      case 'distance': return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'fuel': return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
      case 'mileage': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'pnl': return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
      case 'utilization': return 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getThemeColor()}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{event.title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{event.description}</p>
          {payload?.trend && (
            <div className="flex items-center mt-2">
              {payload.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">vs last {payload.period}</span>
            </div>
          )}
          {payload?.period && !payload?.trend && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Period: {payload.period}</p>
          )}
        </div>
        {payload?.spark && (
          <div className="w-24 h-12">
            {/* Add a sparkline chart library like recharts here */}
          </div>
        )}
      </div>
    </div>
  );
}
