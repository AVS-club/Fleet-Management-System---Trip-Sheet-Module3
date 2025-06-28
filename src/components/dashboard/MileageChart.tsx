import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, isValid, parseISO } from 'date-fns';
import { Trip } from '../../types';
import EmptyState from './EmptyState';

interface MileageChartProps {
  trips: Trip[] | null;
}

const MileageChart: React.FC<MileageChartProps> = ({ trips }) => {
  const chartData = useMemo(() => {
    // Filter trips with calculated KMPL
    const tripsWithKmpl = Array.isArray(trips) ? trips
      .filter(trip => 
        trip.calculated_kmpl !== undefined && 
        trip.refueling_done && 
        trip.trip_end_date && 
        isValid(new Date(trip.trip_end_date))
      )
      .sort((a, b) => new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime())
      .sort((a, b) => new Date(a.trip_end_date).getTime() - new Date(b.trip_end_date).getTime())
    : [];
    
    // Map to chart data format
    return tripsWithKmpl.map(trip => ({
      date: format(new Date(trip.trip_end_date), 'dd/MM'),
      tripId: trip.id,
      kmpl: trip.calculated_kmpl,
      tripSerial: trip.trip_serial_number
    }));
  }, [trips]);
  
  const avgMileage = useMemo(() => {
    const tripsWithKmpl = Array.isArray(trips) ? trips.filter(trip => trip.calculated_kmpl !== undefined) : [];
    if (tripsWithKmpl.length === 0) return 0;
    
    const sum = tripsWithKmpl.reduce((acc, trip) => acc + (trip.calculated_kmpl || 0), 0);
    return sum / tripsWithKmpl.length;
  }, [trips]);
  
  if (chartData.length < 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Mileage Trends</h3>
        <EmptyState 
          type="mileage" 
          message="Not enough data to display mileage trends. Add more trips with refueling to see your vehicle's performance over time."
          showAction={false}
        />
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Mileage Trends</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Average: <span className="font-medium">{avgMileage.toFixed(2)} km/L</span>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={{ fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(2)} km/L`, 'Mileage']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="kmpl" 
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 3, stroke: '#4f46e5', fill: 'white', strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: '#4f46e5', fill: '#4f46e5', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MileageChart;