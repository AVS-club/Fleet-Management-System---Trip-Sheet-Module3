import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, differenceInDays } from 'date-fns';
import { nanoid } from 'nanoid';
import { Trip, TripFormData, Vehicle, Driver, Warehouse, Destination, RouteAnalysis, Alert } from '../../types';
import { getVehicles, getDrivers, getWarehouses, getDestinations, getDestination, analyzeRoute, getTrips, createDestination, getVehicle } from '../../utils/storage';
import { analyzeTripAndGenerateAlerts } from '../../utils/aiAnalytics';
import { Calendar, Fuel, MapPin, FileText, Truck, IndianRupee, Weight, AlertTriangle, Package, ArrowLeftRight, Repeat, Info, Loader, Settings } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import CurrencyInput from '../ui/CurrencyInput';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import FileUpload from '../ui/FileUpload';
import WarehouseSelector from './WarehouseSelector';
import DestinationSelector from './DestinationSelector';
import TripMap from '../maps/TripMap';
import RouteAnalysisComponent from './RouteAnalysis';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import CollapsibleSection from '../ui/CollapsibleSection';
import { estimateTollCost } from '../../utils/tollEstimator';
import MaterialSelector from './MaterialSelector';
import { toast } from 'react-toastify';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  initialData?: Partial<TripFormData>;
  isSubmitting?: boolean;
}

