import React, { useState, useMemo } from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import TripCard from './TripCard';
import { Search, Filter, AlertCircle } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface TripListProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  drivers: Driver[] | null;
  onSelectTrip: (trip: Trip) => void;
}

const TripList: React.FC<TripListProps> = ({ trips, vehicles, drivers, onSelectTrip }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterRefueling, setFilterRefueling] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const filteredTrips = useMemo(() => {
    return Array.isArray(trips) ? trips.filter(trip => {
        // Search by trip serial, vehicle registration, driver name or station
        if (searchTerm) {
          const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v.id === trip.vehicle_id) : undefined;
          const driver = Array.isArray(drivers) ? drivers.find(d => d.id === trip.driver_id) : undefined;
          
          const searchLower = searchTerm.toLowerCase();
          const serialMatch = trip.trip_serial_number?.toLowerCase().includes(searchLower);
          const vehicleMatch = vehicle?.registration_number?.toLowerCase().includes(searchLower);
          const driverMatch = driver?.name?.toLowerCase().includes(searchLower);
          const stationMatch = trip.station?.toLowerCase()?.includes(searchLower);
          
          if (!(serialMatch || vehicleMatch || driverMatch || stationMatch)) {
            return false;
          }
        }
        
        // Filter by vehicle
        if (filterVehicle && trip.vehicle_id !== filterVehicle) {
          return false;
        }
        
        // Filter by driver
        if (filterDriver && trip.driver_id !== filterDriver) {
          return false;
        }
        
        // Filter by refueling status
        if (filterRefueling === 'refueling' && !trip.refueling_done) {
          return false;
        } else if (filterRefueling === 'no-refueling' && trip.refueling_done) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.trip_start_date || 0).getTime() - new Date(a.trip_start_date || 0).getTime())
      .sort((a, b) => new Date(b.trip_start_date || 0).getTime() - new Date(a.trip_start_date || 0).getTime())
    : [];
  }, [trips, searchTerm, filterVehicle, filterDriver, filterRefueling, vehicles, drivers]);
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search trips by serial, vehicle, driver or station"
            icon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>
      </div>
      
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
          <Select
            label="Vehicle"
            options={[
              { value: '', label: 'All Vehicles' },
              ...Array.isArray(vehicles) ? vehicles.map(vehicle => ({
                value: vehicle.id,
                label: vehicle.registration_number
              })) : []
            ]}
            value={filterVehicle}
            onChange={e => setFilterVehicle(e.target.value)}
          />
          
          <Select
            label="Driver"
            options={[
              { value: '', label: 'All Drivers' },
              ...Array.isArray(drivers) ? drivers.map(driver => ({
                value: driver.id,
                label: driver.name
              })) : []
            ]}
            value={filterDriver}
            onChange={e => setFilterDriver(e.target.value)}
          />
          
          <Select
            label="Refueling Status"
            options={[
              { value: '', label: 'All Trips' },
              { value: 'refueling', label: 'Refueling Trips' },
              { value: 'no-refueling', label: 'No Refueling' }
            ]}
            value={filterRefueling}
            onChange={e => setFilterRefueling(e.target.value)}
          />
        </div>
      )}
      
      {Array.isArray(filteredTrips) && filteredTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              vehicle={Array.isArray(vehicles) ? vehicles.find(v => v.id === trip.vehicle_id) : undefined}
              driver={Array.isArray(drivers) ? drivers.find(d => d.id === trip.driver_id) : undefined}
              onClick={() => onSelectTrip(trip)}
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