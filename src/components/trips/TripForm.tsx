import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Combobox } from '@headlessui/react';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '../../types';
import { getVehicles, getDrivers, getDestinations, getWarehouses, analyzeRoute, getLatestOdometer } from '../../utils/storage';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { generateTripSerialNumber } from '../../utils/tripSerialGenerator';
import { subDays, format, parseISO } from 'date-fns';
import { analyzeTripAndGenerateAlerts } from '../../utils/aiAnalytics';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import WarehouseSelector from './WarehouseSelector';
import SearchableDestinationInput from './SearchableDestinationInput';
import MaterialSelector from './MaterialSelector';
import RouteAnalysis from './RouteAnalysis';
import FuelRateSelector from './FuelRateSelector';
import CollapsibleSection from '../ui/CollapsibleSection';
import config from '../../utils/config';
import {
  Truck,
  User,
  Calendar,
  MapPin,
  Fuel,
  IndianRupee,
  FileText,
  Package,
  Route,
  Calculator,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isSubmitting?: boolean;
  trips?: Trip[];
  initialData?: Partial<TripFormData>;
  // Pre-fetched lookup data to prevent async loading issues during form initialization
  allVehicles?: Vehicle[];
  allDrivers?: Driver[];
  allDestinations?: Destination[];
  allWarehouses?: Warehouse[];
  allMaterialTypes?: MaterialType[];
}

