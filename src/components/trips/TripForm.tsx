import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '../../types';
import { getVehicles, getDrivers, getDestinations, getWarehouses, analyzeRoute, getLatestOdometer } from '../../utils/storage';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { generateTripSerialNumber } from '../../utils/tripSerialGenerator';
import { subDays, format } from 'date-fns';
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
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isSubmitting?: boolean;
  trips?: Trip[];
  initialData?: Partial<TripFormData>;
}

const TripForm: React.FC<TripFormProps> = ({
  onSubmit,
  isSubmitting = false,
  trips = [],
  initialData
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

  // Get yesterday's date for auto-defaulting
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: yesterdayDate, // Auto-default to yesterday
      trip_end_date: yesterdayDate, // Auto-default to yesterday
      refueling_done: false,
      is_return_trip: false,
      manual_trip_id: false,
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

  // Fetch form data
  useEffect(() => {
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
  }, []);

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
    if (selectedVehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle?.primary_driver_id) {
        setValue('driver_id', selectedVehicle.primary_driver_id);
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  // Auto-generate trip serial number when vehicle and start date are selected
  useEffect(() => {
    const generateSerial = async () => {
      if (selectedVehicleId && watchedValues.trip_start_date && !initialData?.trip_serial_number) {
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
  }, [selectedVehicleId, watchedValues.trip_start_date, vehicles, setValue, initialData]);

  // Auto-fill start KM when vehicle is selected
  useEffect(() => {
    const fillStartKm = async () => {
      if (selectedVehicleId && !initialData?.start_km) {
        try {
          const { value: latestOdometer } = await getLatestOdometer(selectedVehicleId);
          setValue('start_km', latestOdometer);
        } catch (error) {
          console.error('Error getting latest odometer:', error);
        }
      }
    };

    fillStartKm();
  }, [selectedVehicleId, setValue, initialData]);

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
          
          if (standardDistance > 0) {
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

  const handleFormSubmit = (data: TripFormData) => {
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

    onSubmit(data);
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 overflow-y-auto">
      {/* Trip Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
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
          <Checkbox
            label="Return Trip"
            checked={watchedValues.is_return_trip}
            onChange={(e) => setValue('is_return_trip', e.target.checked)}
          />
        </div>
      </div>

      {/* Vehicle & Driver Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Vehicle & Driver
        </h3>
        
        <div className="space-y-3">
          <Select
            label="Vehicle"
            icon={<Truck className="h-4 w-4" />}
            options={[
              { value: '', label: 'Select Vehicle' },
              ...vehicles.map(vehicle => ({
                value: vehicle.id,
                label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
              }))
            ]}
            required
            {...register('vehicle_id', { required: 'Vehicle selection is required' })}
            size="sm"
          />

          <Select
            label="Driver"
            icon={<User className="h-4 w-4" />}
            options={[
              { value: '', label: 'Select Driver' },
              ...drivers.map(driver => ({
                value: driver.id || '',
                label: `${driver.name} - ${driver.license_number}`
              }))
            ]}
            required
            {...register('driver_id', { required: 'Driver selection is required' })}
            size="sm"
          />
        </div>
      </div>

      {/* Route Planning */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
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
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Route deviation: <span className={`font-bold ${Math.abs(routeDeviation) > 15 ? 'text-error-600' : 'text-success-600'}`}>
                    {routeDeviation > 0 ? '+' : ''}{routeDeviation.toFixed(1)}%
                  </span>
                </p>
                {routeAnalysis && (
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                    Standard: {routeAnalysis.total_distance}km, Actual: {endKm - startKm}km
                  </p>
                )}
              </div>
              {Math.abs(routeDeviation) > 15 && (
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trip Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
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
              {...register('start_km', {
                required: 'Start KM is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Start KM must be positive' }
              })}
            />

            <Input
              label="End KM"
              type="number"
              icon={<MapPin className="h-4 w-4" />}
              required
              onBlur={handleEndKmBlur}
              size="sm"
              {...register('end_km', {
                required: 'End KM is required',
                valueAsNumber: true,
                min: { value: 0, message: 'End KM must be positive' }
              })}
            />

            <Input
              label="Gross Weight (kg)"
              type="number"
              icon={<Package className="h-4 w-4" />}
              required
              size="sm"
              onFocus={(e) => {
                if (e.target.value === "0") {
                  e.target.select();
                }
              }}
              {...register('gross_weight', {
                required: 'Gross weight is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Gross weight must be positive' }
              })}
            />
          </div>
        </div>

        {/* Fuel Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
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
              <div className="space-y-3">
                <Input
                  label="Total Fuel Cost (₹)"
                  type="number"
                  step="0.01"
                  icon={<IndianRupee className="h-4 w-4" />}
                  placeholder="Enter total amount paid"
                  size="sm"
                  onFocus={(e) => {
                    if (e.target.value === "0") {
                      e.target.select();
                    }
                  }}
                  {...register('total_fuel_cost', {
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'Total fuel cost must be positive' }
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
                  helperText="Auto-calculated from cost ÷ rate"
                />
              </div>

            <div className="mt-3">
              <FileUpload
                label="Fuel Bill / Receipt"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={watchedValues.fuel_bill_file as File[]}
                onChange={(files) => setValue('fuel_bill_file', files)}
                helperText="Upload fuel bill or receipt (optional)"
                variant="compact"
              />
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
          Trip Expenses
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Unloading Expense (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            size="sm"
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.select();
              }
            }}
            {...register('unloading_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Driver Bata (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            size="sm"
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.select();
              }
            }}
            {...register('driver_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Road/RTO Expense (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            size="sm"
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.select();
              }
            }}
            {...register('road_rto_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Breakdown Expense (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            size="sm"
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.select();
              }
            }}
            {...register('breakdown_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Miscellaneous Expense (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            size="sm"
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.select();
              }
            }}
            {...register('miscellaneous_expense', {
              valueAsNumber: true,
              min: { value: 0, message: 'Expense must be positive' }
            })}
          />

          <Input
            label="Total Road Expenses (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            size="sm"
            value={watchedValues.total_road_expenses || 0}
            disabled
            helperText="Auto-calculated"
          />
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
          disabled={isSubmitting}
          className="w-full md:w-auto order-1 md:order-2"
        >
          {initialData ? 'Update Trip' : 'Save Trip'}
        </Button>
      </div>
    </form>
  );
};

export default TripForm;