import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Trip, Vehicle, Driver } from '../../types';
import Button from '../ui/Button';
import { Calendar, MapPin, Truck, User, FileText, Fuel, AlertTriangle, ChevronLeft, Trash2, Edit } from 'lucide-react';

interface TripDetailsProps {
  trip: Trip;
  vehicle: Vehicle | null | undefined;
  driver: Driver | null | undefined;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TripDetails: React.FC<TripDetailsProps> = ({ 
  trip, 
  vehicle, 
  driver, 
  onBack, 
  onEdit,
  onDelete
}) => {
  const distance = trip.end_km - trip.start_km;

  // Parse and validate dates
  const tripStartDate = trip.trip_start_date ? parseISO(trip.trip_start_date) : null;
  const tripEndDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
  const createdAt = trip.created_at ? parseISO(trip.created_at) : null;

  const formattedStartDate = tripStartDate && isValid(tripStartDate) 
    ? format(tripStartDate, 'MMMM dd, yyyy')
    : 'Invalid Date';

  const formattedEndDate = tripEndDate && isValid(tripEndDate)
    ? format(tripEndDate, 'MMMM dd, yyyy')
    : 'Invalid Date';

  const formattedCreatedAt = createdAt && isValid(createdAt)
    ? format(createdAt, 'MMMM dd, yyyy')
    : 'Unknown Date';
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          icon={<ChevronLeft className="h-4 w-4" />}
          onClick={onBack}
        >
          Back to Trips
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit className="h-4 w-4" />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            Trip {trip.trip_serial_number}
            {trip.short_trip && (
              <span className="ml-3 bg-gray-100 text-gray-600 text-xs py-1 px-2 rounded-full">
                Local Trip
              </span>
            )}
          </h2>
          
          {trip.refueling_done && (
            <div className="bg-accent-100 text-accent-700 py-1 px-3 rounded-full text-sm font-medium flex items-center">
              <Fuel className="h-4 w-4 mr-1" />
              Refueling Trip
            </div>
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Trip Start Date</h3>
                <p className="text-gray-900">{formattedStartDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Trip End Date</h3>
                <p className="text-gray-900">{formattedEndDate}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
                <p className="text-gray-900">
                  {vehicle ? (
                    `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
                  ) : (
                    'Unknown Vehicle'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Driver</h3>
                <p className="text-gray-900">
                  {driver ? driver.name : 'Unknown Driver'}
                </p>
              </div>
            </div>
            
            {trip.station && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Station/Location</h3>
                  <p className="text-gray-900">{trip.station}</p>
                </div>
              </div>
            )}
            
            {trip.remarks && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Remarks</h3>
                  <p className="text-gray-900">{trip.remarks}</p>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Trip Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Start Reading</p>
                  <p className="text-xl font-semibold">{trip.start_km.toLocaleString()} km</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">End Reading</p>
                  <p className="text-xl font-semibold">{trip.end_km.toLocaleString()} km</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Distance</p>
                  <p className="text-xl font-semibold text-primary-600">{distance.toLocaleString()} km</p>
                </div>
                
                {trip.refueling_done && (
                  <div>
                    <p className="text-sm text-gray-500">Fuel Added</p>
                    <p className="text-xl font-semibold">{trip.fuel_quantity?.toLocaleString()} L</p>
                  </div>
                )}
              </div>
              
              {trip.calculated_kmpl && (
                <div className="mt-4 p-3 bg-success-50 rounded-md border border-success-200 flex items-center gap-3">
                  <div className="bg-success-100 rounded-full p-2">
                    <Fuel className="h-5 w-5 text-success-500" />
                  </div>
                  <div>
                    <p className="text-success-700 font-medium">Mileage Calculated</p>
                    <p className="text-success-600 text-sm">
                      This trip achieved <span className="font-bold">{trip.calculated_kmpl.toFixed(2)} km/L</span>
                    </p>
                  </div>
                </div>
              )}
              
              {trip.short_trip && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md border border-gray-200 flex items-center gap-3">
                  <div className="bg-gray-200 rounded-full p-2">
                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium">Local/Short Trip</p>
                    <p className="text-gray-600 text-sm">
                      This trip is excluded from mileage calculations
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {trip.fuel_bill_url && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Fuel Receipt</h3>
                <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">Receipt Document</span>
                  </div>
                  <a 
                    href={trip.fuel_bill_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Receipt
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetails;