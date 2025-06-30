import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trip } from '../../../types';
import { format, parseISO, isValid, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import Button from '../../ui/Button';
import { ChevronRight } from 'lucide-react';

interface MonthlyFuelConsumptionChartProps {
  trips: Trip[];
}

const MonthlyFuelConsumptionChart: React.FC<MonthlyFuelConsumptionChartProps> = ({ trips }) => {
  const [showAllMonths, setShowAllMonths] = useState(true);
  
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
    const sortedData = months
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map(m => ({
        month: m.month,
        fuelLiters: Math.round(m.fuelLiters)
      }));

    // Return all months or just the last 3 based on toggle state
    return showAllMonths ? sortedData : sortedData.slice(-3);
  }, [trips, showAllMonths]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-700">Monthly Fuel Consumption</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAllMonths(!showAllMonths)}
          icon={<ChevronRight className="h-4 w-4" />}
        >
          {showAllMonths ? 'Show Last 3 Months' : 'Show All 12 Months'}
        </Button>
      </div>
      
      <div className="h-80 overflow-x-auto">
        <div className="min-w-[800px] h-full">
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