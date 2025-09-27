import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Calendar, User, Fuel, TrendingUp, 
  Package, Clock, DollarSign, AlertCircle 
} from 'lucide-react';
import { getTrips } from '../../utils/storage';
import { formatDate } from '../../utils/dateUtils';
import { getMileageBadge, vehicleColors } from '../../utils/vehicleColors';

interface VehicleTripsTabProps {
  vehicleId: string;
}

interface Trip {
  id: string;
  trip_start_date: string;
  trip_start_time?: string;
  start_km: number;
  end_km: number;
  destination_display?: string;
  start_location?: string;
  end_location?: string;
  route_description?: string;
  destinations?: Array<{ name: string }>;
  calculated_kmpl?: number;
  mileage?: number;
  driver_name?: string;
  cargo_weight?: number;
  total_road_expenses?: number;
  revenue?: number;
  distance?: number;
}

const VehicleTripsTab: React.FC<VehicleTripsTabProps> = ({ vehicleId }) => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    avgMileage: 0,
    totalDistance: 0,
    bestDriver: '',
    totalFuel: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLatestTrips();
  }, [vehicleId]);

  const loadLatestTrips = async () => {
    try {
      const allTrips = await getTrips();
      const vehicleTrips = Array.isArray(allTrips) 
        ? allTrips.filter((trip: Trip) => trip.vehicle_id === vehicleId)
        : [];
      
      // Get latest 10 trips
      const latestTrips = vehicleTrips
        .sort((a, b) => new Date(b.trip_start_date).getTime() - new Date(a.trip_start_date).getTime())
        .slice(0, 10);

      setTrips(latestTrips);

      // Calculate stats
      const totalTrips = vehicleTrips.length;
      const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
      const avgMileage = vehicleTrips.length > 0 
        ? vehicleTrips.reduce((sum, trip) => sum + (trip.calculated_kmpl || trip.mileage || 0), 0) / vehicleTrips.length 
        : 0;
      
      // Find best driver (most trips)
      const driverCounts = vehicleTrips.reduce((acc, trip) => {
        if (trip.driver_name) {
          acc[trip.driver_name] = (acc[trip.driver_name] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const bestDriver = Object.keys(driverCounts).reduce((a, b) => 
        driverCounts[a] > driverCounts[b] ? a : b, '');

      setStats({
        totalTrips,
        avgMileage: Math.round(avgMileage * 10) / 10,
        totalDistance,
        bestDriver,
        totalFuel: Math.round(totalDistance / (avgMileage || 1))
      });
    } catch (error) {
      console.error('Error loading vehicle trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading trips...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Bar */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xs text-primary-600 font-medium">Total Trips</p>
            <p className="text-2xl font-bold text-primary-900">{stats.totalTrips}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-primary-600 font-medium">Total Distance</p>
            <p className="text-2xl font-bold text-primary-900">{stats.totalDistance} km</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-primary-600 font-medium">Avg Mileage</p>
            <p className="text-2xl font-bold text-primary-900">{stats.avgMileage} KMPL</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-primary-600 font-medium">Fuel Used</p>
            <p className="text-2xl font-bold text-primary-900">{stats.totalFuel}L</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-primary-600 font-medium">Best Driver</p>
            <p className="text-lg font-bold text-primary-900 truncate">{stats.bestDriver}</p>
          </div>
        </div>
      </div>

      {/* Trip Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Latest Trips</h3>
        
        {trips.map((trip, index) => (
          <div 
            key={trip.id}
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            {/* Trip Header with Color Strip */}
            <div className={`h-1 bg-gradient-to-r ${
              index === 0 ? 'from-green-400 to-green-500' :
              index === 1 ? 'from-blue-400 to-blue-500' :
              index === 2 ? 'from-purple-400 to-purple-500' :
              'from-gray-400 to-gray-500'
            }`} />
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                {/* Trip Number & Date */}
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">
                    Trip #{trips.length - index}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(trip.trip_start_date)}</span>
                    {trip.trip_start_time && (
                      <>
                        <Clock className="h-4 w-4 ml-2" />
                        <span>{formatTime(trip.trip_start_time)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mileage Badge */}
                <div className={`px-3 py-1.5 rounded-full border ${getMileageBadge(trip.mileage || trip.calculated_kmpl || 0, stats.avgMileage)}`}>
                  <div className="flex items-center gap-1">
                    <Fuel className="h-4 w-4" />
                    <span className="font-semibold">{trip.mileage || trip.calculated_kmpl || 0} KMPL</span>
                  </div>
                </div>
              </div>

              {/* Route Information */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {trip.start_location || 'Loading point'} → {trip.end_location || trip.destination_display || 'Destination'}
                    </p>
                    {trip.route_description && (
                      <p className="text-xs text-gray-500 mt-1">{trip.route_description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trip Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Driver</p>
                    <p className="text-sm font-medium text-gray-900">{trip.driver_name || 'Not assigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Distance</p>
                    <p className="text-sm font-medium text-gray-900">{trip.end_km - trip.start_km} km</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500">Load</p>
                    <p className="text-sm font-medium text-gray-900">{trip.cargo_weight || 0} kg</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-medium text-gray-900">₹{trip.revenue || trip.total_road_expenses || 0}</p>
                  </div>
                </div>
              </div>

              {/* Performance Indicators */}
              {trip.mileage && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {trip.mileage > stats.avgMileage ? (
                        <>
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-green-600 font-medium">
                            Above average efficiency (+{((trip.mileage - stats.avgMileage) / stats.avgMileage * 100).toFixed(0)}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span className="text-xs text-yellow-600 font-medium">
                            Below average efficiency
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {trips.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No trips recorded yet</p>
            <p className="text-sm text-gray-400 mt-1">Trips will appear here once recorded</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTripsTab;
