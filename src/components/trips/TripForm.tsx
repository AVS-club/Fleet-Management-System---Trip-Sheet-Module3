import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Combobox } from '@headlessui/react';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '@/types';
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
import config from '../../utils/env';
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
  ChevronDown,
  Check,
  X,
  Info,
  TrendingUp,
  TrendingDown,
  Save,
  Clock,
  DollarSign,
  Activity,
  AlertCircle,
  HelpCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isSubmitting?: boolean;
  trips?: Trip[];
  initialData?: Partial<TripFormData>;
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
  
  // New state for enhanced features
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateTrip, setDuplicateTrip] = useState<Trip | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [fieldValidationStatus, setFieldValidationStatus] = useState<Record<string, 'valid' | 'warning' | 'error' | 'none'>>({});
  const [showCalculations, setShowCalculations] = useState(true);

  // Get yesterday's date for auto-defaulting
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty },
    getValues
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: initialData?.trip_start_date || yesterdayDate,
      trip_end_date: initialData?.trip_end_date || yesterdayDate,
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

  // Watch form values for calculations
  const watchedValues = watch();
  const selectedVehicleId = watch('vehicle_id');
  const selectedWarehouseId = watch('warehouse_id');
  const startKm = watch('start_km');
  const endKm = watch('end_km');
  const refuelingDone = watch('refueling_done');
  const totalFuelCost = watch('total_fuel_cost');
  const fuelRatePerLiter = watch('fuel_rate_per_liter');
  const fuelQuantity = watch('fuel_quantity');

  // Calculate live metrics (WITHOUT P&L calculations)
  const liveCalculations = useMemo(() => {
    const distance = Math.max(0, (endKm || 0) - (startKm || 0));
    const mileage = (fuelQuantity && fuelQuantity > 0) ? distance / fuelQuantity : 0;
    const fuelCost = (fuelQuantity || 0) * (fuelRatePerLiter || 0);
    
    const roadExpenses = 
      (watchedValues.unloading_expense || 0) +
      (watchedValues.driver_expense || 0) +
      (watchedValues.road_rto_expense || 0) +
      (watchedValues.breakdown_expense || 0) +
      (watchedValues.miscellaneous_expense || 0);
    
    const totalExpense = fuelCost + roadExpenses;
    const costPerKm = distance > 0 ? totalExpense / distance : 0;
    
    return {
      distance,
      mileage: parseFloat(mileage.toFixed(2)),
      fuelCost,
      roadExpenses,
      totalExpense,
      costPerKm: parseFloat(costPerKm.toFixed(2))
    };
  }, [startKm, endKm, fuelQuantity, fuelRatePerLiter, watchedValues]);

  // Filter vehicles based on search query
  const filteredVehicles = useMemo(() => {
    if (!vehicleQuery) return vehicles;
    const query = vehicleQuery.toLowerCase();
    return vehicles.filter(vehicle => 
      vehicle.registration_number.toLowerCase().includes(query) ||
      vehicle.make?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query)
    );
  }, [vehicleQuery, vehicles]);

  // Filter drivers based on search query
  const filteredDrivers = useMemo(() => {
    if (!driverQuery) return drivers;
    const query = driverQuery.toLowerCase();
    return drivers.filter(driver => 
      driver.name.toLowerCase().includes(query) ||
      driver.license_number?.toLowerCase().includes(query)
    );
  }, [driverQuery, drivers]);

  // Load initial data
  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        const vehiclesData = allVehicles || await getVehicles();
        const driversData = allDrivers || await getDrivers();
        const destinationsData = allDestinations || await getDestinations();
        const warehousesData = allWarehouses || await getWarehouses();
        const materialTypesData = allMaterialTypes || await getMaterialTypes();

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

  // Initialize from initial data
  useEffect(() => {
    if (initialData) {
      // Set vehicle
      if (initialData.vehicle_id && vehicles.length > 0) {
        const vehicle = vehicles.find(v => v.id === initialData.vehicle_id);
        if (vehicle) {
          setSelectedVehicle(vehicle);
          setValue('vehicle_id', vehicle.id);
        }
      }
      
      // Set driver
      if (initialData.driver_id && drivers.length > 0) {
        const driver = drivers.find(d => d.id === initialData.driver_id);
        if (driver) {
          setSelectedDriver(driver);
          setValue('driver_id', driver.id);
        }
      }
      
      // Set destinations
      if (initialData.destinations && destinations.length > 0) {
        const selectedDests = initialData.destinations
          .map(id => destinations.find(d => d.id === id))
          .filter(Boolean) as Destination[];
        setSelectedDestinationObjects(selectedDests);
      }
    }
  }, [initialData, vehicles, drivers, destinations, setValue]);

  // Auto-select driver when vehicle is selected
  useEffect(() => {
    if (selectedVehicle && selectedVehicle.primary_driver_id && !initialData?.driver_id) {
      const primaryDriver = drivers.find(d => d.id === selectedVehicle.primary_driver_id);
      if (primaryDriver && !selectedDriver) {
        setSelectedDriver(primaryDriver);
        setValue('driver_id', primaryDriver.id);
        toast.info(`Auto-selected primary driver: ${primaryDriver.name}`, {
          position: 'bottom-right',
          autoClose: 2000
        });
      }
      
      // Auto-populate last odometer
      const vehicleTrips = trips
        .filter(t => t.vehicle_id === selectedVehicle.id)
        .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());
      
      if (vehicleTrips.length > 0 && !watchedValues.start_km) {
        const lastTrip = vehicleTrips[0];
        setValue('start_km', lastTrip.end_km);
        toast.info(`Auto-filled Start KM: ${lastTrip.end_km}`, {
          position: 'bottom-right',
          autoClose: 2000
        });
        
        if (lastTrip.fuel_rate_per_liter && !watchedValues.fuel_rate_per_liter) {
          setValue('fuel_rate_per_liter', lastTrip.fuel_rate_per_liter);
        }
      }
    }
  }, [selectedVehicle, drivers, trips, initialData, selectedDriver, setValue, watchedValues.start_km, watchedValues.fuel_rate_per_liter]);

  // AUTOMATIC ROUTE ANALYSIS - Triggers when warehouse and destinations change
  useEffect(() => {
    const performRouteAnalysis = async () => {
      // Only analyze if we have both warehouse and at least one destination
      if (!selectedWarehouseId || selectedDestinationObjects.length === 0) {
        setRouteAnalysis(null);
        setRouteDeviation(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
        if (!warehouse) {
          console.error('Warehouse not found');
          return;
        }

        // Call the analyze route API
        const analysis = await analyzeRoute(selectedWarehouseId, selectedDestinationObjects.map(d => d.id));
        setRouteAnalysis(analysis);
        
        // Calculate deviation if odometer readings are available
        if (startKm && endKm && analysis.total_distance > 0) {
          const actualDistance = endKm - startKm;
          const expectedDistance = analysis.total_distance;
          const deviation = ((actualDistance - expectedDistance) / expectedDistance) * 100;
          setRouteDeviation(deviation);
          
          // Store the deviation in form
          setValue('route_deviation', deviation);
        }
        
        // Show success notification
        toast.success('Route analysis completed', {
          position: 'bottom-right',
          autoClose: 2000
        });
      } catch (error) {
        console.error('Route analysis failed:', error);
        // Don't show error toast for automatic analysis
        // User can still proceed without route analysis
        setRouteAnalysis(null);
        setRouteDeviation(null);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Debounce the analysis to avoid too many API calls
    const timer = setTimeout(() => {
      performRouteAnalysis();
    }, 1000); // Wait 1 second after user stops selecting

    return () => clearTimeout(timer);
  }, [selectedWarehouseId, selectedDestinationObjects, warehouses, startKm, endKm, setValue]);

  // Check for duplicate trips
  useEffect(() => {
    if (selectedVehicleId && watchedValues.trip_start_date && startKm && !initialData) {
      const similar = trips.find(trip => 
        trip.vehicle_id === selectedVehicleId &&
        trip.trip_start_date === watchedValues.trip_start_date &&
        Math.abs(trip.start_km - startKm) < 10
      );
      
      if (similar) {
        setDuplicateTrip(similar);
        setShowDuplicateWarning(true);
      } else {
        setShowDuplicateWarning(false);
        setDuplicateTrip(null);
      }
    }
  }, [selectedVehicleId, watchedValues.trip_start_date, startKm, trips, initialData]);

  // Auto-save draft
  useEffect(() => {
    if (!isDirty) return;
    
    const saveTimer = setTimeout(() => {
      const formData = getValues();
      localStorage.setItem('tripFormDraft', JSON.stringify({
        data: formData,
        savedAt: new Date().toISOString()
      }));
      setLastSavedTime(new Date());
      toast.success('Draft saved', { autoClose: 1000, position: 'bottom-left' });
    }, 30000); // Save every 30 seconds

    return () => clearTimeout(saveTimer);
  }, [watchedValues, isDirty, getValues]);

  // Auto-generate serial number
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
          console.error('Error generating serial number:', error);
        }
      }
    };

    generateSerial();
  }, [selectedVehicleId, watchedValues.trip_start_date, vehicles, setValue, initialData]);

  // Calculate total road expenses
  useEffect(() => {
    const total = 
      (watchedValues.unloading_expense || 0) +
      (watchedValues.driver_expense || 0) +
      (watchedValues.road_rto_expense || 0) +
      (watchedValues.breakdown_expense || 0) +
      (watchedValues.miscellaneous_expense || 0);
    
    setValue('total_road_expenses', total);
  }, [
    watchedValues.unloading_expense,
    watchedValues.driver_expense,
    watchedValues.road_rto_expense,
    watchedValues.breakdown_expense,
    watchedValues.miscellaneous_expense,
    setValue
  ]);

  // Calculate fuel cost
  useEffect(() => {
    if (refuelingDone && fuelQuantity && fuelRatePerLiter) {
      const cost = fuelQuantity * fuelRatePerLiter;
      setValue('total_fuel_cost', cost);
    }
  }, [refuelingDone, fuelQuantity, fuelRatePerLiter, setValue]);

  const handleDestinationSelect = (destination: Destination) => {
    if (!selectedDestinationObjects.find(d => d.id === destination.id)) {
      const newDestinations = [...selectedDestinationObjects, destination];
      setSelectedDestinationObjects(newDestinations);
      setValue('destinations', newDestinations.map(d => d.id));
    }
  };

  const handleRemoveDestination = (index: number) => {
    const newDestinations = selectedDestinationObjects.filter((_, i) => i !== index);
    setSelectedDestinationObjects(newDestinations);
    setValue('destinations', newDestinations.map(d => d.id));
  };

  const handleFormSubmit = async (data: TripFormData) => {
    try {
      // Run AI analysis
      const alerts = await analyzeTripAndGenerateAlerts(data);
      if (alerts.length > 0) {
        setAiAlerts(alerts);
      }
      
      // Clear draft on successful submission
      localStorage.removeItem('tripFormDraft');
      
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit trip');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-w-7xl mx-auto">
      {/* Duplicate Warning Banner */}
      {showDuplicateWarning && duplicateTrip && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm animate-slideDown">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Potential Duplicate Trip Detected
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Trip <strong>{duplicateTrip.trip_serial_number}</strong> exists for this vehicle on {format(new Date(duplicateTrip.trip_start_date), 'dd MMM yyyy')}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                >
                  Continue Anyway
                </button>
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="text-sm bg-white text-yellow-800 px-3 py-1 rounded border border-yellow-300 hover:bg-yellow-50 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Calculations Panel (Without P&L) */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 shadow-sm border border-indigo-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <Activity className="h-4 w-4 mr-2 text-indigo-600" />
            Live Calculations
          </h3>
          <button
            type="button"
            onClick={() => setShowCalculations(!showCalculations)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transform transition-transform ${showCalculations ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {showCalculations && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs text-gray-500 flex items-center">
                <Route className="h-3 w-3 mr-1" />
                Distance
              </div>
              <div className={`text-lg font-bold ${
                liveCalculations.distance > 500 ? 'text-yellow-600' : 
                liveCalculations.distance > 0 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {liveCalculations.distance} km
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs text-gray-500 flex items-center">
                <Fuel className="h-3 w-3 mr-1" />
                Mileage
              </div>
              <div className={`text-lg font-bold ${
                liveCalculations.mileage > 10 ? 'text-green-600' : 
                liveCalculations.mileage > 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {liveCalculations.mileage} km/L
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs text-gray-500 flex items-center">
                <Fuel className="h-3 w-3 mr-1" />
                Fuel Cost
              </div>
              <div className="text-lg font-bold text-blue-600">
                ₹{liveCalculations.fuelCost}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs text-gray-500 flex items-center">
                <DollarSign className="h-3 w-3 mr-1" />
                Road Exp
              </div>
              <div className="text-lg font-bold text-orange-600">
                ₹{liveCalculations.roadExpenses}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs text-gray-500 flex items-center">
                <Calculator className="h-3 w-3 mr-1" />
                Total Exp
              </div>
              <div className="text-lg font-bold text-red-600">
                ₹{liveCalculations.totalExpense}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs text-gray-500 flex items-center">
                <DollarSign className="h-3 w-3 mr-1" />
                Cost/km
              </div>
              <div className="text-lg font-bold text-purple-600">
                ₹{liveCalculations.costPerKm}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trip Info Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border-l-4 border-primary-500">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Trip ID:</span>
            <span className="text-primary-600 font-bold">
              {watchedValues.trip_serial_number || 'Auto-generating...'}
            </span>
          </div>
          
          {lastSavedTime && (
            <div className="flex items-center gap-2 text-green-600">
              <Save className="h-4 w-4" />
              <span className="text-xs">
                Saved {format(lastSavedTime, 'HH:mm:ss')}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Controller
              name="is_return_trip"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    field.value 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  <RefreshCw className="h-3 w-3" />
                  {field.value ? 'Round Trip' : 'One Way'}
                </button>
              )}
            />
          </div>
        </div>
      </div>

      {/* Vehicle & Driver Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-blue-500" />
          Vehicle & Driver Selection
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehicle Combobox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vehicle <span className="text-red-500">*</span>
              {selectedVehicle && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  ✓ Selected
                </span>
              )}
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
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                            active ? 'bg-blue-50 text-blue-700' : 'text-gray-900 dark:text-gray-100'
                          }`
                        }
                      >
                        <div>
                          <div className="font-medium flex items-center justify-between">
                            <span>{vehicle.registration_number}</span>
                            {vehicle.primary_driver_id && (
                              <span className="text-xs text-gray-500">
                                👤 {drivers.find(d => d.id === vehicle.primary_driver_id)?.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {vehicle.make} {vehicle.model}
                            {vehicle.status === 'maintenance' && (
                              <span className="ml-2 text-yellow-600">⚠️ In Maintenance</span>
                            )}
                          </div>
                        </div>
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
            {errors.vehicle_id && (
              <p className="mt-1 text-xs text-red-500">{errors.vehicle_id.message}</p>
            )}
          </div>

          {/* Driver Combobox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Driver <span className="text-red-500">*</span>
              {selectedDriver && selectedVehicle?.primary_driver_id === selectedDriver.id && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  ✓ Primary Driver
                </span>
              )}
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
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                    filteredDrivers.map((driver) => {
                      const isAssignedToVehicle = selectedVehicle && 
                        driver.id === selectedVehicle.primary_driver_id;
                      
                      return (
                        <Combobox.Option
                          key={driver.id}
                          value={driver}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2 ${
                              active ? 'bg-blue-50 text-blue-700' : 
                              isAssignedToVehicle ? 'bg-green-50' :
                              'text-gray-900 dark:text-gray-100'
                            }`
                          }
                        >
                          <div>
                            <div className="font-medium flex items-center justify-between">
                              <span>{driver.name}</span>
                              {isAssignedToVehicle && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {driver.license_number}
                              {driver.status !== 'active' && (
                                <span className="ml-2 text-yellow-600">
                                  ({driver.status})
                                </span>
                              )}
                            </div>
                          </div>
                        </Combobox.Option>
                      );
                    })
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
            {errors.driver_id && (
              <p className="mt-1 text-xs text-red-500">{errors.driver_id.message}</p>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {selectedVehicle && selectedDriver && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 dark:text-blue-300">
                <Check className="inline h-3 w-3 mr-1" />
                Assignment: {selectedVehicle.registration_number} → {selectedDriver.name}
              </span>
              {selectedVehicle.primary_driver_id === selectedDriver.id && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Primary Assignment
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Route Planning - WITH AUTOMATIC ANALYSIS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-purple-500" />
          Route Planning
          {isAnalyzing && (
            <span className="ml-auto text-sm text-purple-600 flex items-center">
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              Analyzing route...
            </span>
          )}
        </h3>
        
        <div className="space-y-4">
          <WarehouseSelector
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouseId}
            onChange={(value) => setValue('warehouse_id', value)}
          />

          <SearchableDestinationInput
            onDestinationSelect={handleDestinationSelect}
            selectedDestinations={selectedDestinationObjects}
            onRemoveDestination={handleRemoveDestination}
            error={errors.destinations?.message}
          />

          <MaterialSelector
            materialTypes={materialTypes}
            selectedMaterials={watchedValues.material_type_ids || []}
            onChange={(value) => setValue('material_type_ids', value)}
          />

          {/* Route Analysis Results - Shows automatically when available */}
          {routeAnalysis && (
            <div className="animate-slideDown">
              <RouteAnalysis
                analysis={routeAnalysis}
                actualDistance={endKm && startKm ? endKm - startKm : null}
              />
            </div>
          )}
          
          {/* Show info when waiting for selection */}
          {!selectedWarehouseId && selectedDestinationObjects.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              <Info className="inline h-4 w-4 mr-1" />
              Select warehouse and destinations to see route analysis
            </div>
          )}
        </div>
      </div>

      {/* Trip Dates & Odometer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-green-500">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-green-500" />
          Trip Details & Odometer
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Input
              label="Start Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              error={errors.trip_start_date?.message}
              {...register('trip_start_date', { required: 'Start date is required' })}
            />
          </div>
          
          <div>
            <Input
              label="End Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              error={errors.trip_end_date?.message}
              {...register('trip_end_date', { required: 'End date is required' })}
            />
          </div>
          
          <div>
            <Input
              label="Start KM"
              type="number"
              icon={<Calculator className="h-4 w-4" />}
              error={errors.start_km?.message}
              {...register('start_km', {
                required: 'Start KM is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Cannot be negative' }
              })}
            />
            {watchedValues.start_km && (
              <p className="text-xs text-gray-500 mt-1">
                Last trip ended at this reading
              </p>
            )}
          </div>
          
          <div>
            <Input
              label="End KM"
              type="number"
              icon={<Calculator className="h-4 w-4" />}
              error={errors.end_km?.message}
              {...register('end_km', {
                required: 'End KM is required',
                valueAsNumber: true,
                validate: value => value > (startKm || 0) || 'Must be greater than Start KM'
              })}
            />
            {liveCalculations.distance > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Distance: {liveCalculations.distance} km
                {routeAnalysis && routeAnalysis.total_distance && (
                  <span className={`ml-2 ${
                    Math.abs(liveCalculations.distance - routeAnalysis.total_distance) < 10 
                      ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    (Expected: {routeAnalysis.total_distance} km)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fuel Information */}
      <CollapsibleSection
        title="Fuel Information"
        icon={<Fuel className="h-5 w-5 text-orange-500" />}
        defaultOpen={true}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 border-orange-500"
      >
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Controller
              name="refueling_done"
              control={control}
              render={({ field }) => (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    field.value ? 'bg-green-600' : 'bg-gray-300'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      field.value ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Refueling Done
                  </span>
                </label>
              )}
            />
          </div>

          {refuelingDone && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slideDown">
              <div>
                <Input
                  label="Fuel Quantity (L)"
                  type="number"
                  step="0.01"
                  icon={<Fuel className="h-4 w-4" />}
                  {...register('fuel_quantity', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                />
                {fuelQuantity && fuelQuantity > 100 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    <AlertTriangle className="inline h-3 w-3" /> High fuel quantity
                  </p>
                )}
              </div>
              
              <div>
                <FuelRateSelector
                  value={fuelRatePerLiter}
                  onChange={(value) => setValue('fuel_rate_per_liter', value)}
                />
                {fuelRatePerLiter && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last rate: ₹95/L
                  </p>
                )}
              </div>
              
              <div>
                <Input
                  label="Total Fuel Cost"
                  type="number"
                  step="0.01"
                  icon={<IndianRupee className="h-4 w-4" />}
                  value={liveCalculations.fuelCost}
                  disabled
                  className="bg-gray-50"
                />
                {liveCalculations.mileage > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Mileage: {liveCalculations.mileage} km/L
                  </p>
                )}
              </div>
              
              <div className="md:col-span-3">
                <FileUpload
                  label="Fuel Bill"
                  accept="image/*,.pdf"
                  multiple={false}
                  maxSize={5}
                  onUpload={(files) => {
                    setValue('fuel_bill_file', files);
                    setFuelBillUploadStatus('success');
                    toast.success('Fuel bill uploaded');
                  }}
                  uploadProgress={fuelBillUploadProgress}
                  uploadStatus={fuelBillUploadStatus}
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-red-500">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-red-500" />
          Trip Expenses
          <span className="ml-auto text-sm font-normal text-gray-500">
            Total: ₹{liveCalculations.roadExpenses}
          </span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <Controller
              name="unloading_expense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unloading
                  </label>
                  <input
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                    placeholder="0"
                  />
                </div>
              )}
            />
          </div>
          
          <div>
            <Controller
              name="driver_expense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Driver
                  </label>
                  <input
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                    placeholder="0"
                  />
                </div>
              )}
            />
          </div>
          
          <div>
            <Controller
              name="road_rto_expense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Road/RTO
                  </label>
                  <input
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                    placeholder="0"
                  />
                </div>
              )}
            />
          </div>
          
          <div>
            <Controller
              name="breakdown_expense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Breakdown
                  </label>
                  <input
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                    placeholder="0"
                  />
                </div>
              )}
            />
          </div>
          
          <div>
            <Controller
              name="miscellaneous_expense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Miscellaneous
                  </label>
                  <input
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                    placeholder="0"
                  />
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-gray-500">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-gray-500" />
          Additional Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Station"
              icon={<Fuel className="h-4 w-4" />}
              placeholder="Fuel station name (optional)"
              {...register('station')}
            />
            
            <Input
              label="Advance Amount"
              type="number"
              icon={<IndianRupee className="h-4 w-4" />}
              placeholder="Amount given in advance"
              {...register('advance_amount', { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks
              <HelpCircle className="inline h-3 w-3 ml-1 text-gray-400" />
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
              rows={3}
              placeholder="Any additional notes or remarks about this trip..."
              {...register('remarks')}
            />
          </div>
        </div>
      </div>

      {/* AI Alerts */}
      {aiAlerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            AI Insights & Alerts
          </h3>
          <div className="space-y-2">
            {aiAlerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 shadow-lg rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-gray-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved changes
            </span>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (isDirty && !confirm('Discard unsaved changes?')) return;
              window.history.back();
            }}
            icon={<X className="h-4 w-4" />}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || fuelBillUploadStatus === 'uploading'}
            icon={<Save className="h-4 w-4" />}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
          >
            {initialData ? 'Update Trip' : 'Save Trip'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TripForm;