```tsx
import React from 'react';
import { Truck, Users, Package, Wrench, ShieldCheck, IndianRupee } from 'lucide-react';
import { Vehicle, Driver, Trip } from '../types';
import { format } from 'date-fns';

interface SnapshotStripProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
}

const SnapshotStrip: React.FC<SnapshotStripProps> = ({ vehicles, drivers, trips }) => {
  // Calculate metrics
  const totalActiveVehicles = vehicles.filter(v => v.status === 'active').length;
  const vehiclesUnderMaintenance = vehicles.filter(v => v.status === 'maintenance').length;

  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const idleDrivers = drivers.filter(d => d.status === 'inactive' || d.status === 'onLeave').length;
  const licensesExpiringSoon = drivers.filter(d => {
    if (!d.license_expiry_date) return false;
    const expiryDate = new Date(d.license_expiry_date);
    const today = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(today.getDate() + 30);
    return expiryDate > today && expiryDate <= thirtyDays;
  }).length;

  const tripsThisMonth = trips.filter(trip => {
    const tripDate = new Date(trip.trip_start_date);
    const now = new Date();
    return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
  }).length;

  const underMaintenanceCount = vehiclesUnderMaintenance; // Reusing the count from above

  // Placeholder for Docs OK% and Estimated Savings
  const docsOkPercent = 85; // Dummy value
  const estimatedSavings = 15000; // Dummy value

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <span className="rounded-full px-3 py-1 bg-[#E9F8F2] text-[#0A7F5D] text-sm flex items-center">
        <Truck className="h-4 w-4 mr-1" />
        Vehicles: {totalActiveVehicles} active / {vehiclesUnderMaintenance} maint.
      </span>
      <span className="rounded-full px-3 py-1 bg-[#E9F8F2] text-[#0A7F5D] text-sm flex items-center">
        <Users className="h-4 w-4 mr-1" />
        Drivers: {activeDrivers} active / {idleDrivers} idle
        {licensesExpiringSoon > 0 && ` (${licensesExpiringSoon} expiring)`}
      </span>
      <span className="rounded-full px-3 py-1 bg-[#E9F8F2] text-[#0A7F5D] text-sm flex items-center">
        <Package className="h-4 w-4 mr-1" />
        Trips this month: {tripsThisMonth}
      </span>
      <span className="rounded-full px-3 py-1 bg-[#E9F8F2] text-[#0A7F5D] text-sm flex items-center">
        <Wrench className="h-4 w-4 mr-1" />
        Under Maintenance: {underMaintenanceCount}
      </span>
      <span className="rounded-full px-3 py-1 bg-[#E9F8F2] text-[#0A7F5D] text-sm flex items-center">
        <ShieldCheck className="h-4 w-4 mr-1" />
        Docs OK%: {docsOkPercent}%
      </span>
      <span className="rounded-full px-3 py-1 bg-[#E9F8F2] text-[#0A7F5D] text-sm flex items-center">
        <IndianRupee className="h-4 w-4 mr-1" />
        Est. Savings: ₹{estimatedSavings.toLocaleString()}
      </span>
    </div>
  );
};

export default SnapshotStrip;
```