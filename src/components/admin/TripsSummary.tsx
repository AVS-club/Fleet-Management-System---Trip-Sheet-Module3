import React from 'react';
import { IndianRupee, TrendingUp, Fuel, User, Truck } from 'lucide-react';

interface TripSummaryMetrics {
  totalExpenses: number;
  avgDistance: number;
  tripCount: number;
  meanMileage: number;
  topDriver: {
    id: string;
    name: string;
    totalDistance: number;
    tripCount: number;
  } | null;
  topVehicle: {
    id: string;
    registrationNumber: string;
    tripCount: number;
  } | null;
}

interface TripsSummaryProps {
  trips: any[];
  vehicles: any[];
  drivers: any[];
  loading?: boolean;
  metrics: TripSummaryMetrics;
}

const TripsSummary: React.FC<TripsSummaryProps> = ({ 
  loading = false,
  metrics
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">₹{(metrics.totalExpenses || 0).toLocaleString()}</p>
          </div>
          <IndianRupee className="h-8 w-8 text-blue-500 opacity-75" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Distance</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{(metrics.avgDistance || 0).toFixed(1)} km</p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500 opacity-75" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mean Mileage</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{(metrics.meanMileage || 0).toFixed(2)} km/L</p>
          </div>
          <Fuel className="h-8 w-8 text-orange-500 opacity-75" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Top Driver</p>
            <p className="mt-2 text-lg font-bold text-gray-900 truncate">
              {metrics.topDriver?.name || 'No drivers'}
            </p>
            {metrics.topDriver?.tripCount && (
              <p className="text-xs text-gray-500 mt-1">{metrics.topDriver.tripCount} trips</p>
            )}
          </div>
          <User className="h-8 w-8 text-purple-500 opacity-75" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Top Vehicle</p>
            <p className="mt-2 text-lg font-bold text-gray-900 truncate" title={metrics.topVehicle?.registrationNumber}>
              {metrics.topVehicle?.registrationNumber || 'No vehicles'}
            </p>
            {metrics.topVehicle?.tripCount && (
              <p className="text-xs text-gray-500 mt-1">{metrics.topVehicle.tripCount} trips</p>
            )}
          </div>
          <Truck className="h-8 w-8 text-indigo-500 opacity-75" />
        </div>
      </div>
    </div>
  );
};

export default TripsSummary;