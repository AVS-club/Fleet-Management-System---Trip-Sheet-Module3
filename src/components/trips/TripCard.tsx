import { format, isValid, parseISO } from 'date-fns';
import { Trip, Vehicle, Driver } from '../../types';
import { Truck, User, Calendar, LocateFixed, Fuel, MapPin, IndianRupee, ArrowRight, Package, AlertTriangle, Paperclip, Weight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { getWarehouse, getDestination } from '../../utils/storage';
import { getMaterialTypes } from '../../utils/materialTypes';

interface TripCardProps {
  trip: Trip;
  vehicle: Vehicle | undefined;
  driver: Driver | undefined;
  onClick?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, vehicle, driver, onClick }) => {
  const [warehouseData, setWarehouseData] = useState<any>(null);
  const [destinationData, setDestinationData] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);

  // Fetch warehouse and destinations data
  useEffect(() => {
    const fetchData = async () => {
      if (trip.warehouse_id) {
        try {
          const warehouse = await getWarehouse(trip.warehouse_id);
          setWarehouseData(warehouse);
        } catch (error) {
          console.error('Error fetching warehouse:', error);
        }
      }
      
      if (Array.isArray(trip.destinations) && trip.destinations.length > 0) {
        try {
          const destinations = await Promise.all(
            trip.destinations.map(id => getDestination(id))
          );
          setDestinationData(destinations.filter(d => d !== null));
        } catch (error) {
          console.error('Error fetching destinations:', error);
        }
      }

      // Fetch material types if trip has material_type_ids
      if (Array.isArray(trip.material_type_ids) && trip.material_type_ids.length > 0) {
        try {
          const types = await getMaterialTypes();
          setMaterialTypes(types);
        } catch (error) {
          console.error('Error fetching material types:', error);
        }
      }
    };
    
    fetchData();
  }, [trip.warehouse_id, trip.destinations, trip.material_type_ids]);
  
  const distance = trip.end_km - trip.start_km;
  
  // Parse and validate the date
  const tripStartDate = trip.trip_start_date ? parseISO(trip.trip_start_date) : null;
  const formattedDate = tripStartDate && isValid(tripStartDate) 
    ? format(tripStartDate, 'dd MMM yyyy')
    : 'Invalid Date';

  const totalExpenses = (trip.total_road_expenses || 0) + (trip.total_fuel_cost || 0);

  // Get material names from IDs
  const materialNames = Array.isArray(trip.material_type_ids) && Array.isArray(materialTypes) 
    ? trip.material_type_ids
        .map(id => materialTypes.find(type => type.id === id)?.name)
        .filter(Boolean)
    : [];
  
  // Format gross weight to tons if over 1000kg
  const formattedWeight = trip.gross_weight >= 1000 
    ? `${(trip.gross_weight / 1000).toFixed(1)}T` 
    : `${trip.gross_weight}kg`;

  // Determine if trip has significant route deviation
  const hasRouteDeviation = trip.route_deviation && Math.abs(trip.route_deviation) > 5;
  
  return (
    <div 
      className="card p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors animate-fade-in"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {trip.refueling_done ? (
            <div className="bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 p-1.5 rounded-full">
              <Fuel className="h-5 w-5" />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 p-1.5 rounded-full">
              <LocateFixed className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="text-gray-900 dark:text-gray-100 font-medium">{trip.trip_serial_number}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
          </div>
        </div>
        
        {trip.short_trip && (
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs py-1 px-2 rounded-full">
            Local Trip
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-600 dark:text-gray-300">
              {vehicle ? vehicle.registration_number : 'Unknown Vehicle'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-600 dark:text-gray-300">
              {driver ? driver.name : 'Unknown Driver'}
            </span>
          </div>
        </div>

        {warehouseData && destinationData.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 overflow-hidden">
              <span className="truncate max-w-[100px]">{warehouseData.name}</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[100px]">
                {destinationData[0]?.name}
              </span>
              {destinationData.length > 1 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  +{destinationData.length - 1}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Material Types - NEW */}
        {materialNames.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <div className="text-gray-600 dark:text-gray-300 overflow-hidden">
              <span className="truncate">
                {materialNames.slice(0, 2).join(', ')}
                {materialNames.length > 2 && ` +${materialNames.length - 2} more`}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">Distance</span>
            <div className="flex items-center gap-1">
              <span className="font-medium text-primary-600 dark:text-primary-400">
                {distance.toLocaleString()} km
              </span>
              {/* Gross Weight - NEW */}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                • {formattedWeight}
              </span>
            </div>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">Mileage</span>
            <span className={`font-medium ${
              trip.calculated_kmpl ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {trip.calculated_kmpl ? `${trip.calculated_kmpl.toFixed(1)} km/L` : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">Fuel</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {trip.fuel_quantity ? `${trip.fuel_quantity}L` : '-'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">Expenses</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹{totalExpenses.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          {trip.route_deviation && (
            <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
              Math.abs(trip.route_deviation) > 15
                ? 'bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-400'
                : Math.abs(trip.route_deviation) > 5
                ? 'bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400'
                : 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400'
            }`}>
              {hasRouteDeviation && <AlertTriangle className="h-3 w-3" />}
              <span>Deviation: {trip.route_deviation > 0 ? '+' : ''}{trip.route_deviation}%</span>
            </div>
          )}

          {/* Trip Slip Indicator - NEW */}
          {trip.fuel_bill_url && (
            <div className="text-gray-500 dark:text-gray-400">
              <Paperclip className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripCard;