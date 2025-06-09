import { format, isValid, parseISO } from 'date-fns';
import { Trip, Vehicle, Driver } from '../../types';
import { Truck, User, Calendar, LocateFixed, Fuel, MapPin, IndianRupee, ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { getWarehouse, getDestination } from '../../utils/storage';

interface TripCardProps {
  trip: Trip;
  vehicle: Vehicle | undefined;
  driver: Driver | undefined;
  onClick?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, vehicle, driver, onClick }) => {
  const [warehouseData, setWarehouseData] = useState<any>(null);
  const [destinationData, setDestinationData] = useState<any[]>([]);

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
    };
    
    fetchData();
  }, [trip.warehouse_id, trip.destinations]);
  
  const distance = trip.end_km - trip.start_km;
  
  // Parse and validate the date
  const tripStartDate = trip.trip_start_date ? parseISO(trip.trip_start_date) : null;
  const formattedDate = tripStartDate && isValid(tripStartDate) 
    ? format(tripStartDate, 'dd MMM yyyy')
    : 'Invalid Date';

  const totalExpenses = (trip.total_road_expenses || 0) + (trip.total_fuel_cost || 0);
  
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
            <h3 className="text-gray-900 font-medium">{trip.trip_serial_number}</h3>
            <p className="text-sm text-gray-500">{formattedDate}</p>
          </div>
        </div>
        
        {trip.short_trip && (
          <span className="bg-gray-100 text-gray-600 text-xs py-1 px-2 rounded-full">
            Local Trip
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {vehicle ? vehicle.registration_number : 'Unknown Vehicle'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {driver ? driver.name : 'Unknown Driver'}
            </span>
          </div>
        </div>

        {warehouseData && destinationData.length > 0 && (
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

        {trip.route_deviation && (
          <div className={`mt-2 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
            Math.abs(trip.route_deviation) > 15
              ? 'bg-error-50 text-error-700'
              : Math.abs(trip.route_deviation) > 5
              ? 'bg-warning-50 text-warning-700'
              : 'bg-success-50 text-success-700'
          }`}>
            <span>Deviation: {trip.route_deviation > 0 ? '+' : ''}{trip.route_deviation}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripCard;