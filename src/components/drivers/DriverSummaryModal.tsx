import React from 'react';
import { Driver, Trip, Vehicle } from '../../types';
import { MaintenanceTask } from '../../types/maintenance';
import { User, Calendar, Truck, TrendingUp, Clock, CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import { format } from 'date-fns';

interface DriverSummaryModalProps {
  open: boolean;
  onClose: () => void;
  driver: Driver;
  trips: Trip[];
  maintenanceTasks: MaintenanceTask[];
  vehicle?: Vehicle | null;
}

const DriverSummaryModal: React.FC<DriverSummaryModalProps> = ({
  open,
  onClose,
  driver,
  trips,
  maintenanceTasks,
  vehicle
}) => {
  if (!open) return null;

  const totalTrips = Array.isArray(trips) ? trips.length : 0;
  const totalDistance = Array.isArray(trips)
    ? trips.reduce((sum, t) => sum + (t.end_km - t.start_km), 0)
    : 0;
  const totalFuel = Array.isArray(trips)
    ? trips.reduce((sum, t) => sum + (t.fuel_quantity || 0), 0)
    : 0;
  const avgMileage = totalFuel > 0 ? totalDistance / totalFuel : 0;
  const lastTrip = Array.isArray(trips) && trips.length > 0
    ? trips.reduce<Trip | null>((latest, t) => {
        const cur = t.trip_end_date ? new Date(t.trip_end_date) : new Date(0);
        if (!latest) return t;
        const latestDate = latest.trip_end_date ? new Date(latest.trip_end_date) : new Date(0);
        return cur > latestDate ? t : latest;
      }, null)
    : null;
  const lastTripDate = lastTrip?.trip_end_date
    ? format(new Date(lastTrip.trip_end_date), 'dd MMM yyyy')
    : 'N/A';
  const maintenanceCost = Array.isArray(maintenanceTasks)
    ? maintenanceTasks.reduce(
        (sum, t) => sum + (t.actual_cost || t.estimated_cost || 0),
        0
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] bg-white rounded-lg shadow-xl">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Driver Summary</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Total Trips" value={totalTrips} icon={<Truck className="h-5 w-5 text-primary-600" />} />
            <StatCard title="Total Distance" value={totalDistance.toLocaleString()} subtitle="km" icon={<TrendingUp className="h-5 w-5 text-primary-600" />} />
            <StatCard title="Total Fuel" value={totalFuel.toLocaleString()} subtitle="L" icon={<Fuel className="h-5 w-5 text-primary-600" />} />
            <StatCard title="Avg Mileage" value={avgMileage ? avgMileage.toFixed(2) : '-'} subtitle="km/L" icon={<Gauge className="h-5 w-5 text-primary-600" />} />
            <StatCard title="Last Trip" value={lastTripDate} icon={<Calendar className="h-5 w-5 text-primary-600" />} />
            <StatCard title="Maintenance Spend" value={`₹${maintenanceCost.toLocaleString('en-IN')}`} icon={<Wrench className="h-5 w-5 text-primary-600" />} />
          </div>

          <div className="bg-gray-50 p-3 rounded space-y-1">
            <p className="text-sm font-medium text-gray-700">{driver.name}</p>
            <p className="text-sm text-gray-500">License: {driver.license_number}</p>
            {vehicle && (
              <p className="text-sm text-gray-500">Vehicle: {vehicle.registration_number}</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default DriverSummaryModal;