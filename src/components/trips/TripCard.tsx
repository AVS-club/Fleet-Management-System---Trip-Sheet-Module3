import { getWarehouse, getDestination, getDestinationByAnyId } from '../../utils/storage';
import { Trip, Vehicle, Driver } from '@/types';
import { Truck, User, Calendar, LocateFixed, Fuel, MapPin, IndianRupee, ArrowRight, Edit, Camera, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useRef, memo } from 'react';
import { parseISO, isValid, format } from 'date-fns';
import { truncateString } from '../../utils/format';
import { uploadFilesAndGetPublicUrls } from '../../utils/supabaseStorage';
import { toast } from 'react-toastify';
import config from '../../utils/env';
import SearchHighlightedText from './SearchHighlightedText';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TripCard');

interface TripCardProps {
  trip: Trip;
  vehicle: Vehicle | undefined;
  driver: Driver | undefined;
  onClick?: () => void;
  onPnlClick?: (e: React.MouseEvent, trip: Trip) => void;
  onEditClick?: (trip: Trip) => void;
  searchTerm?: string;
}

const TripCard: React.FC<TripCardProps> = memo(({ trip, vehicle, driver, onClick, onPnlClick, onEditClick, searchTerm }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [warehouseData, setWarehouseData] = useState<any>(null);
  const warehouseDataRef = useRef<any>(null);
  const [destinationData, setDestinationData] = useState<any[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    warehouseDataRef.current = warehouseData;
  }, [warehouseData]);

  // Fetch warehouse and destinations data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingError(null);
        
        if (trip.warehouse_id) {
          try {
            const warehouse = await getWarehouse(trip.warehouse_id);
            setWarehouseData(warehouse);
          } catch (error) {
            logger.error('Error fetching warehouse:', error);
            // Set loading error for warehouse failures
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              setLoadingError('Unable to load warehouse data due to connection issues');
            } else {
              // Only set error if warehouse_id exists but data is null
              if (!warehouseDataRef.current) {
                setLoadingError('Unable to load warehouse data');
              }
              setLoadingError('Unable to load warehouse data due to connection issues');
            }
          }
        }
        
        if (Array.isArray(trip.destinations) && trip.destinations.length > 0) {
          try {
            const destinations = await Promise.all(
              trip.destinations.map(async (id) => {
                try {
                  return await getDestinationByAnyId(id);
                } catch (error) {
                  if (config.isDev) logger.warn(`Destination ${id} not found or error fetching:`, error);
                  return null;
                }
              })
            );
            const validDestinations = destinations.filter(d => d !== null);
            setDestinationData(validDestinations);
            
            // If we have destination IDs but no valid destinations loaded, show error
            if (validDestinations.length === 0) {
              setLoadingError('Unable to load trip destinations');
            }
          } catch (error) {
            logger.error('Error fetching destinations:', error);
            setLoadingError('Error loading trip destinations');
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              setLoadingError('Unable to load some trip locations');
            }
          }
        }
      } catch (error) {
        logger.error('Error in fetchData:', error);
        setLoadingError('Failed to load trip details');
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          setLoadingError('Unable to load trip details');
        }
      }
    };
    
    fetchData();
  }, [trip.warehouse_id, trip.destinations]); // Remove warehouseData dependency to prevent loops
  
  const distance = trip.end_km - trip.start_km;
  
  // Parse and validate the date
  const tripStartDate = trip.trip_start_date ? parseISO(trip.trip_start_date) : null;
  const formattedDate = tripStartDate && isValid(tripStartDate) 
    ? format(tripStartDate, 'dd MMM yyyy')
    : 'Invalid Date';

  // Calculate total expenses consistently with other parts of the system
  const totalExpenses = (trip.total_fuel_cost || 0) + 
                       (trip.unloading_expense || 0) + 
                       (trip.driver_expense || 0) + 
                       (trip.road_rto_expense || 0) + 
                       (trip.miscellaneous_expense || 0);
  
  // Determine profit status color
  const getProfitStatusColor = () => {
    if (!trip.profit_status) return '';
    
    switch (trip.profit_status) {
      case 'profit': return 'text-green-600';
      case 'loss': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return '';
    }
  };

  const handleCameraClick = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      logger.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div 
      className="card p-4 cursor-pointer hover:bg-gray-50 transition-colors animate-fade-in"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {trip.refueling_done ? (
            <div className="bg-accent-100 text-accent-700 p-1.5 rounded-full">
              <Fuel className="h-5 w-5" />
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-600 p-1.5 rounded-full">
              <LocateFixed className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="text-base text-gray-900 font-medium">
              <SearchHighlightedText 
                text={trip.trip_serial_number} 
                searchTerm={searchTerm || ''} 
              />
            </p>
            <p className="text-sm text-gray-500">{formattedDate}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* P&L Button */}
          <button 
            className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (onPnlClick) onPnlClick(e, trip);
            }}
            title="Profit & Loss"
          >
            <IndianRupee className="h-4 w-4" />
          </button>
          
          {/* Camera Button */}
          <button 
            className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors disabled:opacity-50"
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
          
          {/* Edit Button */}
          {onEditClick && (
            <button 
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(trip);
              }}
              title="Edit Trip"
            >
              <Edit className="h-4 w-4" />
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
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {vehicle && (vehicle.vehicle_photo_url || vehicle.photo_url) ? (
              <img
                src={vehicle.vehicle_photo_url || vehicle.photo_url}
                alt="Vehicle"
                className="h-6 w-6 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <Truck className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-gray-600">
              <SearchHighlightedText
                text={vehicle ? vehicle.registration_number : 'Unknown Vehicle'}
                searchTerm={searchTerm || ''}
              />
            </span>
          </div>
          <div className="flex items-center gap-2">
            {driver && (driver.driver_photo_url || driver.photo_url) ? (
              <img
                src={driver.driver_photo_url || driver.photo_url}
                alt="Driver"
                className="h-6 w-6 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <User className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-gray-600">
              <SearchHighlightedText
                text={driver ? driver.name : 'Unknown Driver'}
                searchTerm={searchTerm || ''}
              />
            </span>
          </div>
        </div>

        {/* Route - Use saved destination_display for efficiency */}
        {trip.destination_display ? (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 truncate">{trip.destination_display}</span>
          </div>
        ) : loadingError ? (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 italic">{loadingError}</span>
          </div>
        ) : warehouseData && destinationData.length > 0 ? (
          // Fallback for older trips without destination_display
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-1 text-gray-600 overflow-hidden">
              <span className="truncate max-w-[100px]">{warehouseData.name}</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[100px]">
                {destinationData[0]?.name}
              </span>
              {destinationData.length > 1 && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  +{destinationData.length - 1}
                </span>
              )}
            </div>
          </div>
        ) : (
          // Show loading state or fallback when data is not available
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 italic">No trip locations found</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-500 block">Distance</span>
            <span className="font-medium text-primary-600">
              {distance.toLocaleString()} km
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 block">Mileage</span>
            <span className={`font-medium ${
              trip.calculated_kmpl ? 'text-success-600' : 'text-gray-400'
            }`}>
              {trip.calculated_kmpl ? `${trip.calculated_kmpl.toFixed(1)} km/L` : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 block">Fuel</span>
            <span className="font-medium text-gray-900">
              {trip.fuel_quantity ? `${trip.fuel_quantity}L` : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 block">Expenses</span>
            <span className="font-medium text-gray-900">
              ₹{totalExpenses.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {trip.route_deviation && (() => {
            // Recalculate deviation for return trips with wrong values
            let displayDeviation = trip.route_deviation;
            if (trip.is_return_trip && Math.abs(trip.route_deviation) > 100 && trip.start_km && trip.end_km) {
              const actualDistance = trip.end_km - trip.start_km;
              const impliedStandardDistance = actualDistance / (1 + trip.route_deviation / 100);
              const correctStandardDistance = impliedStandardDistance * 2;
              displayDeviation = ((actualDistance - correctStandardDistance) / correctStandardDistance) * 100;
            }
            
            return (
              <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                Math.abs(displayDeviation) > 15
                  ? 'bg-error-50 text-error-700'
                  : Math.abs(displayDeviation) > 5
                  ? 'bg-warning-50 text-warning-700'
                  : 'bg-success-50 text-success-700'
              }`}>
                <span>Deviation: {displayDeviation > 0 ? '+' : ''}{displayDeviation.toFixed(1)}%</span>
              </div>
            );
          })()}
          
          {/* P&L Status Badge */}
          {trip.profit_status && (
            <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
              trip.profit_status === 'profit'
                ? 'bg-success-50 text-success-700'
                : trip.profit_status === 'loss'
                ? 'bg-error-50 text-error-700'
                : 'bg-gray-50 text-gray-700'
            }`}>
              <span>
                {trip.profit_status === 'profit' ? 'Profit' : 
                 trip.profit_status === 'loss' ? 'Loss' : 'Break-even'}
                {trip.net_profit !== undefined && `: ₹${Math.abs(trip.net_profit).toLocaleString()}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.trip.id === nextProps.trip.id &&
    prevProps.trip.updated_at === nextProps.trip.updated_at &&
    prevProps.vehicle?.id === nextProps.vehicle?.id &&
    prevProps.driver?.id === nextProps.driver?.id
  );
});

TripCard.displayName = 'TripCard';

export default TripCard;