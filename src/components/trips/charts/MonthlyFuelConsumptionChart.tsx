import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trip } from '../../../types';
import { format, parseISO, isValid, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyFuelConsumptionChartProps {
  trips: Trip[];
}

const MonthlyFuelConsumptionChart: React.FC<MonthlyFuelConsumptionChartProps> = ({ trips }) => {
  // Calculate monthly fuel consumption for the last 12 months
  const chartData = useMemo(() => {
    if (!Array.isArray(trips)) return [];

    // Get the last 12 months
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = subMonths(now, i);
      return {
        month: format(month, 'MMM yyyy'),
        start: startOfMonth(month),
        end: endOfMonth(month),
        fuelLiters: 0,
        monthIndex: 11 - i // For sorting
      };
    });

    // Calculate fuel consumption for each month
    trips.forEach(trip => {
      if (trip.refueling_done && trip.fuel_quantity) {
        const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
        
        if (tripDate && isValid(tripDate)) {
          const monthIndex = months.findIndex(m => 
            tripDate >= m.start && tripDate <= m.end
          );
          
          if (monthIndex !== -1) {
            months[monthIndex].fuelLiters += trip.fuel_quantity;
          }
        }
      }
    });

    // Sort by month index and format for chart
    return months
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map(m => ({
        month: m.month,
        fuelLiters: Math.round(m.fuelLiters)
      }));
  }, [trips]);

  return (
    <div className="space-y-4">
      <div className="h-80 overflow-x-auto">
        <div className="min-w-[800px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Liters', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12 }
                }}
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
                  position: 'top', 
                  formatter: (value: number) => `${value} L`,
                  fontSize: 11
                }}
                barSize={30}
              >
                {chartData.map((entry, index) => (
                  <rect 
                    key={`bar-${index}`} 
                    fill={index % 2 === 0 ? '#4CAF50' : '#0277BD'} 
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

export default MonthlyFuelConsumptionChart;