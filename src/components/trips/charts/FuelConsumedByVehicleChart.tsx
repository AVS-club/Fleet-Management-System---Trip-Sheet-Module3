import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trip, Vehicle } from '../../../types';
import { parseISO, isValid, isWithinInterval } from 'date-fns';

interface FuelConsumedByVehicleChartProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  dateRange: { start: Date; end: Date };
}

const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

const FuelConsumedByVehicleChart: React.FC<FuelConsumedByVehicleChartProps> = ({
  trips,
  vehicles,
  dateRange
}) => {
  // Calculate fuel consumption by vehicle for the date range
  const chartData = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(vehicles)) return [];

    // Filter trips based on date range
    const filteredTrips = trips.filter(trip => {
      const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
      
      // Validate trip date before using in interval check
      if (!tripDate || !isValid(tripDate)) return false;
      
      return isWithinInterval(tripDate, dateRange);
    });

    // Calculate fuel consumption for each vehicle
    const vehicleFuelMap: Record<string, { vehicleId: string; fuelLiters: number; totalDistance: number }> = {};

    filteredTrips.forEach(trip => {
      if (trip.refueling_done && trip.fuel_quantity && trip.vehicle_id) {
        if (!vehicleFuelMap[trip.vehicle_id]) {
          vehicleFuelMap[trip.vehicle_id] = {
            vehicleId: trip.vehicle_id,
            fuelLiters: 0,
            totalDistance: 0
          };
        }
        
        vehicleFuelMap[trip.vehicle_id].fuelLiters += trip.fuel_quantity;
        vehicleFuelMap[trip.vehicle_id].totalDistance += (trip.end_km - trip.start_km);
      }
    });

    // Convert to array and sort by fuel consumption (descending)
    const sortedData = Object.values(vehicleFuelMap)
      .sort((a, b) => b.fuelLiters - a.fuelLiters)
      .map(item => {
        const vehicle = vehicles.find(v => v.id === item.vehicleId);
        return {
          vehicleId: item.vehicleId,
          registration: vehicle?.registration_number || 'Unknown',
          fuelLiters: Math.round(item.fuelLiters),
          totalDistance: Math.round(item.totalDistance)
        };
      });

    return sortedData;
  }, [trips, vehicles, dateRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-primary-600 font-medium">
            {payload[0].value.toLocaleString()} Liters
          </p>
          {payload[0].payload.totalDistance > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Distance: {payload[0].payload.totalDistance.toLocaleString()} km
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Vehicle: {label}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">      
      <div className="h-80 overflow-y-auto">
        <div className="min-h-[400px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']} 
                tick={{ fontSize: 10 }}
                label={{
                  value: 'Liters',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 10 }
                }}
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
                dataKey="fuelLiters" 
                name="Fuel Consumed"
                label={{
                  position: 'right',
                  formatter: (value: number) => `${value.toLocaleString()} L`,
                  fill: '#6B7280',
                  fontSize: 10
                }}
                barSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {chartData.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          No fuel consumption data available for the selected period
        </div>
      )}
    </div>
  );
};

export default FuelConsumedByVehicleChart;