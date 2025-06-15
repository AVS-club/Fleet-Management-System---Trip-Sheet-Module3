import React from 'react';
import { BarChart } from 'lucide-react';
import { MAINTENANCE_CATEGORIES } from '../../types/maintenance';

interface TopMaintenanceCategoriesChartProps {
  data: Array<{
    category: string;
    cost: number;
  }>;
}

const TopMaintenanceCategoriesChart: React.FC<TopMaintenanceCategoriesChartProps> = ({ data }) => {
  // Sort data by cost (highest first)
  const sortedData = [...data].sort((a, b) => b.cost - a.cost);
  
  // Find the maximum cost for proportional bar width
  const maxCost = sortedData.length > 0 ? sortedData[0].cost : 0;
  
  return (
    <div>
      <h3 className="text-base font-medium text-gray-900 mb-4">Top Maintenance Categories</h3>
      
      <div className="max-h-[300px] overflow-y-auto pr-2">
        {sortedData.length > 0 ? (
          <div className="space-y-3">
            {sortedData.map((item, index) => {
              // Get category color from MAINTENANCE_CATEGORIES or use a default
              const categoryInfo = MAINTENANCE_CATEGORIES[item.category as keyof typeof MAINTENANCE_CATEGORIES];
              const barColor = categoryInfo?.color || '#6B7280'; // Default to gray if category not found
              
              // Calculate bar width as percentage of max cost
              const barWidth = maxCost > 0 ? (item.cost / maxCost) * 100 : 0;
              
              return (
                <div key={index} className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[70%]">
                      {item.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{item.cost.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${barWidth}%`,
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <BarChart className="h-8 w-8 mb-2 text-gray-400" />
            <p>No maintenance category data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopMaintenanceCategoriesChart;