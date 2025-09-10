import React, { useMemo } from 'react';
import { Trip, Vehicle, Driver } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { Fuel, Edit2, DollarSign, MoreVertical } from 'lucide-react';

interface TripTableProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onSelectTrip: (trip: Trip) => void;
  onPnlClick?: (e: React.MouseEvent, trip: Trip) => void;
  onEditTrip?: (trip: Trip) => void;
}

const TripTable: React.FC<TripTableProps> = ({ 
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
  
  const displayTrips = Array.isArray(trips) ? trips : [];
  
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trip ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mileage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destination
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayTrips.length > 0 ? (
              displayTrips.map(trip => {
                const vehicle = vehiclesMap.get(trip.vehicle_id);
                const driver = driversMap.get(trip.driver_id);
                const dateString = trip.trip_end_date || trip.trip_start_date || trip.created_at;
                const tripDate = dateString ? parseISO(dateString) : null;
                const formattedDate = tripDate && isValid(tripDate) 
                  ? format(tripDate, 'dd MMM yyyy')
                  : '-';
                const mileage = trip.start_odometer && trip.end_odometer && trip.refueling_liters 
                  ? ((trip.end_odometer - trip.start_odometer) / trip.refueling_liters).toFixed(2) 
                  : '-';
                
                return (
                  <tr 
                    key={trip.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectTrip(trip)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {trip.refueling_done && (
                          <Fuel className="h-4 w-4 text-accent-600 mr-2" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {trip.trip_serial_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formattedDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {vehicle?.registration_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {driver?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {trip.end_odometer && trip.start_odometer 
                        ? `${(trip.end_odometer - trip.start_odometer).toFixed(1)} km`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {mileage !== '-' ? `${mileage} km/L` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {trip.destination_names?.join(', ') || trip.destinations?.join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onPnlClick && (
                          <button 
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPnlClick(e, trip);
                            }}
                            title="View P&L"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        {onEditTrip && (
                          <button 
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTrip(trip);
                            }}
                            title="Edit Trip"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  No trips found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripTable;