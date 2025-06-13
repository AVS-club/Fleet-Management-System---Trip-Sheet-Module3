import React, { useState, useEffect } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Trip, Vehicle, Driver, Warehouse, Destination } from '../../types';
import Button from '../ui/Button';
import { Calendar, MapPin, Truck, User, FileText, Fuel, AlertTriangle, ChevronLeft, Trash2, Edit, Package, Weight, IndianRupee, ArrowRight, Paperclip, ArrowLeftRight } from 'lucide-react';
import { getWarehouse, getDestination, getMaterialTypes } from '../../utils/storage';
import CollapsibleSection from '../ui/CollapsibleSection';

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
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch warehouse
        if (trip.warehouse_id) {
          const warehouseData = await getWarehouse(trip.warehouse_id);
          setWarehouse(warehouseData);
        }

        // Fetch destinations
        if (Array.isArray(trip.destinations) && trip.destinations.length > 0) {
          const destinationsData = await Promise.all(
            trip.destinations.map(id => getDestination(id))
          );
          setDestinations(destinationsData.filter(Boolean));
        }

        // Fetch material types
        if (Array.isArray(trip.material_type_ids) && trip.material_type_ids.length > 0) {
          const types = await getMaterialTypes();
          setMaterialTypes(types);
        }
      } catch (error) {
        console.error('Error fetching trip related data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trip]);

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

  // Calculate total expenses
  const totalExpenses = (trip.total_road_expenses || 0) + (trip.total_fuel_cost || 0);

  // Get material names from IDs
  const materialNames = Array.isArray(trip.material_type_ids) && Array.isArray(materialTypes) 
    ? trip.material_type_ids
        .map(id => materialTypes.find(type => type.id === id)?.name)
        .filter(Boolean)
    : [];

  // Format gross weight to tons if over 1000kg
  const formattedWeight = trip.gross_weight >= 1000 
    ? `${(trip.gross_weight / 1000).toFixed(1)} tons` 
    : `${trip.gross_weight} kg`;

  // Determine if trip has significant route deviation
  const hasSignificantDeviation = trip.route_deviation && Math.abs(trip.route_deviation) > 15;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Trips
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            icon={<Edit className="h-4 w-4" />}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            Trip {trip.trip_serial_number}
            {trip.short_trip && (
              <span className="ml-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs py-1 px-2 rounded-full">
                Local Trip
              </span>
            )}
          </h2>
          
          <div className="flex items-center space-x-3">
            {trip.refueling_done && (
              <div className="bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 py-1 px-3 rounded-full text-sm font-medium flex items-center">
                <Fuel className="h-4 w-4 mr-1" />
                Refueling Trip
              </div>
            )}
            
            {/* Return Trip Indicator - NEW */}
            {trip.is_return_trip && (
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-1 px-3 rounded-full text-sm font-medium flex items-center">
                <ArrowLeftRight className="h-4 w-4 mr-1" />
                Return Trip
              </div>
            )}
          </div>
        </div>
        
        {/* AI Alert Banner - NEW */}
        {hasSignificantDeviation && (
          <div className="bg-error-50 dark:bg-error-900/20 border-b border-error-200 dark:border-error-800 px-6 py-3 flex items-center">
            <AlertTriangle className="h-5 w-5 text-error-500 dark:text-error-400 mr-2" />
            <p className="text-error-700 dark:text-error-300 text-sm">
              Route deviation exceeded {Math.abs(trip.route_deviation).toFixed(1)}% from standard distance
            </p>
          </div>
        )}
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trip Info Section - ENHANCED */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <FileText className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
              Trip Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trip Dates</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formattedStartDate} to {formattedEndDate}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Duration: {trip.trip_duration} day(s)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Vehicle</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {vehicle ? (
                      `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
                    ) : (
                      'Unknown Vehicle'
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Driver</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {driver ? driver.name : 'Unknown Driver'}
                  </p>
                </div>
              </div>
              
              {/* Origin & Destinations - ENHANCED */}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Route</h4>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-primary-500 dark:bg-primary-400 mr-2"></div>
                      <p className="text-gray-900 dark:text-gray-100">
                        {warehouse?.name || 'Unknown Origin'}
                      </p>
                    </div>
                    
                    {destinations.map((dest, index) => (
                      <div key={dest.id} className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-secondary-500 dark:bg-secondary-400 mr-2"></div>
                        <p className="text-gray-900 dark:text-gray-100">
                          {dest.name}
                          {dest.standard_distance && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ({dest.standard_distance} km)
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Materials Carried - NEW */}
              {materialNames.length > 0 && (
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Materials Carried</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {materialNames.map((name, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Gross Weight - NEW */}
              <div className="flex items-start gap-3">
                <Weight className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Gross Weight</h4>
                  <p className="text-gray-900 dark:text-gray-100">{formattedWeight}</p>
                </div>
              </div>
              
              {trip.remarks && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Remarks</h4>
                    <p className="text-gray-900 dark:text-gray-100">{trip.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Trip Metrics - ENHANCED */}
          <div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Trip Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start Reading</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{trip.start_km.toLocaleString()} km</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">End Reading</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{trip.end_km.toLocaleString()} km</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Distance</p>
                  <p className="text-xl font-semibold text-primary-600 dark:text-primary-400">{distance.toLocaleString()} km</p>
                </div>
                
                {trip.refueling_done && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fuel Added</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{trip.fuel_quantity?.toLocaleString()} L</p>
                  </div>
                )}

                {trip.fuel_cost && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fuel Rate</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">₹{trip.fuel_cost?.toLocaleString()}/L</p>
                  </div>
                )}

                {trip.total_fuel_cost && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fuel Cost</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">₹{trip.total_fuel_cost?.toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              {trip.calculated_kmpl && (
                <div className={`mt-4 p-3 rounded-md flex items-center gap-3 ${
                  trip.calculated_kmpl >= 6 
                    ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                    : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
                }`}>
                  <div className={`rounded-full p-2 ${
                    trip.calculated_kmpl >= 6 
                      ? 'bg-success-100 dark:bg-success-800'
                      : 'bg-warning-100 dark:bg-warning-800'
                  }`}>
                    <Fuel className={`h-5 w-5 ${
                      trip.calculated_kmpl >= 6 
                        ? 'text-success-500 dark:text-success-400'
                        : 'text-warning-500 dark:text-warning-400'
                    }`} />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      trip.calculated_kmpl >= 6 
                        ? 'text-success-700 dark:text-success-300'
                        : 'text-warning-700 dark:text-warning-300'
                    }`}>
                      Mileage: {trip.calculated_kmpl.toFixed(2)} km/L
                    </p>
                    <p className={`text-sm ${
                      trip.calculated_kmpl >= 6 
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-warning-600 dark:text-warning-400'
                    }`}>
                      {trip.calculated_kmpl >= 6 
                        ? 'Good fuel efficiency'
                        : 'Below average fuel efficiency'}
                    </p>
                  </div>
                </div>
              )}
              
              {trip.short_trip && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 flex items-center gap-3">
                  <div className="bg-gray-200 dark:bg-gray-600 rounded-full p-2">
                    <AlertTriangle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Local/Short Trip</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      This trip is excluded from mileage calculations
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Expense Breakdown - NEW */}
            <CollapsibleSection 
              title="Expense Breakdown" 
              icon={<IndianRupee className="h-5 w-5" />}
              iconColor="text-green-600 dark:text-green-400"
              defaultExpanded={true}
              className="mt-4"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {trip.unloading_expense > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-300">Unloading Expense</span>
                      <span className="font-medium">₹{trip.unloading_expense.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {trip.driver_expense > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-300">Driver Expense</span>
                      <span className="font-medium">₹{trip.driver_expense.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {trip.road_rto_expense > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-300">Road/RTO Expense</span>
                      <span className="font-medium">₹{trip.road_rto_expense.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {trip.breakdown_expense > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-300">Breakdown Expense</span>
                      <span className="font-medium">₹{trip.breakdown_expense.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {trip.miscellaneous_expense > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-300">Miscellaneous</span>
                      <span className="font-medium">₹{trip.miscellaneous_expense.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {trip.total_fuel_cost > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <span className="text-gray-600 dark:text-gray-300">Fuel Cost</span>
                      <span className="font-medium">₹{trip.total_fuel_cost.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md border border-primary-100 dark:border-primary-800">
                  <span className="font-medium text-primary-700 dark:text-primary-300">Total Expenses</span>
                  <span className="text-lg font-bold text-primary-700 dark:text-primary-300">₹{totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </CollapsibleSection>
            
            {/* Trip Slip Upload - ENHANCED */}
            {trip.fuel_bill_url && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trip Documentation</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <Paperclip className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                    <span className="text-gray-600 dark:text-gray-300">Trip Slip / Fuel Receipt</span>
                  </div>
                  <a 
                    href={trip.fuel_bill_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                  >
                    View Document
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