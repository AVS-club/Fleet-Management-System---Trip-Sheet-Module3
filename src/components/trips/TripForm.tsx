import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, differenceInDays } from 'date-fns';
import { nanoid } from 'nanoid';
import { Trip, TripFormData, Vehicle, Driver, Warehouse, Destination, RouteAnalysis, Alert } from '../../types';
import { getVehicles, getDrivers, getWarehouses, getDestinations, getDestination, analyzeRoute, getTrips, createDestination, getVehicle } from '../../utils/storage';
import { analyzeTripAndGenerateAlerts } from '../../utils/aiAnalytics';
import { Calendar, Fuel, MapPin, FileText, Truck, IndianRupee, Weight, AlertTriangle, Package, ArrowLeftRight, Repeat, Info } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import FileUpload from '../ui/FileUpload';
import WarehouseSelector from './WarehouseSelector';
import DestinationSelector from './DestinationSelector';
import TripMap from '../maps/TripMap';
import RouteAnalysisComponent from './RouteAnalysis';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import CollapsibleSection from '../ui/CollapsibleSection';

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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: format(new Date(), 'yyyy-MM-dd'),
      trip_end_date: format(new Date(), 'yyyy-MM-dd'),
      refueling_done: false,
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

          // If this is a refueling trip, get the last trip's end_km
          if (refuelingDone) {
            // Get all trips for this vehicle
            const tripsData = await getTrips();
            const vehicleTrips = Array.isArray(tripsData) 
              ? tripsData
                  .filter(trip => trip.vehicle_id === vehicleId)
                  .sort((a, b) => new Date(b.trip_end_date || 0).getTime() - new Date(a.trip_end_date || 0).getTime())
              : [];

            // Get the most recent trip
            const lastTrip = vehicleTrips[0];
            if (lastTrip) {
              setLastTripMileage(lastTrip.end_km);
              setValue('start_km', lastTrip.end_km);
            } else if (vehicle) {
              setLastTripMileage(vehicle.current_odometer);
              setValue('start_km', vehicle.current_odometer);
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
  }, [vehicleId, vehicles, refuelingDone, setValue]);

  useEffect(() => {
    if (tripStartDate && tripEndDate) {
      const duration = differenceInDays(new Date(tripEndDate), new Date(tripStartDate));
      setValue('trip_duration', Math.max(0, duration));
    }
  }, [tripStartDate, tripEndDate, setValue]);

  useEffect(() => {
    const total = unloadingExpense + driverExpense + roadRtoExpense + breakdownExpense + miscellaneousExpense;
    setValue('total_road_expenses', total);
  }, [unloadingExpense, driverExpense, roadRtoExpense, breakdownExpense, miscellaneousExpense, setValue]);

  useEffect(() => {
    if (fuelQuantity && fuelCost) {
      setValue('total_fuel_cost', fuelQuantity * fuelCost);
    }
  }, [fuelQuantity, fuelCost, setValue]);

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
          total_road_expenses: watch('total_road_expenses') || 0,
          short_trip: false, // Removed short_trip field
          remarks: watch('remarks'),
          calculated_kmpl: watch('calculated_kmpl'),
          material_type_ids: watch('material_type_ids'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Fetch trips for alert generation
        try {
          const tripsData = await getTrips();
          const generatedAlerts = analyzeTripAndGenerateAlerts(
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
    }
  };

  const handleReturnTripToggle = (checked: boolean) => {
    setIsReturnTrip(checked);
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
    return <div className="p-4 text-center">Loading form data...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Trip Type Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
          <Repeat className="h-5 w-5 mr-2 text-primary-500" />
          Trip Type
        </h3>
        
        <div className="flex flex-wrap gap-6">
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
              label="Return Trip to Origin"
              checked={isReturnTrip}
              onChange={e => handleReturnTripToggle(e.target.checked)}
              helperText="Vehicle will return to the origin warehouse. Route distance will be doubled."
            />
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                    label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
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
      </div>

      {/* Route Information */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-primary-500" />
          Route Information
        </h3>

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

        {/* Material Types Section */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-gray-800 flex items-center">
            <Package className="h-4 w-4 mr-2 text-gray-600" />
            Material Carried
          </h4>
          <p className="text-sm text-gray-500">Select the types of materials being transported</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {materialTypes.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-full">No material types available</p>
            ) : (
              materialTypes.map(type => (
                <div key={type.id} className="flex items-center">
                  <Controller
                    control={control}
                    name="material_type_ids"
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        id={`material-${type.id}`}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={field.value?.includes(type.id) || false}
                        onChange={(e) => {
                          const currentValues = field.value || [];
                          const newValues = e.target.checked
                            ? [...currentValues, type.id]
                            : currentValues.filter(id => id !== type.id);
                          field.onChange(newValues);
                        }}
                      />
                    )}
                  />
                  <label htmlFor={`material-${type.id}`} className="ml-2 text-sm text-gray-700 capitalize">
                    {type.name}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {warehouseId && Array.isArray(selectedDestinations) && selectedDestinations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h4 className="text-base font-medium text-gray-800">Route Preview</h4>
            {selectedDestinationObjects.length > 0 && (
              <TripMap
                warehouse={warehouses.find(w => w.id === warehouseId)}
                destinations={selectedDestinationObjects}
                className="h-[400px]"
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
      </div>

      {/* Odometer & Weight Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Odometer & Weight
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`relative ${lastTripMileage && refuelingDone ? 'bg-blue-50 rounded-lg' : ''}`}>
            <Input
              label="Start KM"
              type="number"
              error={errors.start_km?.message}
              required
              className={lastTripMileage && refuelingDone ? 'border-blue-300' : ''}
              {...register('start_km', {
                required: 'Start KM is required',
                valueAsNumber: true,
                min: {
                  value: 0,
                  message: 'Start KM must be a positive number'
                }
              })}
            />
            {lastTripMileage && refuelingDone && (
              <div className="absolute -top-1 right-0 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                Auto-filled from last trip
              </div>
            )}
          </div>

          <Input
            label="End KM"
            type="number"
            error={errors.end_km?.message}
            required
            {...register('end_km', {
              required: 'End KM is required',
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

        {refuelingDone && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-gray-900">Fuel Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Fuel Quantity (Litres)"
                type="number"
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

              <Input
                label="Fuel Cost (₹/L)"
                type="number"
                icon={<IndianRupee className="h-4 w-4" />}
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
              <div className="bg-secondary-50 p-3 rounded-md">
                <p className="text-secondary-700 font-medium">
                  Total Fuel Cost: ₹{(fuelQuantity * fuelCost).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trip Expenses Section */}
      <CollapsibleSection 
        title="Trip Expenses" 
        icon={<IndianRupee className="h-5 w-5" />}
        iconColor="text-green-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Unloading Expense (₹)"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            {...register('unloading_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Driver Expense (₹)"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            {...register('driver_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Road/RTO Expense (₹)"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            {...register('road_rto_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Breakdown Expense (₹)"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            {...register('breakdown_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Miscellaneous Expense (₹)"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            {...register('miscellaneous_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />
        </div>

        <div className="mt-4 bg-primary-50 p-3 rounded-md">
          <p className="text-primary-700 font-medium">
            Total Road Expenses: ₹{(unloadingExpense + driverExpense + roadRtoExpense + breakdownExpense + miscellaneousExpense).toLocaleString()}
          </p>
        </div>
      </CollapsibleSection>

      {/* Attachments & Notes Section */}
      <CollapsibleSection 
        title="Attachments & Notes" 
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-blue-600"
      >
        <Controller
          control={control}
          name="fuel_bill_file"
          render={({ field: { value, onChange, ...field } }) => (
            <FileUpload
              label="Trip Slip / Fuel Bill"
              value={value as File | null}
              onChange={onChange}
              accept=".jpg,.jpeg,.png,.pdf"
              helperText="Upload trip slip or fuel bill (JPG, PNG, PDF)"
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
        >
          {initialData.vehicle_id ? 'Update Trip' : 'Add Trip'}
        </Button>
      </div>
    </form>
  );
};

export default TripForm;