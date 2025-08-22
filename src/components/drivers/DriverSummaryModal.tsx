import React from 'react';
import { X, Truck, Fuel, IndianRupee, Calendar, TrendingUp, Clock, PenTool as Tool } from 'lucide-react';
import { Driver, Trip, Vehicle } from '../../types';
import { MaintenanceTask } from '../../types/maintenance';
import Button from '../ui/Button';
import { format, isValid, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DriverSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  trips: Trip[];
  vehicles: Vehicle[];
  maintenanceTasks?: MaintenanceTask[];
}

const DriverSummaryModal: React.FC<DriverSummaryModalProps> = ({
  isOpen,
  onClose,
  driver,
  trips,
  vehicles,
  maintenanceTasks = []
}) => {
  if (!isOpen) return null;

  // Filter trips for this driver
  const driverTrips = trips.filter(trip => trip.driver_id === driver.id)
    .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());

  // Get last 5 trips
  const lastTrips = driverTrips.slice(0, 5);

  // Get primary vehicle
  const primaryVehicle = vehicles.find(v => v.id === driver.primary_vehicle_id);

  // Calculate total metrics
  const totalDistance = driverTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
  const totalFuelCost = driverTrips.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0);
  const totalRoadExpenses = driverTrips.reduce((sum, trip) => sum + (trip.total_road_expenses || 0), 0);

  // Calculate documentation expenses for assigned vehicle
  const documentationExpenses = primaryVehicle ? (
    (primaryVehicle.insurance_premium_amount || 0) +
    (primaryVehicle.fitness_cost || 0) +
    (primaryVehicle.permit_cost || 0) +
    (primaryVehicle.puc_cost || 0) +
    (primaryVehicle.tax_amount || 0)
  ) : 0;

  // Get maintenance events for assigned vehicle
  const vehicleMaintenanceTasks = maintenanceTasks.filter(task => 
    task.vehicle_id === driver.primary_vehicle_id
  );

  // Calculate total downtime
  const totalDowntime = vehicleMaintenanceTasks.reduce((sum, task) => 
    sum + (task.downtime_days || 0), 0
  );

  // Prepare KM/day chart data
  const kmPerDayData = driverTrips.slice(0, 10).map(trip => {
    const tripDate = parseISO(trip.trip_end_date);
    const distance = trip.end_km - trip.start_km;
    
    return {
      date: isValid(tripDate) ? format(tripDate, 'MMM dd') : 'Invalid',
      km: distance
    };
  }).reverse();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Truck className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{driver.name}</h2>
              <p className="text-sm text-gray-500">License: {driver.license_number || driver.dl_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Trips</p>
                  <p className="text-2xl font-bold text-blue-900">{driverTrips.length}</p>
                </div>
                <Truck className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Distance</p>
                  <p className="text-2xl font-bold text-green-900">{totalDistance.toLocaleString()} km</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">Fuel Costs</p>
                  <p className="text-2xl font-bold text-amber-900">₹{totalFuelCost.toLocaleString()}</p>
                </div>
                <Fuel className="h-6 w-6 text-amber-500" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Downtime</p>
                  <p className="text-2xl font-bold text-red-900">{totalDowntime} days</p>
                </div>
                <Tool className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </div>

          {/* Last 5 Trips */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="text-lg font-medium text-gray-900">Recent Trips</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mileage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lastTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(parseISO(trip.trip_end_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {trip.trip_serial_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(trip.end_km - trip.start_km).toLocaleString()} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trip.calculated_kmpl ? `${trip.calculated_kmpl.toFixed(2)} km/L` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{((trip.total_fuel_cost || 0) + (trip.total_road_expenses || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Fuel Expenses</h4>
              <p className="text-2xl font-bold text-amber-600">₹{totalFuelCost.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">From {driverTrips.filter(t => t.refueling_done).length} refueling trips</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Road Expenses</h4>
              <p className="text-2xl font-bold text-blue-600">₹{totalRoadExpenses.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Tolls, permits, misc</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Documentation</h4>
              <p className="text-2xl font-bold text-purple-600">₹{documentationExpenses.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Insurance, permits, etc</p>
            </div>
          </div>

          {/* KM/Day Trend Chart */}
          {kmPerDayData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Distance Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kmPerDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} km`, 'Distance']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="km" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default DriverSummaryModal;