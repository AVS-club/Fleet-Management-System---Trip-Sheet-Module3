import React, { useMemo, useState, useEffect } from 'react';
import { Trip, Vehicle, Driver, Warehouse } from '@/types';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { 
  MapPin, User, Truck, Calendar, Fuel, DollarSign, 
  Edit2, Eye, TrendingUp, AlertTriangle, Clock, 
  Building2, Package, Navigation, ChevronRight,
  Activity, Target, IndianRupee, ArrowRight
} from 'lucide-react';
import { getWarehouse, getDestinationByAnyId } from '../../utils/storage';

interface TripListViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  warehouses?: Warehouse[];
  onSelectTrip: (trip: Trip) => void;
  onPnlClick?: (e: React.MouseEvent, trip: Trip) => void;
  onEditTrip?: (trip: Trip) => void;
  highlightTripId?: string | null;
}

// Component to handle destination loading for individual trips
const TripDestinationDisplay: React.FC<{ trip: Trip }> = ({ trip }) => {
  const [warehouseData, setWarehouseData] = useState<any>(null);
  const [destinationData, setDestinationData] = useState<any[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);

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
            console.error('Error fetching warehouse:', error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              setLoadingError('Unable to load warehouse data due to connection issues');
            } else {
              if (!warehouseData) {
                setLoadingError('Unable to load warehouse data');
              }
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
                  console.warn(`Destination ${id} not found or error fetching:`, error);
                  return null;
                }
              })
            );
            const validDestinations = destinations.filter(d => d !== null);
            setDestinationData(validDestinations);
            
            if (validDestinations.length === 0) {
              setLoadingError('Unable to load trip destinations');
            }
          } catch (error) {
            console.error('Error fetching destinations:', error);
            setLoadingError('Error loading trip destinations');
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              setLoadingError('Unable to load some trip locations');
            }
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setLoadingError('Failed to load trip details');
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          setLoadingError('Unable to load trip details');
        }
      }
    };
    
    fetchData();
  }, [trip.warehouse_id, trip.destinations, warehouseData]);

  // Use saved destination_display for efficiency
  if (trip.destination_display) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-gray-400" />
        <span className="text-gray-600 truncate">{trip.destination_display}</span>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500 italic">{loadingError}</span>
      </div>
    );
  }

  if (warehouseData && destinationData.length > 0) {
    // Fallback for older trips without destination_display
    return (
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
    );
  }

  // Show loading state or fallback when data is not available
  return (
    <div className="flex items-center gap-2 text-sm">
      <MapPin className="h-4 w-4 text-gray-400" />
      <span className="text-gray-500 italic">No trip locations found</span>
    </div>
  );
};

