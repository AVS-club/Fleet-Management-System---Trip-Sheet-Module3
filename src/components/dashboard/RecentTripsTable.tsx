import React from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { format, isValid, parseISO } from 'date-fns';
import { Fuel } from 'lucide-react';

interface RecentTripsTableProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  drivers: Driver[] | null;
  onSelectTrip: (trip: Trip) => void;
}

const RecentTripsTable: React.FC<RecentTripsTableProps> = ({ 
  trips,
  vehicles,
  drivers,
  onSelectTrip
}) => {
  // Sort trips by date (newest first) and filter out invalid dates
  const sortedTrips = Array.isArray(trips) 
    ? [...trips]
      .filter(trip => trip.trip_end_date && isValid(new Date(trip.trip_end_date)))
      .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime())
      .slice(0, 5) // Get only the 5 most recent
    : [];
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Trips</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trip
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Driver
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distance
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mileage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(sortedTrips) && sortedTrips.length > 0 ? (
              sortedTrips.map((trip) => {
                const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v.id === trip.vehicle_id) : undefined;
                const driver = Array.isArray(drivers) ? drivers.find(d => d.id === trip.driver_id) : undefined;
                const distance = trip.end_km - trip.start_km;
                
                return (
                  <tr 
                    key={trip.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectTrip(trip)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {trip.trip_serial_number}
                        {trip.refueling_done && (
                          <Fuel className="ml-2 h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(trip.trip_end_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicle?.registration_number || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {driver?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={trip.short_trip ? "text-gray-400" : "text-gray-900 font-medium"}>
                        {distance.toLocaleString()} km
                        {trip.short_trip && <span className="ml-1 text-xs">(local)</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {trip.calculated_kmpl ? (
                        <span className="text-success-700 font-medium">
                          {trip.calculated_kmpl.toFixed(2)} km/L
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No trips available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTripsTable;