import React from 'react';
import { Vehicle, Trip } from '../../types';
import { Fuel, TrendingUp, Activity } from 'lucide-react';

interface VehicleStatsListProps {
  vehicles: Vehicle[];
  trips: Trip[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

const VehicleStatsList: React.FC<VehicleStatsListProps> = ({ vehicles, trips, onSelectVehicle }) => {
  // Sort vehicles by activity (number of trips)
  const sortedVehicles = Array.isArray(vehicles) ? [...vehicles].sort((a, b) => {
    const aTrips = Array.isArray(trips) ? trips.filter(trip => trip.vehicle_id === a.id).length : 0;
    const bTrips = Array.isArray(trips) ? trips.filter(trip => trip.vehicle_id === b.id).length : 0;
    return bTrips - aTrips;
  }) : [];
  
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Stats</h3>
        <p className="text-center py-8 text-gray-500">No vehicles available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Vehicle Stats</h3>
      </div>
      <div className="p-1 max-h-[400px] overflow-y-auto space-y-2">
        {sortedVehicles.map((vehicle) => {
          // Calculate basic stats directly from trips
          const vehicleTrips = Array.isArray(trips) ? trips.filter(trip => trip.vehicle_id === vehicle.id) : [];
          const totalTrips = Array.isArray(vehicleTrips) ? vehicleTrips.length : 0;
          const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
          const tripsWithKmpl = vehicleTrips.filter(trip => trip.calculated_kmpl !== undefined && !trip.short_trip);
          const averageKmpl = tripsWithKmpl.length > 0
            ? tripsWithKmpl.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithKmpl.length
            : undefined;

          return (
            <div 
              key={vehicle.id}
              className="p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
              onClick={() => onSelectVehicle(vehicle)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">{vehicle.registration_number}</h4>
                  <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  vehicle.status === 'active' 
                    ? 'bg-success-50 text-success-700'
                    : vehicle.status === 'maintenance'
                    ? 'bg-warning-50 text-warning-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="flex flex-col">
                  <div className="flex items-center text-xs text-gray-500 mb-0.5">
                    <Activity className="h-3 w-3 mr-1" />
                    Trips
                  </div>
                  <span className="font-medium">{totalTrips}</span>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center text-xs text-gray-500 mb-0.5">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Distance
                  </div>
                  <span className="font-medium">{totalDistance.toLocaleString()} km</span>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center text-xs text-gray-500 mb-0.5">
                    <Fuel className="h-3 w-3 mr-1" />
                    Avg Mileage
                  </div>
                  <span className="font-medium">
                    {averageKmpl ? `${averageKmpl.toFixed(1)} km/L` : '-'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleStatsList;