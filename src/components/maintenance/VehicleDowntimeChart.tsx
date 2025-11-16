import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

interface VehicleDowntimeChartProps {
  vehicleDowntime?: { vehicleId: string; registration: string; downtime: number }[];
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
  // Ensure vehicleDowntime is an array, default to empty array if undefined/null
  const safeVehicleDowntime = Array.isArray(vehicleDowntime) ? vehicleDowntime : [];
  
  // Sort vehicles by downtime (highest first)
  const sortedDowntime = [...safeVehicleDowntime].sort((a, b) => b.downtime - a.downtime);
  
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

  // Calculate summary stats
  const totalDowntime = displayData.reduce((sum, entry) => sum + entry.downtime, 0);
  const avgDowntime = displayData.length > 0 ? (totalDowntime / displayData.length).toFixed(1) : 0;
  const maxDowntime = displayData.length > 0 ? Math.max(...displayData.map(d => d.downtime)) : 0;

  return (
    <CollapsibleSection 
      title="Vehicle Downtime" 
      iconColor="text-red-600"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Shows the total days vehicles were down for maintenance
          </p>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Total Downtime</div>
              <div className="text-lg font-semibold text-gray-900">{totalDowntime} days</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Average</div>
              <div className="text-lg font-semibold text-gray-900">{avgDowntime} days</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Maximum</div>
              <div className="text-lg font-semibold text-gray-900">{maxDowntime} days</div>
            </div>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0"/>
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']} 
                tick={{ fontSize: 11, fill: '#6b7280' }}
                label={{ value: 'Days', position: 'insideBottom', offset: -5, style: { fill: '#6b7280', fontSize: 11 } }}
              />
              <YAxis 
                type="category" 
                dataKey="registration" 
                axisLine={false}
                tickLine={false}
                width={80} 
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Bar 
                dataKey="downtime" 
                radius={[0, 8, 8, 0]}
                barSize={28}
                label={{
                  position: 'right',
                  formatter: (value: number) => `${value}d`,
                  fill: '#6B7280',
                  fontSize: 11,
                  fontWeight: 500
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