const TripListView: React.FC<TripListViewProps> = ({ 
  trips, 
  vehicles, 
  drivers,
  warehouses = [],
  onSelectTrip,
  onPnlClick,
  onEditTrip,
  highlightTripId
}) => {
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  
  // Create lookup maps
  const vehiclesMap = useMemo(() => 
    new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  
  const driversMap = useMemo(() => 
    new Map(drivers.map(d => [d.id, d])), [drivers]);
  
  const warehousesMap = useMemo(() => 
    new Map(warehouses.map(w => [w.id, w])), [warehouses]);
  
  const displayTrips = Array.isArray(trips) ? trips : [];
  
  // Calculate performance metrics
  const getPerformanceMetrics = (trip: Trip) => {
    const expectedMileage = 15; // Default expected
    const mileageStatus = trip.calculated_kmpl 
      ? trip.calculated_kmpl >= expectedMileage ? 'good' : 'poor' 
      : 'unknown';
    
    const deviationStatus = trip.route_deviation 
      ? Math.abs(trip.route_deviation) <= 5 ? 'normal' : 
        Math.abs(trip.route_deviation) <= 10 ? 'moderate' : 'high'
      : 'normal';
    
    const costPerKm = trip.total_expenses && trip.total_distance 
      ? (trip.total_expenses / trip.total_distance).toFixed(2)
      : null;
    
    return { mileageStatus, deviationStatus, costPerKm };
  };
  
  return (
    <div className="space-y-3">
      {displayTrips.length > 0 ? (
        displayTrips.map(trip => {
          const vehicle = vehiclesMap.get(trip.vehicle_id);
          const driver = driversMap.get(trip.driver_id);
          const warehouse = warehousesMap.get(trip.warehouse_id);
          const isExpanded = expandedTrip === trip.id;
          const metrics = getPerformanceMetrics(trip);
          const isHighlighted = highlightTripId === trip.id;
          
          const dateString = trip.trip_end_date || trip.trip_start_date || trip.created_at;
          const tripDate = dateString ? parseISO(dateString) : null;
          const formattedDate = tripDate && isValid(tripDate) 
            ? format(tripDate, 'dd MMM yyyy')
            : '-';
          
          const daysAgo = tripDate ? differenceInDays(new Date(), tripDate) : null;
          const distance = trip.end_km && trip.start_km ? trip.end_km - trip.start_km : 0;
          
          return (
            <div 
              key={trip.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${
                isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              {/* Main Content Row */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => onSelectTrip(trip)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Section - Trip Info */}
                  <div className="flex-1 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-lg">
                          <Navigation className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {trip.trip_serial_number}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{formattedDate}</span>
                            {daysAgo !== null && (
                              <span className="text-gray-400">({daysAgo} days ago)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {trip.refueling_done && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                            Refueled
                          </span>
                        )}
                        {metrics.deviationStatus === 'high' && (
                          <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full font-medium">
                            High Deviation
                          </span>
                        )}
                        {metrics.mileageStatus === 'good' && (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">
                            Good Mileage
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Vehicle */}
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Vehicle</p>
                          <p className="text-sm font-medium text-gray-900">
                            {vehicle?.registration_number || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Driver */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Driver</p>
                          <p className="text-sm font-medium text-gray-900">
                            {driver?.name || '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Distance */}
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Distance</p>
                          <p className="text-sm font-medium text-gray-900">
                            {distance > 0 ? `${distance.toFixed(1)} km` : '-'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Expenses */}
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Total Expenses</p>
                          <p className="text-sm font-medium text-gray-900">
                            {trip.total_expenses ? `₹${trip.total_expenses.toLocaleString()}` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Route Info */}
                    <TripDestinationDisplay trip={trip} />
                  </div>
                  
                  {/* Right Section - Metrics & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Performance Indicators */}
                    <div className="grid grid-cols-2 gap-2 text-right">
                      {/* Mileage */}
                      {trip.calculated_kmpl && (
                        <div className={`px-3 py-2 rounded-lg ${
                          metrics.mileageStatus === 'good' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className="text-xs text-gray-600">Mileage</p>
                          <p className={`text-sm font-bold ${
                            metrics.mileageStatus === 'good' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {trip.calculated_kmpl.toFixed(2)} km/L
                          </p>
                        </div>
                      )}
                      
                      {/* Cost per KM */}
                      {metrics.costPerKm && (
                        <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-600">Cost/km</p>
                          <p className="text-sm font-bold text-gray-900">
                            ₹{metrics.costPerKm}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTrip(isExpanded ? null : trip.id);
                        }}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {onEditTrip && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTrip(trip);
                          }}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit Trip"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      
                      {onPnlClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPnlClick(e, trip);
                          }}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="P&L Analysis"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* KM Readings */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">KM Readings</p>
                      <p className="font-medium">
                        {trip.start_km?.toLocaleString() || '-'} → {trip.end_km?.toLocaleString() || '-'}
                      </p>
                    </div>
                    
                    {/* Fuel Details */}
                    {trip.fuel_quantity && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fuel</p>
                        <p className="font-medium">
                          {trip.fuel_quantity.toFixed(1)}L @ ₹{trip.refueling_rate || '-'}/L
                        </p>
                      </div>
                    )}
                    
                    {/* Warehouse */}
                    {warehouse && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Warehouse</p>
                        <p className="font-medium flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {warehouse.name}
                        </p>
                      </div>
                    )}
                    
                    {/* Deviation */}
                    {trip.route_deviation && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Route Deviation</p>
                        <p className={`font-medium ${
                          Math.abs(trip.route_deviation) > 8 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {trip.route_deviation > 0 ? '+' : ''}{trip.route_deviation.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    
                    {/* Toll & Other Expenses */}
                    {trip.toll_amount && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Toll Amount</p>
                        <p className="font-medium">₹{trip.toll_amount.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {/* Driver Allowance */}
                    {trip.driver_allowance && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Driver Allowance</p>
                        <p className="font-medium">₹{trip.driver_allowance.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {/* Customer */}
                    {trip.customer_name && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Customer</p>
                        <p className="font-medium">{trip.customer_name}</p>
                      </div>
                    )}
                    
                    {/* Payment Mode */}
                    {trip.payment_mode && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Payment Mode</p>
                        <p className="font-medium capitalize">{trip.payment_mode}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Deviation Reason if high */}
                  {trip.deviation_reason && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-gray-600 mb-1">Deviation Reason</p>
                      <p className="text-sm text-gray-900">{trip.deviation_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No trips found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default TripListView;