const TripForm: React.FC<TripFormProps> = ({
  onSubmit,
  initialData = {},
  isSubmitting = false
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [frequentWarehouses, setFrequentWarehouses] = useState<Warehouse[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [lastTripMileage, setLastTripMileage] = useState<number | undefined>();
  const [tripIdPreview, setTripIdPreview] = useState<string>('');
  const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | undefined>();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isReturnTrip, setIsReturnTrip] = useState(initialData.is_return_trip || false);
  const [originalDestinations, setOriginalDestinations] = useState<string[]>([]);
  const [estimatedTollCost, setEstimatedTollCost] = useState<number | null>(null);
  const [tollLoading, setTollLoading] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors }
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: format(new Date(), 'yyyy-MM-dd'),
      trip_end_date: format(new Date(), 'yyyy-MM-dd'),
      refueling_done: false,
      is_return_trip: false,
      manual_trip_id: false,
      unloading_expense: 0,
      driver_expense: 0,
      road_rto_expense: 0,
      breakdown_expense: 0,
      miscellaneous_expense: 0,
      gross_weight: 0,
      warehouse_id: '',
      destinations: [],
      material_type_ids: [],
      ...initialData
    }
  });

  const vehicleId = watch('vehicle_id');
  const refuelingDone = watch('refueling_done');
  const startKm = watch('start_km');
  const endKm = watch('end_km');
  const tripStartDate = watch('trip_start_date');
  const tripEndDate = watch('trip_end_date');
  const fuelQuantity = watch('fuel_quantity');
  const fuelCost = watch('fuel_cost');
  const unloadingExpense = watch('unloading_expense') || 0;
  const driverExpense = watch('driver_expense') || 0;
  const roadRtoExpense = watch('road_rto_expense') || 0;
  const breakdownExpense = watch('breakdown_expense') || 0;
  const miscellaneousExpense = watch('miscellaneous_expense') || 0;
  const warehouseId = watch('warehouse_id');
  const selectedDestinations = watch('destinations') || [];
  const materialTypeIds = watch('material_type_ids') || [];

  // Calculate total expenses in real-time
  const totalExpenses = useMemo(() => {
    return unloadingExpense + driverExpense + roadRtoExpense + breakdownExpense + miscellaneousExpense;
  }, [unloadingExpense, driverExpense, roadRtoExpense, breakdownExpense, miscellaneousExpense]);

  // Convert destination IDs to destination objects for the map (with safety checks)
  const selectedDestinationObjects = useMemo(() => {
    if (!Array.isArray(selectedDestinations) || !Array.isArray(allDestinations)) {
      return [];
    }
    return selectedDestinations
      .map(id => allDestinations.find(d => d.id === id) || null)
      .filter((d): d is Destination => d !== null);
  }, [selectedDestinations, allDestinations]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [vehiclesData, driversData, warehousesData, destinationsData, materialTypesData, tripsData] = await Promise.all([
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations(),
          getMaterialTypes(),
          getTrips()
        ]);
        
        // Filter out archived vehicles
        const activeVehicles = Array.isArray(vehiclesData) ? vehiclesData.filter(v => v.status !== 'archived') : [];
        setVehicles(activeVehicles);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setAllDestinations(Array.isArray(destinationsData) ? destinationsData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
        
        // Calculate frequent warehouses
        if (Array.isArray(tripsData) && Array.isArray(warehousesData)) {
          const warehouseCounts = tripsData.reduce((acc, trip) => {
            if (trip.warehouse_id) {
              acc[trip.warehouse_id] = (acc[trip.warehouse_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
          
          // Sort warehouses by frequency and take top 3
          const topWarehouses = Object.entries(warehouseCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => warehousesData.find(w => w.id === id))
            .filter((w): w is Warehouse => w !== undefined);
          
          setFrequentWarehouses(topWarehouses);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Update vehicle and last trip mileage when vehicle changes
  useEffect(() => {
    if (vehicleId) {
      const fetchVehicleData = async () => {
        try {
          // Find vehicle in local state first
          let vehicle = Array.isArray(vehicles) ? vehicles.find(v => v.id === vehicleId) : undefined;
          
          // If not found, try to fetch it directly
          if (!vehicle) {
            const fetchedVehicle = await getVehicle(vehicleId);
            if (fetchedVehicle) {
              vehicle = fetchedVehicle;
              setSelectedVehicle(vehicle);
            }
          } else {
            setSelectedVehicle(vehicle);
          }

          // Auto-fill start KM based on trip type and manual override
          if (!manualOverride) {
            if (refuelingDone) {
              // Get the last refueling trip's end_km
              const tripsData = await getTrips();
              const vehicleTrips = Array.isArray(tripsData) 
                ? tripsData
                    .filter(trip => trip.vehicle_id === vehicleId && trip.refueling_done)
                    .sort((a, b) => new Date(b.trip_end_date || 0).getTime() - new Date(a.trip_end_date || 0).getTime())
                : [];

              const lastRefuelingTrip = vehicleTrips[0];
              if (lastRefuelingTrip) {
                setLastTripMileage(lastRefuelingTrip.end_km);
                setValue('start_km', lastRefuelingTrip.end_km);
              } else if (vehicle) {
                setLastTripMileage(vehicle.current_odometer);
                setValue('start_km', vehicle.current_odometer);
              }
            } else {
              // Get the last trip's end_km
              const tripsData = await getTrips();
              const vehicleTrips = Array.isArray(tripsData) 
                ? tripsData
                    .filter(trip => trip.vehicle_id === vehicleId)
                    .sort((a, b) => new Date(b.trip_end_date || 0).getTime() - new Date(a.trip_end_date || 0).getTime())
                : [];

              const lastTrip = vehicleTrips[0];
              if (lastTrip) {
                setLastTripMileage(lastTrip.end_km);
                setValue('start_km', lastTrip.end_km);
              } else if (vehicle) {
                setLastTripMileage(vehicle.current_odometer);
                setValue('start_km', vehicle.current_odometer);
              }
            }
          }
          
          // Auto-fill driver if vehicle has a primary driver
          if (vehicle && vehicle.primary_driver_id) {
            setValue('driver_id', vehicle.primary_driver_id);
          }
        } catch (error) {
          console.error('Error fetching vehicle data:', error);
        }
      }
      
      fetchVehicleData();
    }
  }, [vehicleId, vehicles, refuelingDone, setValue, manualOverride]);

  useEffect(() => {
    if (tripStartDate && tripEndDate) {
      const duration = differenceInDays(new Date(tripEndDate), new Date(tripStartDate));
      setValue('trip_duration', Math.max(0, duration));
    }
  }, [tripStartDate, tripEndDate, setValue]);

  useEffect(() => {
    setValue('total_road_expenses', totalExpenses);
  }, [totalExpenses, setValue]);

  useEffect(() => {
    if (fuelQuantity && fuelCost) {
      setValue('total_fuel_cost', fuelQuantity * fuelCost);
    }
  }, [fuelQuantity, fuelCost, setValue]);

  // Fetch toll estimates when route is selected
  useEffect(() => {
    const fetchTollEstimate = async () => {
      // Only fetch toll estimates if we have all required data
      if (!warehouseId || !vehicleId || !Array.isArray(selectedDestinations) || selectedDestinations.length === 0) {
        return;
      }
      
      setTollLoading(true);
      try {
        const tollData = await estimateTollCost(warehouseId, selectedDestinations, vehicleId);
        
        if (tollData) {
          let cost = tollData.estimatedTollCost;
          
          // Double the toll cost for return trips
          if (isReturnTrip) {
            cost *= 2;
          }
          
          setEstimatedTollCost(cost);
          
          // Store the estimated toll cost in the form data
          setValue('estimated_toll_cost', cost);
        } else {
          setEstimatedTollCost(null);
        }
      } catch (error) {
        console.error('Error fetching toll estimate:', error);
        setEstimatedTollCost(null);
      } finally {
        setTollLoading(false);
      }
    };
    
    fetchTollEstimate();
  }, [warehouseId, vehicleId, selectedDestinations, isReturnTrip, setValue]);

  useEffect(() => {
    const fetchRouteAnalysis = async () => {
      if (!warehouseId || !Array.isArray(selectedDestinations) || selectedDestinations.length === 0 || 
          !startKm || !endKm || endKm <= startKm) {
        return;
      }
      
      const analysis = await analyzeRoute(warehouseId, selectedDestinations);
      if (analysis) {
        const actualDistance = endKm - startKm;
        const updatedAnalysis: RouteAnalysis = {
          ...analysis,
          deviation: ((actualDistance - analysis.standard_distance) / analysis.standard_distance) * 100
        };
        setRouteAnalysis(updatedAnalysis);

        // Generate alerts based on current trip data
        const tripData: Trip = {
          id: nanoid(),
          vehicle_id: vehicleId,
          driver_id: watch('driver_id'),
          warehouse_id: warehouseId,
          destinations: selectedDestinations,
          trip_start_date: watch('trip_start_date'),
          trip_end_date: watch('trip_end_date'),
          trip_duration: watch('trip_duration') || 0,
          trip_serial_number: '', // This will be generated on submit
          manual_trip_id: watch('manual_trip_id') || false,
          start_km: startKm,
          end_km: endKm,
          gross_weight: watch('gross_weight') || 0,
          refueling_done: watch('refueling_done'),
          fuel_quantity: watch('fuel_quantity'),
          fuel_cost: watch('fuel_cost'),
          total_fuel_cost: watch('total_fuel_cost'),
          unloading_expense: watch('unloading_expense') || 0,
          driver_expense: watch('driver_expense') || 0,
          road_rto_expense: watch('road_rto_expense') || 0,
          breakdown_expense: watch('breakdown_expense') || 0,
          miscellaneous_expense: watch('miscellaneous_expense') || 0,
          total_road_expenses: watch('total_road_expenses') || 0,
          remarks: watch('remarks'),
          calculated_kmpl: watch('calculated_kmpl'),
          material_type_ids: watch('material_type_ids'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Fetch trips for alert generation
        try {
          const tripsData = await getTrips();
          const generatedAlerts = await analyzeTripAndGenerateAlerts(
            tripData,
            updatedAnalysis,
            tripsData
          );
          setAlerts(Array.isArray(generatedAlerts) ? generatedAlerts : []);
        } catch (error) {
          console.error('Error generating alerts:', error);
          setAlerts([]);
        }
      }
    };
    
    fetchRouteAnalysis();
    
    // Reset if conditions aren't met
    if (!warehouseId || !Array.isArray(selectedDestinations) || selectedDestinations.length === 0 || 
        !startKm || !endKm || endKm <= startKm) {
      setRouteAnalysis(undefined);
      setAlerts([]);
    }
  }, [warehouseId, selectedDestinations, startKm, endKm, vehicleId, watch]);

  const validateEndKm = (value: number) => {
    return !startKm || value > startKm || 'End KM must be greater than Start KM';
  };

  const calculateDistance = () => {
    if (startKm && endKm && endKm > startKm) {
      return endKm - startKm;
    }
    return undefined;
  };

  const distance = calculateDistance();

  const handleAlertAction = (accepted: boolean, notes?: string) => {
    setValue('alert_accepted', accepted);
    setValue('alert_notes', notes || '');
  };

  // Handle adding and selecting a new destination from Google Maps
  const handleAddAndSelectDestination = async (destination: Destination) => {
    // First, save the destination to storage
    const savedDestination = await createDestination(destination);
    
    if (savedDestination) {
      // Update the list of all destinations
      const updatedDestinations = await getDestinations();
      setAllDestinations(Array.isArray(updatedDestinations) ? updatedDestinations : []);
      
      // Add the new destination to the selected destinations
      const currentSelected = watch('destinations') || [];
      setValue('destinations', [...currentSelected, savedDestination.id]);
    } else {
      console.error("Failed to save the new destination.");
      toast.error("Failed to save the new destination.");
    }
  };

  const handleReturnTripToggle = (checked: boolean) => {
    setIsReturnTrip(checked);
    setValue('is_return_trip', checked);
    
    if (checked && Array.isArray(selectedDestinations) && selectedDestinations.length > 0) {
      // Store original destinations if not already stored
      if (originalDestinations.length === 0) {
        setOriginalDestinations([...selectedDestinations]);
      }
      
      // Create a return trip by adding the destinations in reverse order
      // Skip the first destination (origin) to avoid duplication
      const returnDestinations = [...selectedDestinations, ...selectedDestinations.slice(0, -1).reverse()];
      setValue('destinations', returnDestinations);
    } else if (!checked && originalDestinations.length > 0) {
      // Restore original destinations
      setValue('destinations', originalDestinations);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="ml-3 text-gray-600">Loading form data...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-4xl mx-auto">
      {/* Trip Type Section */}
      <CollapsibleSection 
        title="Trip Type" 
        icon={<Repeat className="h-5 w-5" />}
        iconColor="text-slate-600"
        defaultExpanded={true}
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <Controller
              control={control}
              name="refueling_done"
              render={({ field: { value, onChange, ...field } }) => (
                <Checkbox
                  label="Refueling Trip"
                  checked={value}
                  onChange={e => onChange(e.target.checked)}
                  {...field}
                  helperText="Mileage will be calculated from last refueling"
                />
              )}
            />
          </div>
          
          <div className="flex items-center">
            <Checkbox
              label="Return Trip"
              checked={isReturnTrip}
              onChange={e => handleReturnTripToggle(e.target.checked)}
              helperText="Vehicle returns to origin. Route distance doubled."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Basic Information */}
      <CollapsibleSection 
        title="Basic Information" 
        icon={<Truck className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="vehicle_id"
            rules={{ required: 'Vehicle is required' }}
            render={({ field }) => (
              <Select
                label="Vehicle"
                options={[
                  { value: '', label: 'Select Vehicle*' },
                  ...vehicles.map(vehicle => ({
                    value: vehicle.id,
                    label: `${vehicle.registration_number.toUpperCase()} - ${vehicle.make} ${vehicle.model}`
                  }))
                ]}
                error={errors.vehicle_id?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="driver_id"
            rules={{ required: 'Driver is required' }}
            render={({ field }) => (
              <div className="relative">
                <Select
                  key={field.value} // Add key to force re-render on value change
                  label="Driver"
                  options={[
                    { value: '', label: 'Select Driver*' },
                    ...drivers.map(driver => ({
                      value: driver.id,
                      label: driver.name
                    }))
                  ]}
                  error={errors.driver_id?.message}
                  required
                  {...field}
                />
                {selectedVehicle?.primary_driver_id === field.value && field.value && (
                  <span className="absolute top-0 right-0 bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                    Auto-filled
                  </span>
                )}
              </div>
            )}
          />
        </div>

        {/* Trip Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Trip Start Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.trip_start_date?.message}
            required
            {...register('trip_start_date', { required: 'Trip start date is required' })}
          />

          <Input
            label="Trip End Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.trip_end_date?.message}
            required
            {...register('trip_end_date', { required: 'Trip end date is required' })}
          />
        </div>
      </CollapsibleSection>

      {/* Route Information */}
      <CollapsibleSection 
        title="Route Information" 
        icon={<MapPin className="h-5 w-5" />}
        iconColor="text-red-600"
        defaultExpanded={true}
      >
        <Controller
          control={control}
          name="warehouse_id"
          rules={{ required: 'Origin warehouse is required' }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <WarehouseSelector
              warehouses={warehouses}
              frequentWarehouses={frequentWarehouses}
              selectedWarehouse={value}
              onChange={onChange}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="destinations"
          rules={{ 
            required: 'At least one destination is required',
            validate: value => (value && value.length > 0) || 'At least one destination is required'
          }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <DestinationSelector
              destinations={allDestinations}
              selectedDestinations={value || []}
              onChange={onChange}
              warehouse={warehouses.find(w => w.id === warehouseId)}
              error={error?.message}
              onAddAndSelectDestination={handleAddAndSelectDestination}
            />
          )}
        />

        {/* Estimated Toll Cost Section */}
        {(tollLoading || estimatedTollCost !== null) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <IndianRupee className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div className="flex-1">
                <h4 className="text-blue-700 font-medium">Estimated FASTag Toll Cost</h4>
                {tollLoading ? (
                  <div className="flex items-center mt-2">
                    <Loader className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                    <p className="text-blue-600 text-sm">Calculating toll estimates...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-blue-600 text-lg font-semibold mt-1">
                      ₹{estimatedTollCost?.toFixed(2)}
                    </p>
                    <p className="text-blue-500 text-xs mt-1">
                      Approximate tolls based on standard FASTag rates; may vary.
                      {isReturnTrip && " Return trip costs included."}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Material Types Section */}
        <div className="space-y-4">
          <Controller
            control={control}
            name="material_type_ids"
            rules={{ 
              required: 'Material carried is required',
              validate: value => (value && value.length > 0) || 'At least one material type is required'
            }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <MaterialSelector
                selectedMaterials={value || []}
                onChange={onChange}
                error={error?.message}
              />
            )}
          />
        </div>

        {warehouseId && Array.isArray(selectedDestinations) && selectedDestinations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h4 className="text-base font-medium text-gray-800">Route Preview</h4>
            {selectedDestinationObjects.length > 0 && (
              <TripMap
                warehouse={warehouses.find(w => w.id === warehouseId)}
                destinations={selectedDestinationObjects}
                className="h-[300px]"
              />
            )}
          </div>
        )}

        {routeAnalysis && (
          <RouteAnalysisComponent
            analysis={routeAnalysis}
            alerts={alerts}
            onAlertAction={handleAlertAction}
          />
        )}
      </CollapsibleSection>

      {/* Odometer & Load Section */}
      <CollapsibleSection 
        title="Odometer & Load" 
        icon={<Truck className="h-4 w-4 sm:h-5 sm:w-5" />}
        iconColor="text-gray-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className={`relative ${lastTripMileage && !manualOverride ? 'bg-blue-50 rounded-lg' : ''}`}>
            <Input
              label="Start KM"
              type="number"
              error={errors.start_km?.message}
              required
              disabled={!manualOverride}
              className={lastTripMileage && !manualOverride ? 'border-blue-300 bg-blue-50' : ''}
              {...register('start_km', {
                required: {
                  value: true,
                  message: 'Start KM is required'
                },
                valueAsNumber: true,
                min: {
                  value: 0,
                  message: 'Start KM must be a positive number'
                }
              })}
            />
            {lastTripMileage && !manualOverride && (
              <div className="absolute -top-1 right-0 bg-blue-100 text-blue-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full max-w-[90%] truncate">
                Auto-filled
              </div>
            )}
            <div className="mt-2">
              <Checkbox
                label="Manual Override"
                checked={manualOverride}
                onChange={e => setManualOverride(e.target.checked)}
                size="sm"
              />
            </div>
          </div>

          <Input
            label="End KM"
            type="number"
            error={errors.end_km?.message}
            required
            inputMode="numeric"
            pattern="[0-9]*"
            {...register('end_km', {
              required: {
                value: true,
                message: 'End KM is required'
              },
              valueAsNumber: true,
              validate: validateEndKm,
              min: {
                value: 0,
                message: 'End KM must be a positive number'
              }
            })}
          />

          <Input
            label="Gross Weight (Kgs)"
            type="number"
            icon={<Weight className="h-4 w-4" />}
            error={errors.gross_weight?.message}
            required
            inputMode="numeric"
            pattern="[0-9]*"
            {...register('gross_weight', {
              required: 'Gross weight is required',
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Gross weight must be a positive number'
              }
            })}
          />
        </div>

        {/* Route Distance & Deviation Display */}
        {distance && routeAnalysis && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900 text-sm">Route Analysis</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Google Route:</span>
                <p className="font-medium">{routeAnalysis.standard_distance.toFixed(1)} km</p>
              </div>
              <div>
                <span className="text-gray-600">Odometer Distance:</span>
                <p className="font-medium">{distance.toFixed(1)} km</p>
              </div>
              <div>
                <span className="text-gray-600">Deviation:</span>
                <p className={`font-medium ${Math.abs(routeAnalysis.deviation) > 8 ? 'text-error-600' : 'text-success-600'}`}>
                  {routeAnalysis.deviation > 0 ? '+' : ''}{routeAnalysis.deviation.toFixed(1)}%
                </p>
              </div>
            </div>
            {Math.abs(routeAnalysis.deviation) > 8 && (
              <div className="bg-warning-50 border border-warning-200 rounded-md p-3 mt-2">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-warning-500 mr-2" />
                  <p className="text-warning-700 text-sm">
                    High route deviation detected. This trip will be flagged for AI review.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {refuelingDone && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <h4 className="font-medium text-gray-900 text-sm sm:text-base">Fuel Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Fuel Quantity (Litres)"
                type="number"
                inputMode="decimal"
                icon={<Fuel className="h-4 w-4" />}
                step="0.01"
                error={errors.fuel_quantity?.message}
                {...register('fuel_quantity', {
                  required: refuelingDone ? 'Fuel quantity is required when refueling' : false,
                  valueAsNumber: true,
                  min: {
                    value: 0.1,
                    message: 'Fuel quantity must be greater than 0'
                  }
                })}
              />

              <CurrencyInput
                label="Fuel Cost (/L)"
                step="0.01"
                error={errors.fuel_cost?.message}
                {...register('fuel_cost', {
                  required: refuelingDone ? 'Fuel cost is required when refueling' : false,
                  valueAsNumber: true,
                  min: {
                    value: 0.1,
                    message: 'Fuel cost must be greater than 0'
                  }
                })}
              />
            </div>

            {fuelQuantity && fuelCost && (
              <div className="bg-secondary-50 p-2 sm:p-3 rounded-md">
                <p className="text-secondary-700 font-medium text-sm">
                  Total Fuel Cost: ₹{(fuelQuantity * fuelCost).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Trip Expenses Section */}
      <CollapsibleSection 
        title="Trip Expenses" 
        icon={<IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />}
        iconColor="text-green-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <CurrencyInput
            label="Unloading Expense"
            {...register('unloading_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.unloading_expense?.message}
          />

          <CurrencyInput
            label="Driver Bata"
            {...register('driver_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.driver_expense?.message}
          />

          <CurrencyInput
            label="Road/RTO Expense"
            {...register('road_rto_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.road_rto_expense?.message}
          />

          <CurrencyInput
            label="Breakdown Expense"
            {...register('breakdown_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.breakdown_expense?.message}
          />

          <CurrencyInput
            label="Miscellaneous"
            {...register('miscellaneous_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.miscellaneous_expense?.message}
          />
        </div>

        <div className="mt-3 sm:mt-4 bg-primary-50 p-2 sm:p-3 rounded-md">
          <p className="text-primary-700 font-medium text-sm">
            Total Trip Expenses: ₹{totalExpenses.toLocaleString()}
            {estimatedTollCost ? ` + ₹${estimatedTollCost.toFixed(2)} (FASTag)` : ''}
          </p>
        </div>
      </CollapsibleSection>

      {/* Attachments & Notes Section */}
      <CollapsibleSection 
        title="Attachments & Notes" 
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={false}
      >
        <Controller
          control={control}
          name="fuel_bill_file"
          render={({ field: { value, onChange, ...field } }) => (
            <FileUpload
              label="Trip Slip / Fuel Bill"
              value={value as File[] | undefined}
              onChange={onChange}
              accept=".jpg,.jpeg,.png"
              multiple={false}
              helperText="Upload trip slip or fuel bill (JPG, PNG only)"
              {...field}
            />
          )}
        />

        <Input
          label="Remarks/Notes"
          placeholder="Enter any additional information about this trip"
          icon={<FileText className="h-4 w-4" />}
          error={errors.remarks?.message}
          {...register('remarks')}
        />
      </CollapsibleSection>

      {/* Smart Suggestions */}
      {isReturnTrip && distance && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
            <div>
              <h4 className="text-blue-700 font-medium">Return Trip Information</h4>
              <p className="text-blue-600 text-sm mt-1">
                This is a return trip to the origin warehouse. The estimated round trip distance is approximately {distance * 2} km.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
        <Button
          type="submit"
          isLoading={isSubmitting}
          variant="primary"
          disabled={loading}
        >
          {initialData.vehicle_id ? 'Update Trip' : 'Add Trip'}
        </Button>
      </div>
    </form>
  );
};

export default TripForm;