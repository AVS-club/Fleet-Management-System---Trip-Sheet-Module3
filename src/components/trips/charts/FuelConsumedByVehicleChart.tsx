import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trip, Vehicle } from '../../../types';
import { format, parseISO, isValid, subMonths } from 'date-fns';
import Button from '../../ui/Button';
import { ChevronRight } from 'lucide-react';

interface FuelConsumedByVehicleChartProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
}

const FuelConsumedByVehicleChart: React.FC<FuelConsumedByVehicleChartProps> = ({ trips, vehicles }) => {
  const [showAllVehicles, setShowAllVehicles] = useState(false);

  // Calculate fuel consumption by vehicle for the last 12 months
  const chartData = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(vehicles)) return [];

    // Get date 12 months ago
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const threeMonthsAgo = subMonths(new Date(), 3);

    // Calculate fuel consumption for each vehicle
    const vehicleFuelMap: Record<string, { vehicleId: string, fuelLiters: number, totalDistance: number }> = {};

    trips.forEach(trip => {
      if (trip.refueling_done && trip.fuel_quantity && trip.vehicle_id) {
        const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
        const dateToCompare = showAllVehicles ? twelveMonthsAgo : threeMonthsAgo;
        
        if (tripDate && isValid(tripDate) && tripDate >= dateToCompare) {
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
          fuelLiters: Math.round(item.fuelLiters),
          totalDistance: Math.round(item.totalDistance)
        };
      });

    // Limit to top 5 vehicles if not showing all
    return showAllVehicles ? sortedData : sortedData.slice(0, 5);
  }, [trips, vehicles, showAllVehicles]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-700">Fuel Consumption by Vehicle</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAllVehicles(!showAllVehicles)}
          icon={<ChevronRight className="h-4 w-4" />}
        >
          {showAllVehicles ? 'Show Top 5 Vehicles' : 'Show All Vehicles'}
        </Button>
      </div>
      
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
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'Fuel Consumed') {
                    return [`${value} L`, name];
                  }
                  return [value, name];
                }}
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
                  fontSize: 11,
                  fill: '#4B5563'
                }}
                barSize={20}
                fill="#0277BD"
                radius={[0, 4, 4, 0]}
              />
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