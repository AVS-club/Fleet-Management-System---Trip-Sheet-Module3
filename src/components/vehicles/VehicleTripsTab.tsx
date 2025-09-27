import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
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
    } catch (error) {
      console.error('Error loading vehicle trips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading trips...</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Latest Trips</h3>
      
      <div className="space-y-3">
        {trips.map((trip, index) => (
          <div key={trip.id} className="border rounded-lg p-3 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Trip #{trips.length - index}</p>
                <p className="text-sm text-gray-600">
                  {trip.destination_display || 'Route not specified'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(trip.trip_start_date)} • {trip.end_km - trip.start_km} km • {trip.calculated_kmpl?.toFixed(1) || 'N/A'} KMPL
                </p>
              </div>
              <button
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="text-primary-600 text-sm hover:underline"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {trips.length === 0 && (
        <p className="text-center text-gray-500 py-8">No trips recorded yet</p>
      )}
    </div>
  );
};

export default VehicleTripsTab;
