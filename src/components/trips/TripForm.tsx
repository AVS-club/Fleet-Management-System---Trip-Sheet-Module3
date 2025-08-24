import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format, differenceInDays } from 'date-fns';
import { nanoid } from 'nanoid';
import { Trip, TripFormData, Vehicle, Driver, Warehouse, Destination, RouteAnalysis, Alert } from '../../types';
import { getVehicles, getDrivers, getWarehouses, getDestinations, getDestination, analyzeRoute, createDestination, getVehicle, getFuelStations } from '../../utils/storage';
import type { FuelStation } from '../../types';
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
import MaterialSelector from './MaterialSelector';
import { generateTripSerialNumber, validateTripSerialUniqueness } from '../../utils/tripSerialGenerator';
import { toast } from 'react-toastify';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  initialData?: Partial<TripFormData>;
  isSubmitting?: boolean;
  trips?: Trip[];
}

const TripForm: React.FC<TripFormProps> = ({
  onSubmit,
  initialData = {},
  isSubmitting = false,
  trips = []
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [frequentWarehouses, setFrequentWarehouses] = useState<Warehouse[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);
  const [lastTripMileage, setLastTripMileage] = useState<number | undefined>();
  const [tripIdPreview, setTripIdPreview] = useState<string>('');
  const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | undefined>();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cachedTrips, setCachedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isReturnTrip, setIsReturnTrip] = useState(initialData.is_return_trip || false);
  const [originalDestinations, setOriginalDestinations] = useState<string[]>([]);
  const [manualOverride, setManualOverride] = useState(false);
  const [manualTripId, setManualTripId] = useState(initialData.manual_trip_id || false);
  const [generatingSerial, setGeneratingSerial] = useState(false);
  const [endKmForAnalysis, setEndKmForAnalysis] = useState<number | undefined>(initialData.end_km);

  useEffect(() => {
    setCachedTrips(Array.isArray(trips) ? trips : []);
  }, [trips]);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setFocus,
    formState: { errors }
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: format(new Date(), 'yyyy-MM-dd'),
      trip_end_date: format(new Date(), 'yyyy-MM-dd'),
      refueling_done: false,
      is_return_trip: false,
      manual_trip_id: false,
      trip_serial_number: '',
      unloading_expense: 0,
      driver_expense: 0,
      road_rto_expense: 0,
      breakdown_expense: 0,
      miscellaneous_expense: 0,
      gross_weight: 0,
      warehouse_id: '',
      destinations: [],
      material_type_ids: [],
      station: '',
      fuel_station_id: '',
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
  const selectedFuelStationId = watch('fuel_station_id');
  const unloadingExpense = watch('unloading_expense') || 0;
  const driverExpense = watch('driver_expense') || 0;
  const roadRtoExpense = watch('road_rto_expense') || 0;
  const breakdownExpense = watch('breakdown_expense') || 0;
  const miscellaneousExpense = watch('miscellaneous_expense') || 0;
  const warehouseId = watch('warehouse_id');
  const selectedDestinations = watch('destinations') || [];
  const materialTypeIds = watch('material_type_ids') || [];
  const tripSerialNumber = watch('trip_serial_number');
  
  // Helper function to clear field if it contains default value of 0
  const handleExpenseFieldFocus = (fieldName: keyof TripFormData, currentValue: number) => {
    if (currentValue === 0) {
      setValue(fieldName, '' as any); // Clear the field by setting it to empty string
    }
  };
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
        const [vehiclesData, driversData, warehousesData, destinationsData, materialTypesData, fuelStationsData] = await Promise.all([
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations(),
          getMaterialTypes(),
          getFuelStations()
        ]);
        // Filter out archived vehicles
        const activeVehicles = Array.isArray(vehiclesData) ? vehiclesData.filter(v => v.status !== 'archived') : [];
        setVehicles(activeVehicles);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setAllDestinations(Array.isArray(destinationsData) ? destinationsData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
        setFuelStations(Array.isArray(fuelStationsData) ? fuelStationsData : []);
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-generate trip serial number when vehicle and trip start date change
  useEffect(() => {
    const generateSerialNumber = async () => {
      // Only generate if we have both vehicle and trip start date, manual ID is not enabled, and we're not editing an existing trip
      if (!vehicleId || !tripStartDate || manualTripId || initialData.trip_serial_number) {
        return;
      }

      // Find the selected vehicle
      const selectedVehicle = vehicles.find(v => v.id === vehicleId);
      if (!selectedVehicle) {
        return;
      }

      setGeneratingSerial(true);
      try {
        const generatedSerial = await generateTripSerialNumber(
          selectedVehicle.registration_number,
          tripStartDate,
          vehicleId
        );
        
        setValue('trip_serial_number', generatedSerial);
      } catch (error) {
        console.error('Error generating trip serial number:', error);
        toast.error('Failed to generate trip serial number');
      } finally {
        setGeneratingSerial(false);
      }
    };

    generateSerialNumber();
  }, [vehicleId, tripStartDate, manualTripId, vehicles, setValue, initialData.trip_serial_number]);

  // Handle manual trip ID toggle
  const handleManualTripIdToggle = (checked: boolean) => {
    setManualTripId(checked);
    setValue('manual_trip_id', checked);
    
    if (!checked && vehicleId && tripStartDate) {
      // Re-generate serial number when switching back to auto mode
      const selectedVehicle = vehicles.find(v => v.id === vehicleId);
      if (selectedVehicle) {
        generateTripSerialNumber(
          selectedVehicle.registration_number,
          tripStartDate,
          vehicleId
        ).then(generatedSerial => {
          setValue('trip_serial_number', generatedSerial);
        }).catch(error => {
          console.error('Error re-generating trip serial:', error);
          toast.error('Failed to generate trip serial number');
        });
      }
    } else if (checked) {
      // Clear the auto-generated serial when switching to manual mode
      setValue('trip_serial_number', '');
    }
  };

  useEffect(() => {
    if (Array.isArray(cachedTrips) && Array.isArray(warehouses)) {
      const warehouseCounts = cachedTrips.reduce((acc, trip) => {
        if (trip.warehouse_id) {
          acc[trip.warehouse_id] = (acc[trip.warehouse_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topWarehouses = [...warehouses]
        .sort((a, b) => (warehouseCounts[b.id] || 0) - (warehouseCounts[a.id] || 0))
        .slice(0, 3);

      setFrequentWarehouses(topWarehouses);
    }
  }, [cachedTrips, warehouses]);

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

          // Auto-fill start KM based on trip type and manual override, but only if not editing an existing trip
          if (!manualOverride && !initialData.start_km) {
            if (refuelingDone) {
              const vehicleTrips = Array.isArray(cachedTrips)
                ? cachedTrips
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
              const vehicleTrips = Array.isArray(cachedTrips)
                ? cachedTrips
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
      };
      
      fetchVehicleData();
    }
  }, [vehicleId, vehicles, refuelingDone, setValue, manualOverride, cachedTrips, initialData.start_km]);

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

  // Auto-fill fuel cost when fuel station is selected
  useEffect(() => {
    if (selectedFuelStationId) {
      const selectedStation = fuelStations.find(station => station.id === selectedFuelStationId);
      if (selectedStation && selectedStation.prices) {
        // Try to get price for diesel first (most common), then other fuel types
        const fuelPrice = selectedStation.prices.diesel || 
                          selectedStation.prices.petrol || 
                          selectedStation.prices.cng ||
                          Object.values(selectedStation.prices)[0]; // Fallback to first available price
        
        if (fuelPrice && typeof fuelPrice === 'number') {
          setValue('fuel_cost', fuelPrice);
        }
        
        // Also auto-fill station name
        setValue('station', selectedStation.name);
      }
    }
  }, [selectedFuelStationId, fuelStations, setValue]);

  useEffect(() => {
    let cancelled = false;
    
    const runAnalysis = async () => {
      if (!warehouseId || !Array.isArray(selectedDestinations) || selectedDestinations.length === 0 || !startKm || !endKmForAnalysis) {
        if (!cancelled) {
          setRouteAnalysis(undefined);
          setAlerts([]);
        }
        return;
      }

      try {
        const analysis = await analyzeRoute(warehouseId, selectedDestinations);
        if (analysis && !cancelled) {
          const actualDistance = endKmForAnalysis - startKm;
          
          // Double the Google Maps distance for return trips
          const effectiveGoogleDistance = isReturnTrip ? analysis.standard_distance * 2 : analysis.standard_distance;
          
          const updatedAnalysis: RouteAnalysis = {
            ...analysis,
            standard_distance: effectiveGoogleDistance,
            deviation:
              ((actualDistance - effectiveGoogleDistance) / effectiveGoogleDistance) * 100,
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
            end_km: endKmForAnalysis,
            gross_weight: watch('gross_weight') || 0,
            station: watch('station'),
            fuel_station_id: watch('fuel_station_id'),
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

          try {
            const generatedAlerts = await analyzeTripAndGenerateAlerts(
              tripData,
              updatedAnalysis,
              cachedTrips
            );
            if (!cancelled) {
              setAlerts(Array.isArray(generatedAlerts) ? generatedAlerts : []);
            }
          } catch (error) {
            console.error('Error generating alerts:', error);
            if (!cancelled) {
              setAlerts([]);
            }
          }
        }
      } catch (error) {
        console.error('Error in route analysis:', error);
        if (!cancelled) {
          setRouteAnalysis(undefined);
          setAlerts([]);
        }
      }
    };
    
    runAnalysis();
    
    return () => {
      cancelled = true;
    };
  }, [
    warehouseId,
    selectedDestinations,
    startKm,
    endKmForAnalysis,
    vehicleId,
    cachedTrips,
    watch,
  ]);

  const triggerRouteAnalysis = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
  }, []);

  // Handle form submission with error focusing
  const handleFormSubmit = async (data: TripFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Focus first field with error and scroll to it
      const errorFields = Object.keys(errors);
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0] as keyof TripFormData;
        setTimeout(() => {
          setFocus(firstErrorField);
        }, 100);
      }
      throw error; // Re-throw to maintain error handling in parent
    }
  };

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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-w-4xl mx-auto">
      {/* Trip Type Section */}
      <CollapsibleSection 
        title="Trip Type" 
        icon={<Repeat className="h-5 w-5" />}
        iconColor="text-slate-600"
        defaultExpanded={true}
      >
        <div className="space-y-4">
          {/* Trip Serial Number Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 text-sm">Trip Serial Number</h4>
              <Checkbox
                label="Manual Entry"
                checked={manualTripId}
                onChange={e => handleManualTripIdToggle(e.target.checked)}
                size="sm"
              />
            </div>
            
            <div className="relative">
              <Input
                label="Trip Serial Number"
                value={tripSerialNumber}
                onChange={e => setValue('trip_serial_number', e.target.value)}
                disabled={!manualTripId}
                readOnly={!manualTripId}
                className={!manualTripId ? 'bg-blue-50 border-blue-300' : ''}
                error={errors.trip_serial_number?.message}
                required
                placeholder="Auto-generated based on vehicle and date"
                {...register('trip_serial_number', {
                  required: 'Trip serial number is required'
                })}
              />
              {generatingSerial && (
                <div className="absolute right-3 top-8 flex items-center">
                  <Loader className="h-4 w-4 animate-spin text-primary-500" />
                </div>
              )}
              {!manualTripId && tripSerialNumber && (
                <div className="absolute -top-1 right-0 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                  Auto-generated
                </div>
              )}
            </div>
            
            {!manualTripId && (
              <p className="text-xs text-gray-600">
                Format: T(Year)-(Vehicle#)-(Sequence) • Automatically generated from vehicle and trip date
              </p>
            )}
          </div>

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
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                setEndKmForAnalysis(value);
              }
            }}
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
                onFocus={() => handleExpenseFieldFocus('fuel_quantity', fuelQuantity || 0)}
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

              <Controller
                control={control}
                name="fuel_station_id"
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <Select
                    label="Fuel Station"
                    options={[
                      { value: '', label: 'Select Fuel Station' },
                      ...fuelStations.map(station => ({
                        value: station.id,
                        label: station.city ? `${station.name} - ${station.city}` : station.name
                      }))
                    ]}
                    value={value || ''}
                    onChange={onChange}
                    error={error?.message}
                  />
                )}
              />

              <CurrencyInput
                label="Fuel Cost (/L)"
                step="0.01"
                onFocus={() => handleExpenseFieldFocus('fuel_cost', fuelCost || 0)}
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

              <div className="md:col-span-2">
                <Input
                  label="Station Name (Auto-filled)"
                  onFocus={() => {
                    const currentValue = watch('station') || '';
                    if (currentValue === '') {
                      setValue('station', '');
                    }
                  }}
                  error={errors.station?.message}
                  className="bg-gray-50"
                  readOnly
                  {...register('station')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Station name is auto-filled when you select a fuel station above
                </p>
              </div>
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
            onFocus={() => handleExpenseFieldFocus('unloading_expense', unloadingExpense)}
            {...register('unloading_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.unloading_expense?.message}
          />

          <CurrencyInput
            label="Driver Bata"
            onFocus={() => handleExpenseFieldFocus('driver_expense', driverExpense)}
            {...register('driver_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.driver_expense?.message}
          />

          <CurrencyInput
            label="Road/RTO Expense"
            onFocus={() => handleExpenseFieldFocus('road_rto_expense', roadRtoExpense)}
            {...register('road_rto_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.road_rto_expense?.message}
          />

          <CurrencyInput
            label="Breakdown Expense"
            onFocus={() => handleExpenseFieldFocus('breakdown_expense', breakdownExpense)}
            {...register('breakdown_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
            error={errors.breakdown_expense?.message}
          />

          <CurrencyInput
            label="Miscellaneous"
            onFocus={() => handleExpenseFieldFocus('miscellaneous_expense', miscellaneousExpense)}
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
        {!manualTripId && !tripSerialNumber && vehicleId && tripStartDate && (
          <div className="flex items-center text-sm text-gray-500 mr-4">
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Generating trip serial...
          </div>
        )}
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