import React, { useMemo, useRef, useState } from 'react';
import { Trip, Vehicle, Driver } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { Fuel, Edit2, DollarSign, MapPin, User, Truck, Calendar, Camera, RefreshCw } from 'lucide-react';
import { uploadFilesAndGetPublicUrls } from '../../utils/supabaseStorage';
import { toast } from 'react-toastify';

interface TripListViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onSelectTrip: (trip: Trip) => void;
  onPnlClick?: (e: React.MouseEvent, trip: Trip) => void;
  onEditTrip?: (trip: Trip) => void;
}

const TripListView: React.FC<TripListViewProps> = ({ 
  trips, 
  vehicles, 
  drivers, 
  onSelectTrip,
  onPnlClick,
  onEditTrip
}) => {
  
  const vehiclesMap = useMemo(() => {
    return Array.isArray(vehicles)
      ? new Map(vehicles.map(v => [v.id, v]))
      : new Map<string, Vehicle>();
  }, [vehicles]);

  const driversMap = useMemo(() => {
    return Array.isArray(drivers)
      ? new Map(drivers.map(d => [d.id, d]))
      : new Map<string, Driver>();
  }, [drivers]);
  
  const displayTrips = Array.isArray(trips) ? trips : [];
  
  return (
    <div className="space-y-2">
      {displayTrips.length > 0 ? (
        displayTrips.map(trip => {
          const vehicle = vehiclesMap.get(trip.vehicle_id);
          const driver = driversMap.get(trip.driver_id);
          const dateString = trip.trip_end_date || trip.trip_start_date || trip.created_at;
          const tripDate = dateString ? parseISO(dateString) : null;
          const formattedDate = tripDate && isValid(tripDate) 
            ? format(tripDate, 'dd MMM yyyy')
            : '-';
          const distance = trip.end_km && trip.start_km 
            ? trip.end_km - trip.start_km
            : 0;
          const mileage = distance && trip.fuel_quantity 
            ? (distance / trip.fuel_quantity).toFixed(2) 
            : '-';
          
          // Extract trip serial number parts for compact display
          const serialParts = trip.trip_serial_number?.split('-') || [];
          const compactSerial = serialParts.length > 1 
            ? `${serialParts[0]}-${serialParts[serialParts.length - 1]}` 
            : trip.trip_serial_number;
          
          // Component state for upload
          const fileInputRef = useRef<HTMLInputElement>(null);
          const [isUploading, setIsUploading] = useState(false);
          
          const handleCameraClick = () => {
            fileInputRef.current?.click();
          };
          
          const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !trip.id) return;
            
            setIsUploading(true);
            try {
              const uploadedUrls = await uploadFilesAndGetPublicUrls(
                'trip-docs',
                `${trip.id}/attachments`,
                [file]
              );
              
              if (uploadedUrls.length > 0) {
                toast.success('Image uploaded successfully');
              } else {
                throw new Error('No URLs returned from upload');
              }
            } catch (error) {
              console.error('Error uploading image:', error);
              toast.error('Failed to upload image');
            } finally {
              setIsUploading(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }
          };
          
          return (
            <div 
              key={trip.id}
              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onSelectTrip(trip)}
            >
              <div className="flex items-center justify-between">
                {/* Left side - Trip info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Trip ID with fuel indicator */}
                  <div className="flex items-center gap-2">
                    {trip.refueling_done && (
                      <Fuel className="h-4 w-4 text-accent-600" />
                    )}
                    <span className="font-medium text-sm text-gray-900" title={trip.trip_serial_number}>
                      {compactSerial}
                    </span>
                  </div>
                  
                  {/* Action buttons - easily accessible on the left */}
                  <div className="flex items-center gap-1">
                    {onPnlClick && (
                      <button 
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPnlClick(e, trip);
                        }}
                        title="View P&L"
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCameraClick();
                      }}
                      title="Upload Image"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                    {onEditTrip && (
                      <button 
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTrip(trip);
                        }}
                        title="Edit Trip"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {/* Date */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                  
                  {/* Vehicle */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Truck className="h-3.5 w-3.5" />
                    <span>{vehicle?.registration_number || '-'}</span>
                  </div>
                  
                  {/* Driver */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <User className="h-3.5 w-3.5" />
                    <span>{driver?.name || '-'}</span>
                  </div>
                  
                  {/* Destination */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{trip.destination_names?.join(', ') || '-'}</span>
                  </div>
                </div>
                
                {/* Right side - Metrics */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Distance</div>
                    <div className="text-sm font-medium text-gray-900">
                      {distance ? `${distance.toFixed(1)} km` : '-'}
                    </div>
                  </div>
                  {trip.refueling_done && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Mileage</div>
                      <div className="text-sm font-medium text-gray-900">
                        {mileage !== '-' ? `${mileage} km/L` : '-'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">No trips found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default TripListView;