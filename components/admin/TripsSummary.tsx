import React from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { IndianRupee, TrendingUp, Fuel, User, Truck } from 'lucide-react';

interface TripsSummaryProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
}

const TripsSummary: React.FC<TripsSummaryProps> = ({ trips, vehicles, drivers }) => {
  // Calculate total expenses with initial value
  const totalExpenses = trips.reduce((sum, trip) => 
    sum + (trip.totalRoadExpenses || 0) + (trip.totalFuelCost || 0), 
    0
  );

  // Calculate average distance with initial value
  const totalDistance = trips.reduce((sum, trip) => 
    sum + (trip.endKm - trip.startKm), 
    0
  );
  const avgDistance = trips.length > 0 ? totalDistance / trips.length : 0;

  // Calculate mean mileage with initial value
  const tripsWithMileage = trips.filter(trip => trip.calculatedKmpl && !trip.shortTrip);
  const meanMileage = tripsWithMileage.length > 0
    ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculatedKmpl || 0), 0) / tripsWithMileage.length
    : 0;

  // Find driver with most trips with safe default
  const driverTrips = drivers.map(driver => ({
    driver,
    tripCount: trips.filter(trip => trip.driverId === driver.id).length
  }));
  const topDriver = driverTrips.length > 0 
    ? driverTrips.reduce((prev, current) => 
        (prev.tripCount > current.tripCount) ? prev : current
      )
    : { driver: drivers[0], tripCount: 0 };

  // Find vehicle with most trips with safe default
  const vehicleTrips = vehicles.map(vehicle => ({
    vehicle,
    tripCount: trips.filter(trip => trip.vehicleId === vehicle.id).length
  }));
  const topVehicle = vehicleTrips.length > 0
    ? vehicleTrips.reduce((prev, current) => 
        (prev.tripCount > current.tripCount) ? prev : current
      )
    : { vehicle: vehicles[0], tripCount: 0 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-xl font-bold text-gray-900">₹{totalExpenses.toLocaleString()}</p>
          </div>
          <IndianRupee className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Average Distance</p>
            <p className="text-xl font-bold text-gray-900">{avgDistance.toFixed(1)} km</p>
          </div>
          <TrendingUp className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Mean Mileage</p>
            <p className="text-xl font-bold text-gray-900">{meanMileage.toFixed(2)} km/L</p>
          </div>
          <Fuel className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Top Driver</p>
            <p className="text-xl font-bold text-gray-900">
              {topDriver.driver ? topDriver.driver.name : 'No drivers'}
            </p>
            <p className="text-xs text-gray-500">{topDriver.tripCount} trips</p>
          </div>
          <User className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Top Vehicle</p>
            <p className="text-xl font-bold text-gray-900">
              {topVehicle.vehicle ? topVehicle.vehicle.registrationNumber : 'No vehicles'}
            </p>
            <p className="text-xs text-gray-500">{topVehicle.tripCount} trips</p>
          </div>
          <Truck className="h-8 w-8 text-primary-500" />
        </div>
      </div>
    </div>
  );
};

export default TripsSummary;