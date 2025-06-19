import React from 'react';
import { Vehicle, Trip } from '../../types';
import { Fuel, TrendingUp, Activity } from 'lucide-react';
import EmptyState from './EmptyState';

interface VehicleStatsListProps {
  vehicles: Vehicle[];
  trips: Trip[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

const VehicleStatsList: React.FC<VehicleStatsListProps> = ({ vehicles, trips, onSelectVehicle }) => {
  // Filter out archived vehicles
  const activeVehicles = Array.isArray(vehicles) ? vehicles.filter(v => v.status !== 'archived') : [];
  
  // Sort vehicles by activity (number of trips)
  const sortedVehicles = Array.isArray(activeVehicles) ? [...activeVehicles].sort((a, b) => {
    const aTrips = Array.isArray(trips) ? trips.filter(trip => trip.vehicle_id === a.id).length : 0;
    const bTrips = Array.isArray(trips) ? trips.filter(trip => trip.vehicle_id === b.id).length : 0;
    return bTrips - aTrips;
  }) : [];
  
  if (!Array.isArray(activeVehicles) || activeVehicles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Vehicle Stats</h3>
        <EmptyState 
          type="vehicles" 
          message="No active vehicles available. Add your first vehicle to start tracking performance."
        />
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Vehicle Stats</h3>
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
              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md cursor-pointer transition-colors"
              onClick={() => onSelectVehicle(vehicle)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{vehicle.registration_number}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.make} {vehicle.model}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  vehicle.status === 'active' 
                    ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                    : vehicle.status === 'maintenance'
                    ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {vehicle.status}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="flex flex-col">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    <Activity className="h-3 w-3 mr-1" />
                    Trips
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{totalTrips}</span>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Distance
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{totalDistance.toLocaleString()} km</span>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    <Fuel className="h-3 w-3 mr-1" />
                    Avg Mileage
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
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