import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trip, Vehicle } from '../../../types';
import { parseISO, isValid, isWithinInterval, format, isBefore } from 'date-fns';

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

    // Safety check for date range validity
    if (!isValid(dateRange.start) || !isValid(dateRange.end) || !isBefore(dateRange.start, dateRange.end)) {
      console.warn('Invalid date range:', dateRange);
      return [];
    }

    // Filter trips based on date range
    const filteredTrips = trips.filter(trip => {
      try {
        const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
        
        // Validate trip date before using in interval check
        if (!tripDate || !isValid(tripDate)) return false;
        
        return isWithinInterval(tripDate, dateRange);
      } catch (error) {
        console.warn('Error filtering trip by date:', error);
        return false;
      }
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
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-base">{label}</p>
          <p className="text-base text-primary-600 font-bold mt-1">
            {payload[0].value.toLocaleString()} Liters
          </p>
          {data.totalDistance > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Distance: {data.totalDistance.toLocaleString()} km
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Period: {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">      
      <div className="h-72 overflow-y-auto">
        <div className="min-h-[350px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 70, bottom: 10 }}
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
                width={70} 
                tick={{ fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} />} />
              <Bar 
                dataKey="fuelLiters" 
                name="Fuel Consumed"
                label={{
                  position: 'right',
                  formatter: (value: number) => `${value.toLocaleString()} L`,
                  fill: '#6B7280',
                  fontSize: 11,
                  fontWeight: 500
                }}
                barSize={32}
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
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
          No fuel consumption data available for the selected period
        </div>
      )}
    </div>
  );
};

export default FuelConsumedByVehicleChart;