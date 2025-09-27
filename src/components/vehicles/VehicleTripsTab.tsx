import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, TrendingUp, Fuel, User, Package } from 'lucide-react';
import { getTrips } from '../../utils/storage';
import { formatDate } from '../../utils/dateUtils';

interface VehicleTripsTabProps {
  vehicleId: string;
}

interface Trip {
  id: string;
  trip_start_date: string;
  start_km: number;
  end_km: number;
  destination_display?: string;
  destinations?: Array<{ name: string }>;
  calculated_kmpl?: number;
  driver_name?: string;
  cargo_weight?: number;
  total_road_expenses?: number;
}

const VehicleTripsTab: React.FC<VehicleTripsTabProps> = ({ vehicleId }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDistance: 0,
    avgDistance: 0,
    bestMileage: 0,
    favoriteRoute: '',
    favoriteDriver: '',
    totalFuelConsumed: 0,
    avgLoadCarried: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicleTrips();
  }, [vehicleId]);

  const loadVehicleTrips = async () => {
    try {
      const allTrips = await getTrips();
      const vehicleTrips = Array.isArray(allTrips) 
        ? allTrips.filter((trip: Trip) => trip.vehicle_id === vehicleId)
        : [];
      
      // Get top 10 trips
      const recentTrips = vehicleTrips
        .sort((a, b) => new Date(b.trip_start_date).getTime() - new Date(a.trip_start_date).getTime())
        .slice(0, 10);

      setTrips(recentTrips);

      // Calculate stats
      const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
      const avgDistance = vehicleTrips.length ? Math.round(totalDistance / vehicleTrips.length) : 0;
      const bestMileage = Math.max(...vehicleTrips.map(t => t.calculated_kmpl || 0), 0);
      
      // Find favorite route and driver
      const routes = vehicleTrips.map(t => t.destination_display || 'Unknown Route');
      const drivers = vehicleTrips.map(t => t.driver_name || 'Unknown Driver');
      
      setStats({
        totalTrips: vehicleTrips.length,
        totalDistance,
        avgDistance,
        bestMileage,
        favoriteRoute: findMostFrequent(routes),
        favoriteDriver: findMostFrequent(drivers),
        totalFuelConsumed: vehicleTrips.reduce((sum, t) => sum + ((t.end_km - t.start_km) / (t.calculated_kmpl || 1)), 0),
        avgLoadCarried: vehicleTrips.reduce((sum, t) => sum + (t.cargo_weight || 0), 0) / Math.max(vehicleTrips.length, 1)
      });
    } catch (error) {
      console.error('Error loading vehicle trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const findMostFrequent = (arr: string[]): string => {
    const frequency: Record<string, number> = {};
    let maxFreq = 0;
    let result = '';
    
    arr.forEach(item => {
      if (item && item !== 'Unknown Route' && item !== 'Unknown Driver') {
        frequency[item] = (frequency[item] || 0) + 1;
        if (frequency[item] > maxFreq) {
          maxFreq = frequency[item];
          result = item;
        }
      }
    });
    
    return result || 'N/A';
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading trips...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Journey Stats */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-4">
          My Journey So Far
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Trips</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalTrips}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Distance Covered</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.totalDistance.toLocaleString()} km
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Best Mileage</p>
            <p className="text-xl font-bold text-green-600">
              {stats.bestMileage.toFixed(1)} KMPL
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Fuel Used</p>
            <p className="text-xl font-bold text-gray-900">
              {Math.round(stats.totalFuelConsumed)}L
            </p>
          </div>
        </div>

        {/* Favorite Route & Driver */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary-600" />
            <span className="text-gray-700">
              Favorite Route: <strong>{stats.favoriteRoute}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary-600" />
            <span className="text-gray-700">
              Best Driver: <strong>{stats.favoriteDriver}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recent Trips List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Adventures</h3>
        
        <div className="space-y-3">
          {trips.map((trip, index) => (
            <div
              key={trip.id}
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/trips/${trip.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Trip Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      Trip #{stats.totalTrips - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(trip.trip_start_date)}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>{trip.destination_display || 'Route not specified'}</span>
                  </div>

                  {/* Trip Stats */}
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      {trip.end_km - trip.start_km} km
                    </span>
                    {trip.calculated_kmpl && (
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3 text-green-500" />
                        {trip.calculated_kmpl.toFixed(1)} KMPL
                      </span>
                    )}
                    {trip.driver_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-purple-500" />
                        {trip.driver_name}
                      </span>
                    )}
                    {trip.cargo_weight && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-orange-500" />
                        {trip.cargo_weight} kg
                      </span>
                    )}
                  </div>
                </div>

                {/* Trip Performance Badge */}
                <div className="text-right">
                  {trip.calculated_kmpl && trip.calculated_kmpl >= stats.bestMileage * 0.8 ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Good Trip
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                      Below Avg
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Trips Link */}
        {stats.totalTrips > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => window.location.href = `/vehicles/${vehicleId}/trips`}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all {stats.totalTrips} trips →
            </button>
          </div>
        )}

        {trips.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No trips recorded yet</p>
            <p className="text-sm">Start your journey by creating your first trip!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTripsTab;
