import React from 'react';
import { Driver, Trip } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Truck, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

interface DriverMetricsProps {
  driver: Driver;
  trips: Trip[];
}

const DriverMetrics: React.FC<DriverMetricsProps> = ({ driver, trips }) => {
  // Calculate monthly trip data
  const monthlyData = Array.isArray(trips) ? Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthTrips = trips.filter(trip => {
      const tripDate = trip.trip_start_date ? new Date(trip.trip_start_date) : new Date();
      return tripDate >= monthStart && tripDate <= monthEnd;
    });

    const totalDistance = monthTrips.reduce((sum, trip) => 
      sum + (trip.end_km - trip.start_km), 
      0
    );

    const tripsWithMileage = monthTrips.filter(trip => trip.calculated_kmpl && !trip.short_trip);
    const avgMileage = tripsWithMileage.length > 0
      ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length
      : 0;

    return {
      month: format(date, 'MMM yy'),
      trips: monthTrips.length,
      distance: totalDistance,
      mileage: avgMileage
    };
  }).reverse() : [];

  // Calculate overall metrics
  const totalTrips = Array.isArray(trips) ? trips.length : 0;
  const totalDistance = Array.isArray(trips) ? trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0) : 0;
  const tripsWithMileage = Array.isArray(trips) ? trips.filter(trip => trip.calculated_kmpl && !trip.short_trip) : [];
  const averageMileage = tripsWithMileage.length > 0
    ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length
    : 0;

  // Calculate time since last trip
  const lastTrip = Array.isArray(trips) && trips.length > 0 ? trips.sort((a, b) => 
    new Date(b.trip_end_date || 0).getTime() - new Date(a.trip_end_date || 0).getTime()
  )[0] : undefined;
  
  const daysSinceLastTrip = lastTrip
    ? Math.floor((new Date().getTime() - new Date(lastTrip.trip_end_date || 0).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Trips</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalTrips}</h3>
            </div>
            <Truck className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Distance</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalDistance.toLocaleString()} km</h3>
            </div>
            <TrendingUp className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Mileage</p>
              <h3 className="text-2xl font-bold text-success-600">{averageMileage.toFixed(2)} km/L</h3>
            </div>
            <AlertTriangle className="h-8 w-8 text-success-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Last Trip</p>
              <h3 className="text-2xl font-bold text-gray-900">{daysSinceLastTrip} days ago</h3>
            </div>
            <Clock className="h-8 w-8 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Monthly Trips Chart */}
      {monthlyData.length > 0 && <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="trips" fill="#4F46E5" name="Trips" />
              <Bar yAxisId="right" dataKey="distance" fill="#10B981" name="Distance (km)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}

      {/* Risk Score */}
      {driver.performance_metrics?.risk_score !== undefined && (
        <div className={`p-4 rounded-lg ${
          driver.performance_metrics.risk_score < 30
            ? 'bg-success-50 border border-success-200'
            : driver.performance_metrics.risk_score < 70
            ? 'bg-warning-50 border border-warning-200'
            : 'bg-error-50 border border-error-200'
        }`}>
          <div className="flex items-center">
            <AlertTriangle className={`h-5 w-5 mr-2 ${
              driver.performance_metrics.risk_score < 30
                ? 'text-success-500'
                : driver.performance_metrics.risk_score < 70
                ? 'text-warning-500'
                : 'text-error-500'
            }`} />
            <div>
              <h4 className="font-medium">Driver Risk Score</h4>
              <p className="text-sm mt-1">
                Risk Score: {driver.performance_metrics.risk_score}%
                {driver.performance_metrics.risk_score < 30
                  ? ' - Low Risk'
                  : driver.performance_metrics.risk_score < 70
                  ? ' - Medium Risk'
                  : ' - High Risk'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverMetrics;