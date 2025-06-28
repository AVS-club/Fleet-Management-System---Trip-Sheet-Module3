import React from 'react';
import { User, Truck, Calendar, Phone, Mail, FileText } from 'lucide-react';
import { Driver, Vehicle } from '../../types';

interface DriverSummaryChipsProps {
  driver: Driver;
  vehicle?: Vehicle | null;
  className?: string;
}

const DriverSummaryChips: React.FC<DriverSummaryChipsProps> = ({ 
  driver, 
  vehicle,
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Driver Name */}
      <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm">
        <User className="h-4 w-4 mr-1.5" />
        {driver.name}
      </div>
      
      {/* License */}
      <div className="flex items-center bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm">
        <FileText className="h-4 w-4 mr-1.5" />
        {driver.license_number}
      </div>
      
      {/* Experience */}
      <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm">
        <Calendar className="h-4 w-4 mr-1.5" />
        {driver.experience_years} years
      </div>
      
      {/* Contact */}
      {driver.contact_number && (
        <div className="flex items-center bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-sm">
          <Phone className="h-4 w-4 mr-1.5" />
          {driver.contact_number}
        </div>
      )}
      
      {/* Email (if available) */}
      {driver.email && (
        <div className="flex items-center bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full text-sm">
          <Mail className="h-4 w-4 mr-1.5" />
          {driver.email}
        </div>
      )}
      
      {/* Vehicle (if assigned) */}
      {vehicle && (
        <div className="flex items-center bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm">
          <Truck className="h-4 w-4 mr-1.5" />
          {vehicle.registration_number}
        </div>
      )}
    </div>
  );
};

export default DriverSummaryChips;