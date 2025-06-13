import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trip, Vehicle } from '../../../types';
import { format, parseISO, isValid, subMonths } from 'date-fns';

interface FuelConsumedByVehicleChartProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
}

const FuelConsumedByVehicleChart: React.FC<FuelConsumedByVehicleChartProps> = ({ trips, vehicles }) => {
  // Calculate fuel consumption by vehicle for the last 12 months
  const chartData = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(vehicles)) return [];

    // Get date 12 months ago
    const twelveMonthsAgo = subMonths(new Date(), 12);

    // Calculate fuel consumption for each vehicle
    const vehicleFuelMap: Record<string, { vehicleId: string, fuelLiters: number }> = {};

    trips.forEach(trip => {
      if (trip.refueling_done && trip.fuel_quantity && trip.vehicle_id) {
        const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
        
        if (tripDate && isValid(tripDate) && tripDate >= twelveMonthsAgo) {
          if (!vehicleFuelMap[trip.vehicle_id]) {
            vehicleFuelMap[trip.vehicle_id] = {
              vehicleId: trip.vehicle_id,
              fuelLiters: 0
            };
          }
          
          vehicleFuelMap[trip.vehicle_id].fuelLiters += trip.fuel_quantity;
        }
      }
    });

    // Convert to array and sort by fuel consumption (descending)
    const sortedData = Object.values(vehicleFuelMap)
      .sort((a, b) => b.fuelLiters - a.fuelLiters)
      .map(item => {
        const vehicle = vehicles.find(v => v.id === item.vehicleId);
        return {
          vehicleId: item.vehicleId,
          vehicleNumber: vehicle?.registration_number || 'Unknown',
          fuelLiters: Math.round(item.fuelLiters)
        };
      });

    return sortedData;
  }, [trips, vehicles]);

  // Generate color scale from light to dark green
  const getBarColor = (index: number) => {
    const baseColors = [
      '#81C784', // Light green
      '#66BB6A',
      '#4CAF50',
      '#43A047',
      '#388E3C',
      '#2E7D32', // Dark green
    ];
    
    return baseColors[index % baseColors.length];
  };

  return (
    <div className="space-y-4">
      <div className="h-80 overflow-y-auto">
        <div className="min-h-[400px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 70, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={true}
                label={{ 
                  value: 'Liters', 
                  position: 'insideBottom',
                  offset: -15,
                  style: { textAnchor: 'middle', fontSize: 12 }
                }}
              />
              <YAxis 
                type="category"
                dataKey="vehicleNumber" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number) => [`${value} L`, 'Fuel Consumed']}
                labelStyle={{ fontWeight: 'bold' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              />
              <Bar 
                dataKey="fuelLiters" 
                name="Fuel Consumed"
                label={{ 
                  position: 'right', 
                  formatter: (value: number) => `${value} L`,
                  fontSize: 11
                }}
                barSize={20}
              >
                {chartData.map((entry, index) => (
                  <rect 
                    key={`bar-${index}`} 
                    fill={getBarColor(index)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FuelConsumedByVehicleChart;