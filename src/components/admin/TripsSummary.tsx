import React from 'react';
import { Trip, Vehicle, Driver } from '../../types';
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
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  loading?: boolean;
  metrics: TripSummaryMetrics;
}

const TripsSummary: React.FC<TripsSummaryProps> = ({ 
  trips, 
  vehicles, 
  drivers, 
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
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-xl font-bold text-gray-900">₹{metrics.totalExpenses.toLocaleString()}</p>
          </div>
          <IndianRupee className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Average Distance</p>
            <p className="text-xl font-bold text-gray-900">{metrics.avgDistance.toFixed(1)} km</p>
          </div>
          <TrendingUp className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Mean Mileage</p>
            <p className="text-xl font-bold text-gray-900">{metrics.meanMileage.toFixed(2)} km/L</p>
          </div>
          <Fuel className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Top Driver</p>
            <p className="text-xl font-bold text-gray-900">
              {metrics.topDriver ? metrics.topDriver.name : 'No drivers'}
            </p>
            {metrics.topDriver && (
              <p className="text-xs text-gray-500">{metrics.topDriver.tripCount} trips</p>
            )}
          </div>
          <User className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Top Vehicle</p>
            <p className="text-xl font-bold text-gray-900 truncate max-w-[120px]">
              {metrics.topVehicle ? metrics.topVehicle.registrationNumber : 'No vehicles'}
            </p>
            {metrics.topVehicle && (
              <p className="text-xs text-gray-500">{metrics.topVehicle.tripCount} trips</p>
            )}
          </div>
          <Truck className="h-8 w-8 text-primary-500" />
        </div>
      </div>
    </div>
  );
};

export default TripsSummary;