import React from 'react';
import { Truck, Calendar, FileText, Fuel, MapPin } from 'lucide-react';
import { Vehicle } from '@/types';

interface VehicleSummaryChipsProps {
  vehicle: Vehicle;
  className?: string;
}

const VehicleSummaryChips: React.FC<VehicleSummaryChipsProps> = ({ 
  vehicle,
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Make & Model */}
      <div className="flex items-center bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full text-xs md:text-sm">
        <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
        {vehicle.make} {vehicle.model}
      </div>

      {/* Year */}
      <div className="flex items-center bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-xs md:text-sm">
        <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
        {vehicle.year}
      </div>

      {/* Fuel Type */}
      <div className="flex items-center bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 px-3 py-1.5 rounded-full text-xs md:text-sm capitalize">
        <Fuel className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
        {vehicle.fuel_type}
      </div>

      {/* Odometer */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs md:text-sm">
        <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
        {vehicle.current_odometer?.toLocaleString()} km
      </div>
    </div>
  );
};

export default VehicleSummaryChips;