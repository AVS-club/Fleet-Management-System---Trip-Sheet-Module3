import React from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { format, isValid, parseISO } from 'date-fns';
import { Fuel, FileText } from 'lucide-react';
import EmptyState from './EmptyState';

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Trips</h3>
      </div>
      
      {sortedTrips.length === 0 ? (
        <div className="p-4">
          <EmptyState 
            type="trips" 
            message="No trips recorded yet. Start by recording your first trip to track mileage and expenses."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] sm:text-xs">
              <tr>
                <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[25%]">
                  Trip
                </th>
                <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell w-[15%]">
                  Date
                </th>
                <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell w-[15%]">
                  Vehicle
                </th>
                <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell w-[15%]">
                  Driver
                </th>
                <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                  Distance
                </th>
                <th scope="col" className="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                  Mileage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Array.isArray(sortedTrips) && sortedTrips.length > 0 ? (
                sortedTrips.map((trip) => {
                  const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v.id === trip.vehicle_id) : undefined;
                  const driver = Array.isArray(drivers) ? drivers.find(d => d.id === trip.driver_id) : undefined;
                  const distance = trip.end_km - trip.start_km;
                  
                  return (
                    <tr 
                      key={trip.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => onSelectTrip(trip)}
                    >
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {trip.trip_serial_number}
                          {trip.refueling_done && (
                            <Fuel className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {format(parseISO(trip.trip_end_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        {vehicle?.registration_number || 'Unknown'}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        {driver?.name || 'Unknown'}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        <span className={trip.short_trip ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100 font-medium"}>
                          {distance.toLocaleString()} km
                          {trip.short_trip && <span className="ml-1 text-[10px] sm:text-xs">(local)</span>}
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        {trip.calculated_kmpl ? (
                          <span className="text-success-700 dark:text-success-500 font-medium">
                            {trip.calculated_kmpl.toFixed(2)} km/L
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p>No trips available</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentTripsTable;