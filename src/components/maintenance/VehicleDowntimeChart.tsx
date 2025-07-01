import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

interface VehicleDowntimeChartProps {
  vehicleDowntime: { vehicleId: string; registration: string; downtime: number }[];
}

// Chart colors based on downtime severity
const getDowntimeColor = (downtime: number) => {
  if (downtime >= 7) return '#EF4444'; // High downtime - red
  if (downtime >= 3) return '#F59E0B'; // Medium downtime - amber
  return '#10B981'; // Low downtime - green
};

const VehicleDowntimeChart: React.FC<VehicleDowntimeChartProps> = ({
  vehicleDowntime
}) => {
  // Sort vehicles by downtime (highest first)
  const sortedDowntime = [...vehicleDowntime].sort((a, b) => b.downtime - a.downtime);
  
  // Limit to top 10 vehicles for readability
  const displayData = sortedDowntime.slice(0, 10);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const days = payload[0].value;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-sm">{label}</p>
          <div className="flex items-center mt-1">
            <Clock className="h-3 w-3 text-gray-500 mr-1" />
            <p className="text-sm">{days} days</p>
          </div>
          <div className="mt-1 text-xs">
            <p className={`${days >= 7 ? 'text-error-700' : days >= 3 ? 'text-warning-700' : 'text-success-700'}`}>
              {days >= 7 ? 'High' : days >= 3 ? 'Medium' : 'Low'} downtime
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // If no data, show placeholder
  if (displayData.length === 0) {
    return (
      <CollapsibleSection 
        title="Vehicle Downtime" 
        iconColor="text-red-600"
      >
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No downtime data available for the selected period</p>
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection 
      title="Vehicle Downtime" 
      iconColor="text-red-600"
    >
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Shows the total days vehicles were down for maintenance
          </p>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']} 
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                type="category" 
                dataKey="registration" 
                axisLine={false}
                tickLine={false}
                width={60} 
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="downtime" 
                barSize={20}
                label={{
                  position: 'right',
                  formatter: (value: number) => `${value} days`,
                  fill: '#6B7280',
                  fontSize: 10
                }}
              >
                {displayData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getDowntimeColor(entry.downtime)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default VehicleDowntimeChart;