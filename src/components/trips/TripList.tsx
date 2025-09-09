import React, { useMemo } from 'react';
import { Trip, Vehicle, Driver } from '@/types';
import TripCard from './TripCard';
import { AlertCircle } from 'lucide-react';

interface TripListProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  drivers: Driver[] | null;
  onSelectTrip: (trip: Trip) => void;
  onPnlClick?: (e: React.MouseEvent, trip: Trip) => void;
  onEditTrip?: (trip: Trip) => void;
}

const TripList: React.FC<TripListProps> = ({ 
  trips, 
  vehicles, 
  drivers, 
  onSelectTrip,
  onPnlClick,
  onEditTrip
}) => {
  
  const vehiclesMap = useMemo(() => {
    return Array.isArray(vehicles)
      ? new Map(vehicles.map(v => [v.id, v]))
      : new Map<string, Vehicle>();
  }, [vehicles]);

  const driversMap = useMemo(() => {
    return Array.isArray(drivers)
      ? new Map(drivers.map(d => [d.id, d]))
      : new Map<string, Driver>();
  }, [drivers]);
  
  // Trips are already filtered by the parent component
  const displayTrips = Array.isArray(trips) ? trips : [];
  
  return (
    <div className="space-y-4">
      {displayTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTrips.map(trip => ( 
            <TripCard
              key={trip.id}
              trip={trip}
              vehicle={vehiclesMap.get(trip.vehicle_id)}
              driver={driversMap.get(trip.driver_id)}
              onClick={() => onSelectTrip(trip)}
              onPnlClick={onPnlClick}
              onEditClick={onEditTrip}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No trips found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default TripList;