const TripForm: React.FC<TripFormProps> = ({
  onSubmit,
  isSubmitting = false,
  trips = [],
  initialData,
  allVehicles,
  allDrivers,
  allDestinations,
  allWarehouses,
  allMaterialTypes
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [routeAnalysis, setRouteAnalysis] = useState<any>(null);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);
  const [routeDeviation, setRouteDeviation] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDestinationObjects, setSelectedDestinationObjects] = useState<Destination[]>([]);
  const [fuelBillUploadProgress, setFuelBillUploadProgress] = useState(0);
  const [fuelBillUploadStatus, setFuelBillUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [driverQuery, setDriverQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Get yesterday's date for auto-defaulting
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: initialData?.trip_start_date || yesterdayDate, // Use initial data if available
      trip_end_date: initialData?.trip_end_date || yesterdayDate, // Use initial data if available
      refueling_done: false,
      is_return_trip: true,
      gross_weight: 0,
      unloading_expense: 0,
      driver_expense: 0,
      road_rto_expense: 0,
      breakdown_expense: 0,
      miscellaneous_expense: 0,
      total_road_expenses: 0,
      material_type_ids: [],
      ...initialData
    }
  });

  // Reset form with initial data whenever initialData changes - with proper date formatting
  useEffect(() => {
    if (initialData) {
      // Format dates properly for date inputs (YYYY-MM-DD)
      const formatDateForInput = (dateString?: string) => {
        if (!dateString) return yesterdayDate;
        try {
          const date = parseISO(dateString);
          return format(date, 'yyyy-MM-dd');
        } catch (error) {
          console.error('Error formatting date:', error);
          return yesterdayDate;
        }
      };

      setValue('trip_start_date', formatDateForInput(initialData.trip_start_date));
      setValue('trip_end_date', formatDateForInput(initialData.trip_end_date));
      setValue('vehicle_id', initialData.vehicle_id || '');
      setValue('driver_id', initialData.driver_id || '');
      setValue('warehouse_id', initialData.warehouse_id || '');
      setValue('destinations', initialData.destinations || []);
      setValue('start_km', initialData.start_km || 0);
      setValue('end_km', initialData.end_km || 0);
      setValue('gross_weight', initialData.gross_weight || 0);
      setValue('refueling_done', initialData.refueling_done || false);
      setValue('fuel_quantity', initialData.fuel_quantity || 0);
      setValue('total_fuel_cost', initialData.total_fuel_cost || 0);
      setValue('fuel_rate_per_liter', initialData.fuel_rate_per_liter || 0);
      setValue('total_fuel_cost', initialData.total_fuel_cost || 0);
      setValue('fuel_rate_per_liter', initialData.fuel_rate_per_liter || 0);
      setValue('unloading_expense', initialData.unloading_expense || 0);
      setValue('driver_expense', initialData.driver_expense || 0);
      setValue('road_rto_expense', initialData.road_rto_expense || 0);
      setValue('breakdown_expense', initialData.breakdown_expense || 0);
      setValue('miscellaneous_expense', initialData.miscellaneous_expense || 0);
      setValue('total_road_expenses', initialData.total_road_expenses || 0);
      setValue('is_return_trip', initialData.is_return_trip || false);
      setValue('remarks', initialData.remarks || '');
      setValue('trip_serial_number', initialData.trip_serial_number || '');
      setValue('material_type_ids', initialData.material_type_ids || []);
      setValue('station', initialData.station || '');
    }
  }, [initialData, setValue]);

  // Watch form values for calculations
  const watchedValues = watch();
  const selectedVehicleId = watch('vehicle_id');
  const selectedWarehouseId = watch('warehouse_id');
  const startKm = watch('start_km');
  const endKm = watch('end_km');
  const refuelingDone = watch('refueling_done');
  const totalFuelCost = watch('total_fuel_cost');
  const fuelRatePerLiter = watch('fuel_rate_per_liter');

  // Filter vehicles based on search query
  const filteredVehicles = useMemo(() => {
    if (!vehicleQuery) return vehicles;
    const query = vehicleQuery.toLowerCase();
    return vehicles.filter(vehicle => 
      vehicle.registration_number.toLowerCase().includes(query)
    );
  }, [vehicleQuery, vehicles]);

  // Filter drivers based on search query
  const filteredDrivers = useMemo(() => {
    if (!driverQuery) return drivers;
    const query = driverQuery.toLowerCase();
    return drivers.filter(driver => 
      driver.name.toLowerCase().includes(query)
    );
  }, [driverQuery, drivers]);
  // Update selected vehicle when vehicle_id changes
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      setSelectedVehicle(vehicle || null);
      if (vehicle) {
        setVehicleQuery(vehicle.registration_number);
      }
    } else {
      setSelectedVehicle(null);
      setVehicleQuery('');
    }
  }, [selectedVehicleId, vehicles]);

  // Update selected driver when driver_id changes
  useEffect(() => {
    const selectedDriverId = watch('driver_id');
    if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      setSelectedDriver(driver || null);
      if (driver) {
        setDriverQuery(driver.name);
      }
    } else {
      setSelectedDriver(null);
      setDriverQuery('');
    }
  }, [watch('driver_id'), drivers]);
  // Fetch form data - only if not provided as props
  useEffect(() => {
    // If data is provided as props (editing mode), use it instead of fetching
    if (allVehicles && allDrivers && allDestinations && allWarehouses && allMaterialTypes) {
      setVehicles(allVehicles);
      setDrivers(allDrivers);
      setDestinations(allDestinations);
      setWarehouses(allWarehouses);
      setMaterialTypes(allMaterialTypes);
      setLoading(false);
      return;
    }

    // Otherwise fetch the data (for new trip mode)
    const fetchFormData = async () => {
      setLoading(true);
      try {
        const [vehiclesData, driversData, destinationsData, warehousesData, materialTypesData] = await Promise.all([
          getVehicles(),
          getDrivers(),
          getDestinations(),
          getWarehouses(),
          getMaterialTypes()
        ]);

        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setDestinations(Array.isArray(destinationsData) ? destinationsData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [allVehicles, allDrivers, allDestinations, allWarehouses, allMaterialTypes]);

  // Initialize selected destinations from initialData
  useEffect(() => {
    if (initialData?.destinations && destinations.length > 0) {
      const selectedDests = initialData.destinations
        .map(id => destinations.find(d => d.id === id))
        .filter(Boolean) as Destination[];
      setSelectedDestinationObjects(selectedDests);
    }
  }, [initialData?.destinations, destinations]);

  // Auto-select assigned driver when vehicle is selected
  useEffect(() => {
    if (selectedVehicleId && vehicles.length > 0 && !initialData?.driver_id) { // Only auto-select if no initial driver
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle?.primary_driver_id) {
        setValue('driver_id', selectedVehicle.primary_driver_id);
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  // Auto-generate trip serial number when vehicle and start date are selected
  useEffect(() => {
    const generateSerial = async () => {
      if (selectedVehicleId && watchedValues.trip_start_date && !initialData?.trip_serial_number && !watchedValues.trip_serial_number) {
        try {
          const vehicle = vehicles.find(v => v.id === selectedVehicleId);
          if (vehicle) {
            const serialNumber = await generateTripSerialNumber(
              vehicle.registration_number,
              watchedValues.trip_start_date,
              selectedVehicleId
            );
            setValue('trip_serial_number', serialNumber);
          }
        } catch (error) {
          console.error('Error generating trip serial:', error);
        }
      }
    };

    generateSerial();
  }, [selectedVehicleId, watchedValues.trip_start_date, vehicles, setValue, initialData?.trip_serial_number]);

  // Auto-fill start KM when vehicle is selected
  useEffect(() => {
    const fillStartKm = async () => {
      if (selectedVehicleId && !initialData?.start_km && !watchedValues.start_km) { // Only auto-fill if no initial or current value
        try {
          const { value: latestOdometer } = await getLatestOdometer(selectedVehicleId);
          setValue('start_km', latestOdometer);
        } catch (error) {
          console.error('Error getting latest odometer:', error);
        }
      }
    };

    fillStartKm();
  }, [selectedVehicleId, setValue, initialData?.start_km, watchedValues.start_km]);

  // Handle adding destinations
  const handleDestinationSelect = (destination: Destination) => {
    const newDestinations = [...selectedDestinationObjects, destination];
    setSelectedDestinationObjects(newDestinations);
    setValue('destinations', newDestinations.map(d => d.id));
  };

  // Handle removing destinations
  const handleRemoveDestination = (index: number) => {
    const newDestinations = selectedDestinationObjects.filter((_, i) => i !== index);
    setSelectedDestinationObjects(newDestinations);
    setValue('destinations', newDestinations.map(d => d.id));
  };

  // Auto-trigger route analysis and AI alerts when key fields change
  const handleEndKmBlur = async () => {
    if (selectedVehicleId && selectedWarehouseId && selectedDestinationObjects.length > 0 && startKm && endKm) {
      setIsAnalyzing(true);
      try {
        // Analyze route
        const analysis = await analyzeRoute(selectedWarehouseId, selectedDestinationObjects.map(d => d.id));
        setRouteAnalysis(analysis);
        
        if (analysis) {
          // Calculate route deviation
          const actualDistance = endKm - startKm;
          const standardDistance = analysis.total_distance;
          
          if (standardDistance > 0 && actualDistance > 0) {
            const deviation = ((actualDistance - standardDistance) / standardDistance) * 100;
            setRouteDeviation(deviation);
            
            // Create temporary trip data for AI analysis
            const tempTripData = {
              ...watchedValues,
              vehicle_id: selectedVehicleId,
              warehouse_id: selectedWarehouseId,
              destinations: selectedDestinationObjects.map(d => d.id),
              start_km: startKm,
              end_km: endKm,
              route_deviation: deviation,
              id: 'temp-' + Date.now(),
              trip_serial_number: watchedValues.trip_serial_number || 'TEMP-001',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as Trip;
            
            // Generate AI alerts
            const alerts = await analyzeTripAndGenerateAlerts(tempTripData, analysis, trips);
            setAiAlerts(alerts);
          } else {
            if (config.isDev) console.warn('Cannot calculate route deviation: invalid distance values', { standardDistance, actualDistance });
          }
        }
      } catch (error) {
        console.error('Error analyzing route:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  // Reverse calculation: Calculate fuel quantity when total fuel cost and rate change
  useEffect(() => {
    if (totalFuelCost && fuelRatePerLiter && totalFuelCost > 0 && fuelRatePerLiter > 0) {
      const fuelQuantity = totalFuelCost / fuelRatePerLiter;
      setValue('fuel_quantity', parseFloat(fuelQuantity.toFixed(2)));
      setValue('fuel_rate_per_liter', fuelRatePerLiter);
    }
  }, [totalFuelCost, fuelRatePerLiter, setValue]);

  // Calculate total road expenses
  useEffect(() => {
    const totalRoadExpenses = (
      (watchedValues.unloading_expense || 0) +
      (watchedValues.driver_expense || 0) +
      (watchedValues.road_rto_expense || 0) +
      (watchedValues.breakdown_expense || 0) +
      (watchedValues.miscellaneous_expense || 0)
    );
    setValue('total_road_expenses', totalRoadExpenses);
  }, [
    watchedValues.unloading_expense,
    watchedValues.driver_expense,
    watchedValues.road_rto_expense,
    watchedValues.breakdown_expense,
    watchedValues.miscellaneous_expense,
    setValue
  ]);

  // Analyze route when warehouse and destinations change
  useEffect(() => {
    const performRouteAnalysis = async () => {
      if (selectedWarehouseId && selectedDestinationObjects.length > 0) {
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeRoute(selectedWarehouseId, selectedDestinationObjects.map(d => d.id));
          setRouteAnalysis(analysis);
        } catch (error) {
          console.error('Error analyzing route:', error);
          setRouteAnalysis(null);
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        setRouteAnalysis(null);
      }
    };

    performRouteAnalysis();
  }, [selectedWarehouseId, selectedDestinationObjects]);

  // Form validation function
  const validateFormData = (data: TripFormData): string | null => {
    // Validate distance is positive
    const distance = (data.end_km || 0) - (data.start_km || 0);
    if (distance <= 0) {
      return 'Distance cannot be zero or negative. End KM must be greater than Start KM.';
    }
    
    // Validate fuel data if refueling is done
    if (data.refueling_done) {
      if (!data.fuel_quantity || data.fuel_quantity <= 0) {
        return 'Fuel quantity must be greater than zero when refueling is done.';
      }
      if (!data.total_fuel_cost || data.total_fuel_cost < 0) {
        return 'Fuel cost cannot be negative.';
      }
    }
    
    return null;
  };

  const handleFormSubmit = async (data: TripFormData) => {
    // Validate form data before submission
    const validationError = validateFormData(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Calculate mileage if refueling data is available
    if (data.refueling_done && data.fuel_quantity && data.start_km && data.end_km) {
      const distance = data.end_km - data.start_km;
      if (distance > 0) {
        data.calculated_kmpl = distance / data.fuel_quantity;
      }
    }

    // Calculate route deviation if analysis is available
    if (routeAnalysis) {
      const actualDistance = (data.end_km || 0) - (data.start_km || 0);
      if (routeAnalysis.total_distance > 0 && actualDistance > 0) {
        data.route_deviation = ((actualDistance - routeAnalysis.total_distance) / routeAnalysis.total_distance) * 100;
      }
    }

    // Calculate trip duration
    if (data.trip_start_date && data.trip_end_date) {
      const startTime = new Date(data.trip_start_date).getTime();
      const endTime = new Date(data.trip_end_date).getTime();
      data.trip_duration = Math.round((endTime - startTime) / (1000 * 60 * 60)); // hours
    }

    await onSubmit(data);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="ml-3 text-gray-600">Loading form...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 overflow-y-auto h-full">
      {/* Trip Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <Route className="h-5 w-5 mr-2 text-primary-500" />
          Trip Information
        </h3>
        
        <div className="space-y-3">
          <Input
            label="Trip Serial Number"
            icon={<FileText className="h-4 w-4" />}
            value={watchedValues.trip_serial_number || ''}
            disabled
            size="sm"
          />

          <div className="flex flex-col md:flex-row gap-3">
            <Input
              label="Trip Start Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              required
              {...register('trip_start_date', { required: 'Start date is required' })}
              size="sm"
            />

            <Input
              label="Trip End Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              required
              {...register('trip_end_date', { required: 'End date is required' })}
              size="sm"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Return Trip</label>
            <Controller
              name="is_return_trip"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  aria-pressed={field.value}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    field.value ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      field.value ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Doubles route distance. Untick if not returning.
          </p>
        </div>
      </div>

      {/* Vehicle & Driver Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Vehicle & Driver
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Vehicle
              <span className="text-error-500 dark:text-error-400 ml-1">*</span>
            </label>
            <Combobox
              value={selectedVehicle}
              onChange={(vehicle: Vehicle | null) => {
                setSelectedVehicle(vehicle);
                setValue('vehicle_id', vehicle?.id || '');
              }}
            >
              <div className="relative">
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Combobox.Input
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    displayValue={(vehicle: Vehicle | null) => vehicle?.registration_number || ''}
                    onChange={(event) => setVehicleQuery(event.target.value)}
                    placeholder="Type vehicle number..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredVehicles.length === 0 && vehicleQuery !== '' ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No vehicles found</div>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <Combobox.Option
                        key={vehicle.id}
                        value={vehicle}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2 ${
                            active ? 'bg-primary-50 text-primary-700' : 'text-gray-900 dark:text-gray-100'
                          }`
                        }
                      >
                        <div>
                          <div className="font-medium">{vehicle.registration_number}</div>
                          <div className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</div>
                        </div>
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Driver
              <span className="text-error-500 dark:text-error-400 ml-1">*</span>
            </label>
            <Combobox
              value={selectedDriver}
              onChange={(driver: Driver | null) => {
                setSelectedDriver(driver);
                setValue('driver_id', driver?.id || '');
              }}
            >
              <div className="relative">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Combobox.Input
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    displayValue={(driver: Driver | null) => driver?.name || ''}
                    onChange={(event) => setDriverQuery(event.target.value)}
                    placeholder="Type driver name..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredDrivers.length === 0 && driverQuery !== '' ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No drivers found</div>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <Combobox.Option
                        key={driver.id}
                        value={driver}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2 ${
                            active ? 'bg-primary-50 text-primary-700' : 'text-gray-900 dark:text-gray-100'
                          }`
                        }
                      >
                        <div>
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-xs text-gray-500">{driver.license_number}</div>
                        </div>
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
          </div>
        </div>
      </div>

      {/* Route Planning */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-primary-500" />
          Route Planning
        </h3>
        
        <div className="space-y-3">
          <WarehouseSelector
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouseId}
            onChange={(value) => setValue('warehouse_id', value)}
          />

          <SearchableDestinationInput
            onDestinationSelect={handleDestinationSelect}
            selectedDestinations={selectedDestinationObjects}
            onRemoveDestination={handleRemoveDestination}
          />

          <MaterialSelector
            materialTypes={materialTypes}
            selectedMaterials={watchedValues.material_type_ids || []}
            onChange={(value) => setValue('material_type_ids', value)}
          />
        </div>

        {/* Route Analysis */}
        {routeDeviation !== null && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Live Route Analysis</h4>
                {routeAnalysis.total_distance > 0 && startKm && endKm && (endKm > startKm) ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Route deviation: <span className={`font-bold ${Math.abs(((endKm - startKm) - routeAnalysis.total_distance) / routeAnalysis.total_distance * 100) > 15 ? 'text-error-600' : 'text-success-600'}`}>
                      {(((endKm - startKm) - routeAnalysis.total_distance) / routeAnalysis.total_distance * 100) > 0 ? '+' : ''}{(((endKm - startKm) - routeAnalysis.total_distance) / routeAnalysis.total_distance * 100).toFixed(1)}%
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Route analysis available
                  </p>
                )}
                {routeAnalysis && routeAnalysis.total_distance > 0 && startKm && endKm && (
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                    Standard: {routeAnalysis.total_distance}km, Actual: {endKm - startKm}km
                  </p>
                )}
              </div>
              {routeAnalysis.total_distance > 0 && startKm && endKm && Math.abs(((endKm - startKm) - routeAnalysis.total_distance) / routeAnalysis.total_distance * 100) > 15 && (
                <AlertTriangle className="h-5 w-5 text-warning-500" />
              )}
            </div>
          </div>
        )}

        {/* AI Alerts Display */}
        {aiAlerts.length > 0 && (
          <div className="mt-3 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
              <h4 className="text-sm font-medium text-warning-800 dark:text-warning-300">AI Alert Generated</h4>
            </div>
            {aiAlerts.map((alert, index) => (
              <div key={index} className="text-sm text-warning-700 dark:text-warning-400">
                <p className="font-medium">{alert.message}</p>
                {alert.details && <p className="text-xs mt-1">{alert.details}</p>}
              </div>
            ))}
          </div>
        )}

        {isAnalyzing && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700 dark:text-blue-300">Analyzing route...</span>
            </div>
          </div>
        )}

        {routeAnalysis && (
          <div className="mt-3">
            <RouteAnalysis
              analysis={routeAnalysis}
              alerts={[]}
              onAlertAction={() => {}}
            />
          </div>
        )}
      </div>

      {/* Trip Details & Fuel Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Trip Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-primary-500" />
            Trip Details
          </h3>
        
          <div className="space-y-3">
            <Input
              label="Start KM"
              type="number"
              icon={<MapPin className="h-4 w-4" />}
              required
              size="sm"
              onFocus={(e) => {
                if (e.target.value === '0' || e.target.value === '') {
                  e.target.select();
                }
              }}
              {...register('start_km', {
                required: 'Start KM is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Start KM cannot be negative' }
              })}
            />

            <Input
              label="End KM"
              type="number"
              icon={<MapPin className="h-4 w-4" />}
              required
              onBlur={handleEndKmBlur}
              size="sm"
              onFocus={(e) => {
                if (e.target.value === '0' || e.target.value === '') {
                  e.target.select();
                }
              }}
              {...register('end_km', {
                required: 'End KM is required',
                valueAsNumber: true,
                min: { value: 0, message: 'End KM cannot be negative' },
                validate: (value) => {
                  const startKm = watchedValues.start_km || 0;
                  if (value <= startKm) {
                    return 'End KM must be greater than Start KM';
                  }
                  return true;
                }
              })}
            />

            <Input
              label="Gross Weight (kg)"
              type="number"
              icon={<Package className="h-4 w-4" />}
              required
              size="sm"
              onFocus={(e) => {
                if (e.target.value === '0' || e.target.value === '') {
                  e.target.select();
                }
              }}
              {...register('gross_weight', {
                required: 'Gross weight is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Gross weight cannot be negative' }
              })}
            />
          </div>
        </div>

        {/* Fuel Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
            <Fuel className="h-5 w-5 mr-2 text-primary-500" />
            Fuel Information
          </h3>
          
          <Checkbox
            label="Refueling Done"
            checked={refuelingDone}
            onChange={(e) => setValue('refueling_done', e.target.checked)}
          />
        </div>
        
        {refuelingDone && (
            <div className="space-y-3">
                <Input
                  label="Total Fuel Cost (₹)"
                  type="number"
                  step="0.01"
                  icon={<IndianRupee className="h-4 w-4" />}
                  placeholder="Enter total amount paid"
                  size="sm"
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '') {
                      e.target.select();
                    }
                  }}
                  {...register('total_fuel_cost', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Total fuel cost cannot be negative' }
                  })}
                />

                <FuelRateSelector
                  selectedRate={watchedValues.fuel_rate_per_liter}
                  onChange={(value) => setValue('fuel_rate_per_liter', value)}
                  warehouses={warehouses}
                  selectedWarehouseId={selectedWarehouseId}
                  size="sm"
                />

                <Input
                  label="Fuel Quantity (L)"
                  type="number"
                  step="0.01"
                  icon={<Fuel className="h-4 w-4" />}
                  value={watchedValues.fuel_quantity || 0}
                  disabled
                  size="sm"
                  {...register('fuel_quantity', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Fuel quantity cannot be negative' }
                  })}
                />

            <div className="mt-3">
              <FileUpload
                label="Fuel Bill / Receipt"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={watchedValues.fuel_bill_file as File[]}
                onChange={(files) => setValue('fuel_bill_file', files)}
                variant="compact"
                uploadProgress={fuelBillUploadProgress}
                uploadStatus={fuelBillUploadStatus}
              />
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
          Trip Expenses
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Primary Expenses */}
          <div className="space-y-3">
            <Controller
              name="unloading_expense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Unloading (₹)</label>
                  <Input
                    value={field.value >= 0 ? field.value : 0}
                    onChange={(e) => field.onChange(Math.max(0, parseFloat(e.target.value) || 0))}
                    type="number"
                    step="0.01"
                    className="h-9 text-sm"
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '') {
                        e.target.select();
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              )}
            />
            
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Total Road Expenses (₹)</label>
              <Input
                type="number"
                step="0.01"
                value={watchedValues.total_road_expenses || 0}
                disabled
                className="h-9 text-sm bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>
          
          {/* Right Column: Other Expenses (Collapsible) */}
          <div>
            <CollapsibleSection
              title="Other Expenses"
              icon={<IndianRupee className="h-4 w-4" />}
              iconColor="text-gray-600"
              defaultExpanded={false}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Controller
                  name="driver_expense"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Driver Bata (₹)</label>
                      <Input
                        value={field.value >= 0 ? field.value : 0}
                        onChange={(e) => field.onChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        type="number"
                        step="0.01"
                        className="h-9 text-sm"
                        onFocus={(e) => {
                          if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '') {
                            e.target.select();
                          }
                        }}
                        placeholder="0"
                      />
                    </div>
                  )}
                />
                
                <Controller
                  name="road_rto_expense"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Road/RTO (₹)</label>
                      <Input
                        value={field.value >= 0 ? field.value : 0}
                        onChange={(e) => field.onChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        type="number"
                        step="0.01"
                        className="h-9 text-sm"
                        onFocus={(e) => {
                          if (e.target.value === '0'|| e.target.value === '0.00' || e.target.value === '') {
                            e.target.select();
                          }
                        }}
                        placeholder="0"
                      />
                    </div>
                  )}
                />
                
                <Controller
                  name="breakdown_expense"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Breakdown (₹)</label>
                      <Input
                        value={field.value >= 0 ? field.value : 0}
                        onChange={(e) => field.onChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        type="number"
                        step="0.01"
                        className="h-9 text-sm"
                        onFocus={(e) => {
                          if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '') {
                            e.target.select();
                          }
                        }}
                        placeholder="0"
                      />
                    </div>
                  )}
                />
                
                <Controller
                  name="miscellaneous_expense"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Miscellaneous (₹)</label>
                      <Input
                        value={field.value >= 0 ? field.value : 0}
                        onChange={(e) => field.onChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        type="number"
                        step="0.01"
                        className="h-9 text-sm"
                        onFocus={(e) => {
                          if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '') {
                            e.target.select();
                          }
                        }}
                        placeholder="0"
                      />
                    </div>
                  )}
                />
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Additional Information
        </h3>
        
        <div className="space-y-3">
          <div className="space-y-3">
            <Input
              label="Station"
              icon={<Fuel className="h-4 w-4" />}
              placeholder="Fuel station name (optional)"
              size="sm"
              {...register('station')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks
            </label>
            <textarea
              className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              placeholder="Any additional notes or remarks about this trip..."
              {...register('remarks')}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 shadow-md md:shadow-none md:static md:bg-transparent md:dark:bg-transparent md:p-0 flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-3 pt-4">
        <Button
          variant="outline"
          className="w-full md:w-auto order-2 md:order-1"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting || fuelBillUploadStatus === 'uploading'}
          className="w-full md:w-auto order-1 md:order-2"
        >
          {initialData ? 'Update Trip' : 'Save Trip'}
        </Button>
      </div>
    </form>
  );
};

export default TripForm;