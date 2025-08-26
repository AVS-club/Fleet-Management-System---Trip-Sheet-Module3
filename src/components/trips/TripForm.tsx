import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  Truck, 
  User, 
  MapPin, 
  Calendar, 
  Route, 
  FileText, 
  Calculator, 
  Package, 
  Fuel, 
  IndianRupee 
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { WarehouseSelector } from './WarehouseSelector';
import { SearchableDestinationInput } from './SearchableDestinationInput';
import { MaterialSelector } from './MaterialSelector';
import { FuelRateSelector } from './FuelRateSelector';

interface TripFormData {
  trip_serial_number: string;
  vehicle_id: string;
  driver_id: string;
  warehouse_id: string;
  destinations: string[];
  trip_start_date: string;
  trip_end_date: string;
  is_return_trip: boolean;
  start_km: number;
  end_km: number;
  gross_weight: number;
  refueling_done: boolean;
  fuel_quantity?: number;
  total_fuel_cost?: number;
  fuel_rate_per_liter?: number;
  fuel_bill_file?: File[];
  unloading_expense: number;
  driver_expense: number;
  road_rto_expense: number;
  breakdown_expense: number;
  miscellaneous_expense: number;
  total_road_expenses: number;
  station?: string;
  remarks?: string;
  material_type_ids: string[];
}

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  onCancel: () => void;
  vehicles: any[];
  drivers: any[];
  warehouses: any[];
  materialTypes: any[];
  isLoading?: boolean;
}

export function TripForm({
  onSubmit,
  onCancel,
  vehicles,
  drivers,
  warehouses,
  materialTypes,
  isLoading = false
}: TripFormProps) {
  const [selectedDestinationObjects, setSelectedDestinationObjects] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Get yesterday's date as default
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayString = yesterdayDate.toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors }
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: yesterdayString,
      trip_end_date: yesterdayString,
      refueling_done: false,
      is_return_trip: true,
      gross_weight: 0,
      unloading_expense: 0,
      driver_expense: 0,
      road_rto_expense: 0,
      breakdown_expense: 0,
      miscellaneous_expense: 0,
      total_road_expenses: 0,
      material_type_ids: []
    }
  });

  const watchedValues = watch();
  const refuelingDone = watchedValues.refueling_done;

  // Calculate total road expenses
  useEffect(() => {
    const total = (watchedValues.unloading_expense || 0) +
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

  // Calculate fuel quantity when cost and rate change
  useEffect(() => {
    if (watchedValues.total_fuel_cost && watchedValues.fuel_rate_per_liter) {
      const quantity = watchedValues.total_fuel_cost / watchedValues.fuel_rate_per_liter;
      setValue('fuel_quantity', Math.round(quantity * 100) / 100);
    }
  }, [watchedValues.total_fuel_cost, watchedValues.fuel_rate_per_liter, setValue]);

  const handleFormSubmit = (data: TripFormData) => {
    const formData = {
      ...data,
      destinations: selectedDestinationObjects.map(d => d.id)
    };
    onSubmit(formData);
  };

  const handleDestinationSelect = (destination: any) => {
    setSelectedDestinationObjects(prev => [...prev, destination]);
  };

  const handleRemoveDestination = (index: number) => {
    setSelectedDestinationObjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleEndKmBlur = () => {
    // Any additional logic for end KM validation
  };

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-primary-500" />
          Route Planning
        </h3>
        
        <div className="space-y-3">
          <WarehouseSelector
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouseId}
            onChange={(value) => {
              setValue('warehouse_id', value);
              setSelectedWarehouseId(value);
            }}
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
                if (e.target.value === '0') {
                  e.target.select();
                }
              }}
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
              onFocus={(e) => {
                if (e.target.value === '0') {
                  e.target.select();
                }
              }}
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
                if (e.target.value === '0') {
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
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
              <Input
                label="Total Fuel Cost (₹)"
                type="number"
                step="0.01"
                icon={<IndianRupee className="h-4 w-4" />}
                placeholder="Enter total amount paid"
                size="sm"
                onFocus={(e) => {
                  if (e.target.value === '0') {
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
          Trip Expenses
        </h3>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Controller
            name="unloading_expense"
            control={control}
            render={({ field }) => (
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Unloading (₹)</label>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '0.00') {
                      e.target.select();
                    }
                  }}
                  placeholder="0"
                />
              </div>
            )}
          />
          
          <Controller
            name="driver_expense"
            control={control}
            render={({ field }) => (
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Driver Bata (₹)</label>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '0.00') {
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
                  {...field}
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '0.00') {
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
                  {...field}
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '0.00') {
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
                  {...field}
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  onFocus={(e) => {
                    if (e.target.value === '0' || e.target.value === '0.00') {
                      e.target.select();
                    }
                  }}
                  placeholder="0"
                />
              </div>
            )}
          />
        </div>

        {/* Total row (read-only) */}
        <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Road Expenses</span>
            <Input
              value={watchedValues.total_road_expenses || 0}
              readOnly
              className="h-9 w-40 text-right text-sm bg-gray-100 dark:bg-gray-700"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Auto-calculated</p>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Additional Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Station"
            icon={<Fuel className="h-4 w-4" />}
            placeholder="Fuel station name (optional)"
            size="sm"
            {...register('station')}
          />

          <Input
            label="Remarks"
            icon={<FileText className="h-4 w-4" />}
            placeholder="Additional notes (optional)"
            size="sm"
            {...register('remarks')}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Creating Trip...' : 'Create Trip'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}