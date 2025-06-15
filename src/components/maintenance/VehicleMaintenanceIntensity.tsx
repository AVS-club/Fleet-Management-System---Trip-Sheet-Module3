import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import CollapsibleSection from '../ui/CollapsibleSection';

interface VehicleMaintenanceIntensityProps {
  kmBetweenMaintenance: { vehicleId: string; registration: string; kmReadings: number[] }[];
}

// Chart colors - distinct for each vehicle
const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', 
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

const VehicleMaintenanceIntensity: React.FC<VehicleMaintenanceIntensityProps> = ({
  kmBetweenMaintenance
}) => {
  // Prepare data for chart
  const processedData = React.useMemo(() => {
    // Only consider vehicles with at least one KM reading
    const vehiclesWithData = kmBetweenMaintenance.filter(v => v.kmReadings.length > 0);
    
    // Take only top 5 vehicles by average KM readings for clarity
    const topVehicles = [...vehiclesWithData].sort((a, b) => {
      const avgA = a.kmReadings.reduce((sum, val) => sum + val, 0) / a.kmReadings.length;
      const avgB = b.kmReadings.reduce((sum, val) => sum + val, 0) / b.kmReadings.length;
      return avgB - avgA; // Sort by highest average KM
    }).slice(0, 5);
    
    // Find the maximum number of readings across all vehicles
    const maxReadingsCount = Math.max(...topVehicles.map(v => v.kmReadings.length));
    
    // Prepare data points for each interval
    const chartData = [];
    for (let i = 0; i < maxReadingsCount; i++) {
      const dataPoint: Record<string, any> = { name: `Visit ${i + 1}` };
      
      topVehicles.forEach(vehicle => {
        if (i < vehicle.kmReadings.length) {
          dataPoint[vehicle.registration] = vehicle.kmReadings[i];
        }
      });
      
      chartData.push(dataPoint);
    }
    
    return {
      chartData,
      vehicleRegistrations: topVehicles.map(v => v.registration)
    };
  }, [kmBetweenMaintenance]);
  
  // If no data, show placeholder
  if (processedData.chartData.length === 0) {
    return (
      <CollapsibleSection 
        title="KM Run Between Maintenance Visits" 
        iconColor="text-blue-600"
      >
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No data available for KM between maintenance visits</p>
          </div>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection 
      title="KM Run Between Maintenance Visits" 
      iconColor="text-blue-600"
    >
      <div className="bg-white rounded-lg shadow-sm p-4">
        <p className="text-sm text-gray-600 mb-4">
          This chart shows the kilometers run between consecutive maintenance visits for each vehicle.
          Higher values indicate longer distances between maintenance, which can be better for operational efficiency.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={processedData.chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name"
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value.toLocaleString()} km`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()} km`, 'Distance']}
              />
              <Legend />
              {processedData.vehicleRegistrations.map((registration, index) => (
                <Line
                  key={registration}
                  type="monotone"
                  dataKey={registration}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default VehicleMaintenanceIntensity;