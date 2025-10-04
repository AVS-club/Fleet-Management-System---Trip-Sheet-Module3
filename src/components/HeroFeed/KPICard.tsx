import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  event: any;
}

export default function KPICard({ event }: KPICardProps) {
  const payload = event.entity_json;
  
  const getThemeColor = () => {
    switch (payload?.theme) {
      case 'distance': return 'bg-blue-50 border-blue-200';
      case 'fuel': return 'bg-amber-50 border-amber-200';
      case 'mileage': return 'bg-green-50 border-green-200';
      case 'pnl': return 'bg-purple-50 border-purple-200';
      case 'utilization': return 'bg-teal-50 border-teal-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getThemeColor()}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600">{event.title}</p>
          <p className="text-2xl font-bold mt-1">{event.description}</p>
          {payload?.trend && (
            <div className="flex items-center mt-2">
              {payload.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className="text-sm text-gray-600">vs last {payload.period}</span>
            </div>
          )}
          {payload?.period && !payload?.trend && (
            <p className="text-xs text-gray-500 mt-2">Period: {payload.period}</p>
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
