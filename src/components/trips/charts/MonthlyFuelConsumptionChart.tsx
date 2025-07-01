import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trip } from '../../../types';
import { format, parseISO, isValid, isWithinInterval } from 'date-fns';

interface MonthlyFuelConsumptionChartProps {
  trips: Trip[];
  dateRange: { start: Date; end: Date };
}

const MonthlyFuelConsumptionChart: React.FC<MonthlyFuelConsumptionChartProps> = ({
  trips,
  dateRange
}) => {
  // Calculate monthly fuel consumption based on date range
  const chartData = useMemo(() => {
    if (!Array.isArray(trips)) return [];

    // Filter trips based on date range
    const filteredTrips = trips.filter(trip => {
      const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
      
      // Validate trip date before using in interval check
      if (!tripDate || !isValid(tripDate)) return false;
      
      return isWithinInterval(tripDate, dateRange);
    });

    // Group trips by month
    const monthlyData: Record<string, { month: string; fuelLiters: number; monthSortKey: string }> = {};

    filteredTrips.forEach(trip => {
      if (trip.refueling_done && trip.fuel_quantity) {
        const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
        
        if (tripDate && isValid(tripDate)) {
          const monthKey = format(tripDate, 'MMM yyyy');
          const sortKey = format(tripDate, 'yyyy-MM');
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthKey,
              fuelLiters: 0,
              monthSortKey: sortKey
            };
          }
          
          monthlyData[monthKey].fuelLiters += trip.fuel_quantity;
        }
      }
    });

    // Convert to array and sort by date
    return Object.values(monthlyData)
      .sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey))
      .map(item => ({
        month: item.month,
        fuelLiters: Math.round(item.fuelLiters)
      }));
  }, [trips, dateRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm">
            <span className="text-primary-600 font-medium">
              {payload[0].value.toLocaleString()} L
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Fuel consumed in {label}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">      
      <div className="h-80 overflow-x-auto">
        <div className="min-w-[600px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0277BD" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                label={{ 
                  value: 'Liters', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 10 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="fuelLiters" 
                name="Fuel Consumed"
                label={{ 
                  position: 'top',
                  formatter: (value: number) => `${value.toLocaleString()} L`,
                  fontSize: 9,
                  fill: '#4B5563',
                  dy: -4
                }}
                barSize={30}
                fill="url(#fuelGradient)"
                radius={[4, 4, 0, 0]}
              >
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

export default MonthlyFuelConsumptionChart;