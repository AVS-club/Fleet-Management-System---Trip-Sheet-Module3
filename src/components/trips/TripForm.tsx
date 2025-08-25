import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '../../types';
import { getVehicles, getDrivers, getDestinations, getWarehouses, analyzeRoute, getLatestOdometer } from '../../utils/storage';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { generateTripSerialNumber } from '../../utils/tripSerialGenerator';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import WarehouseSelector from './WarehouseSelector';
import DestinationSelector from './DestinationSelector';
import MaterialSelector from './MaterialSelector';
import RouteAnalysis from './RouteAnalysis';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TripFormData>({
    defaultValues: {
      refueling_done: false,
      short_trip: false,
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
      destinations: [],
      ...initialData
    }
  });

  // Watch form values for calculations
  const watchedValues = watch();
  const selectedVehicleId = watch('vehicle_id');
  const selectedWarehouseId = watch('warehouse_id');
  const selectedDestinations = watch('destinations') || [];
  const refuelingDone = watch('refueling_done');
  const fuelQuantity = watch('fuel_quantity');
  const fuelCost = watch('fuel_cost');

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

  // Calculate total fuel cost when fuel quantity and cost change
  useEffect(() => {
    if (fuelQuantity && fuelCost) {
      const totalFuelCost = fuelQuantity * fuelCost;
      setValue('total_fuel_cost', totalFuelCost);
    }
  }, [fuelQuantity, fuelCost, setValue]);

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
      if (selectedWarehouseId && selectedDestinations.length > 0) {
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeRoute(selectedWarehouseId, selectedDestinations);
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
  }, [selectedWarehouseId, selectedDestinations]);

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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Trip Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Route className="h-5 w-5 mr-2 text-primary-500" />
          Trip Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Trip Serial Number"
            icon={<FileText className="h-4 w-4" />}
            value={watchedValues.trip_serial_number || ''}
            disabled
            helperText="Auto-generated based on vehicle and date"
          />

          <div className="flex items-center space-x-4">
            <Controller
              control={control}
              name="manual_trip_id"
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  label="Manual Trip ID"
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  helperText="Override auto-generated serial"
                />
              )}
            />

            <Controller
              control={control}
              name="is_return_trip"
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  label="Return Trip"
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Trip Start Date"
            type="datetime-local"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.trip_start_date?.message}
            required
            {...register('trip_start_date', { required: 'Start date is required' })}
          />

          <Input
            label="Trip End Date"
            type="datetime-local"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.trip_end_date?.message}
            required
            {...register('trip_end_date', { required: 'End date is required' })}
          />
        </div>
      </div>

      {/* Vehicle & Driver Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Vehicle & Driver
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="vehicle_id"
            rules={{ required: 'Vehicle selection is required' }}
            render={({ field }) => (
              <Select
                label="Vehicle"
                icon={<Truck className="h-4 w-4" />}
                options={vehicles.map(vehicle => ({
                  value: vehicle.id,
                  label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
                }))}
                error={errors.vehicle_id?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="driver_id"
            rules={{ required: 'Driver selection is required' }}
            render={({ field }) => (
              <Select
                label="Driver"
                icon={<User className="h-4 w-4" />}
                options={drivers.map(driver => ({
                  value: driver.id || '',
                  label: `${driver.name} - ${driver.license_number}`
                }))}
                error={errors.driver_id?.message}
                required
                {...field}
              />
            )}
          />
        </div>
      </div>

      {/* Route Planning */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-primary-500" />
          Route Planning
        </h3>
        
        <div className="space-y-4">
          <Controller
            control={control}
            name="warehouse_id"
            rules={{ required: 'Origin warehouse is required' }}
            render={({ field }) => (
              <WarehouseSelector
                warehouses={warehouses}
                selectedWarehouse={field.value}
                onChange={field.onChange}
                error={errors.warehouse_id?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="destinations"
            rules={{ required: 'At least one destination is required' }}
            render={({ field }) => (
              <DestinationSelector
                destinations={destinations}
                selectedDestinations={field.value || []}
                onChange={field.onChange}
                error={errors.destinations?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="material_type_ids"
            render={({ field }) => (
              <MaterialSelector
                materialTypes={materialTypes}
                selectedMaterials={field.value || []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Route Analysis */}
        {isAnalyzing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700">Analyzing route...</span>
            </div>
          </div>
        )}

        {routeAnalysis && (
          <div className="mt-4">
            <RouteAnalysis
              analysis={routeAnalysis}
              alerts={[]}
              onAlertAction={() => {}}
            />
          </div>
        )}
      </div>

      {/* Trip Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-primary-500" />
          Trip Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Start KM"
            type="number"
            icon={<MapPin className="h-4 w-4" />}
            error={errors.start_km?.message}
            required
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
            error={errors.end_km?.message}
            required
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
            error={errors.gross_weight?.message}
            required
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Fuel className="h-5 w-5 mr-2 text-primary-500" />
            Fuel Information
          </h3>
          
          <Controller
            control={control}
            name="refueling_done"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Refueling Done"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
              />
            )}
          />
        </div>
        
        {refuelingDone && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Fuel Quantity (L)"
              type="number"
              step="0.01"
              icon={<Fuel className="h-4 w-4" />}
              error={errors.fuel_quantity?.message}
              {...register('fuel_quantity', {
                valueAsNumber: true,
                min: { value: 0.01, message: 'Fuel quantity must be positive' }
              })}
            />

            <Input
              label="Fuel Cost per Liter (₹)"
              type="number"
              step="0.01"
              icon={<IndianRupee className="h-4 w-4" />}
              error={errors.fuel_cost?.message}
              {...register('fuel_cost', {
                valueAsNumber: true,
                min: { value: 0.01, message: 'Fuel cost must be positive' }
              })}
            />

            <Input
              label="Total Fuel Cost (₹)"
              type="number"
              step="0.01"
              icon={<IndianRupee className="h-4 w-4" />}
              value={watchedValues.total_fuel_cost || 0}
              disabled
              helperText="Auto-calculated"
            />
          </div>
        )}

        {refuelingDone && (
          <div className="mt-4">
            <Controller
              control={control}
              name="fuel_bill_file"
              render={({ field: { value, onChange } }) => (
              <FileUpload
                label="Fuel Bill / Receipt"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={value as File[]}
                onChange={onChange}
                helperText="Upload fuel bill or receipt (optional)"
                variant="compact"
              />
            )}
          />
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
          Trip Expenses
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Unloading Expense (₹)"
            type="number"
            step="0.01"
            icon={<IndianRupee className="h-4 w-4" />}
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
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
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
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
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
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
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
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
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
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
            value={watchedValues.total_road_expenses || 0}
            disabled
            helperText="Auto-calculated"
          />
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
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

            <Controller
              control={control}
              name="short_trip"
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  label="Short/Local Trip"
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  helperText="Mark if this is a local/short distance trip"
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Any additional notes or remarks about this trip..."
              {...register('remarks')}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {initialData ? 'Update Trip' : 'Save Trip'}
        </Button>
      </div>
    </form>
  );
};

export default TripForm;