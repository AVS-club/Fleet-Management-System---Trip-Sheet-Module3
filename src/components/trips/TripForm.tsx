// Enhanced TripForm.tsx with all improvements
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '@/types';
import { subDays, format } from 'date-fns';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';
import {
  Truck, User, Calendar, MapPin, Fuel, IndianRupee,
  FileText, Package, Route, Calculator, AlertTriangle,
  ChevronDown, Save, X, TrendingUp, TrendingDown, Check
} from 'lucide-react';

// Smart Features Implementation
interface EnhancedTripFormProps {
  onSubmit: (data: TripFormData) => void;
  isSubmitting?: boolean;
  trips?: Trip[];
  initialData?: Partial<TripFormData>;
  allVehicles?: Vehicle[];
  allDrivers?: Driver[];
  allDestinations?: Destination[];
  allWarehouses?: Warehouse[];
}

const EnhancedTripForm: React.FC<EnhancedTripFormProps> = ({
  onSubmit,
  isSubmitting = false,
  trips = [],
  initialData,
  allVehicles = [],
  allDrivers = [],
  allDestinations = [],
  allWarehouses = []
}) => {
  // Form state management
  const [currentStep, setCurrentStep] = useState(1);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateTrip, setDuplicateTrip] = useState<Trip | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Real-time calculations
  const [liveCalculations, setLiveCalculations] = useState({
    distance: 0,
    mileage: 0,
    costPerKm: 0,
    estimatedProfit: 0,
    fuelCost: 0,
    totalExpense: 0
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty },
    getValues,
    reset,
    trigger
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: initialData?.trip_start_date || format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      trip_end_date: initialData?.trip_end_date || format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      refueling_done: false,
      is_return_trip: true,
      gross_weight: 0,
      unloading_expense: 0,
      driver_expense: 0,
      road_rto_expense: 0,
      breakdown_expense: 0,
      miscellaneous_expense: 0,
      total_road_expenses: 0,
      billing_type: 'per_km',
      freight_rate: 0,
      ...initialData
    },
    mode: 'onChange' // Enable real-time validation
  });

  // Watch all form values for real-time updates
  const watchedValues = watch();

  // Smart Vehicle Selection with Auto-population
  const handleVehicleSelection = useCallback(async (vehicleId: string) => {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    // Auto-populate primary driver
    if (vehicle.primary_driver_id) {
      setValue('driver_id', vehicle.primary_driver_id);
      toast.info(`Auto-selected driver: ${allDrivers.find(d => d.id === vehicle.primary_driver_id)?.name}`);
    }

    // Get last odometer reading
    const lastTrip = trips
      .filter(t => t.vehicle_id === vehicleId)
      .sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime())[0];
    
    if (lastTrip) {
      setValue('start_km', lastTrip.end_km);
      toast.info(`Auto-filled start KM: ${lastTrip.end_km}`);
    }

    // Auto-set last fuel rate
    const lastFuelRate = lastTrip?.fuel_rate_per_liter || 95; // Default to 95
    setValue('fuel_rate_per_liter', lastFuelRate);
  }, [allVehicles, allDrivers, trips, setValue]);

  // Duplicate Detection System
  const checkForDuplicates = useCallback(
    debounce(async () => {
      const { vehicle_id, trip_start_date, start_km } = getValues();
      
      if (!vehicle_id || !trip_start_date || !start_km) return;

      const similarTrips = trips.filter(trip => 
        trip.vehicle_id === vehicle_id &&
        trip.trip_start_date === trip_start_date &&
        Math.abs(trip.start_km - start_km) < 10 // Within 10km tolerance
      );

      if (similarTrips.length > 0 && !initialData) {
        setDuplicateTrip(similarTrips[0]);
        setShowDuplicateWarning(true);
      }
    }, 500),
    [trips, getValues, initialData]
  );

  // Real-time Calculations Engine
  useEffect(() => {
    const startKm = watchedValues.start_km || 0;
    const endKm = watchedValues.end_km || 0;
    const fuelQuantity = watchedValues.fuel_quantity || 0;
    const fuelRate = watchedValues.fuel_rate_per_liter || 0;
    const freightRate = watchedValues.freight_rate || 0;
    const billingType = watchedValues.billing_type || 'per_km';
    const grossWeight = watchedValues.gross_weight || 0;

    const distance = Math.max(0, endKm - startKm);
    const mileage = fuelQuantity > 0 ? distance / fuelQuantity : 0;
    const fuelCost = fuelQuantity * fuelRate;
    
    // Calculate all expenses
    const roadExpenses = 
      (watchedValues.unloading_expense || 0) +
      (watchedValues.driver_expense || 0) +
      (watchedValues.road_rto_expense || 0) +
      (watchedValues.breakdown_expense || 0) +
      (watchedValues.miscellaneous_expense || 0);
    
    const totalExpense = fuelCost + roadExpenses;
    const costPerKm = distance > 0 ? totalExpense / distance : 0;
    
    // Calculate income based on billing type
    let income = 0;
    switch (billingType) {
      case 'per_km':
        income = distance * freightRate;
        break;
      case 'per_ton':
        income = grossWeight * freightRate;
        break;
      case 'manual':
        income = watchedValues.income_amount || 0;
        break;
    }
    
    const estimatedProfit = income - totalExpense;

    setLiveCalculations({
      distance,
      mileage: parseFloat(mileage.toFixed(2)),
      costPerKm: parseFloat(costPerKm.toFixed(2)),
      estimatedProfit,
      fuelCost,
      totalExpense
    });

    // Update form values
    setValue('total_fuel_cost', fuelCost);
    setValue('total_road_expenses', roadExpenses);
    setValue('total_expense', totalExpense);
    setValue('income_amount', income);
    setValue('net_profit', estimatedProfit);
    setValue('cost_per_km', costPerKm);
    setValue('profit_status', estimatedProfit > 0 ? 'profit' : estimatedProfit < 0 ? 'loss' : 'neutral');
  }, [watchedValues, setValue]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !isDirty) return;

    const saveTimer = setTimeout(() => {
      const formData = getValues();
      localStorage.setItem('tripFormDraft', JSON.stringify({
        data: formData,
        savedAt: new Date().toISOString()
      }));
      setLastSaved(new Date());
      toast.success('Draft saved', { autoClose: 1000 });
    }, 30000); // Save every 30 seconds

    return () => clearTimeout(saveTimer);
  }, [watchedValues, autoSaveEnabled, isDirty, getValues]);

  // Restore draft on mount
  useEffect(() => {
    if (initialData) return;
    
    const draft = localStorage.getItem('tripFormDraft');
    if (draft) {
      const { data, savedAt } = JSON.parse(draft);
      const shouldRestore = window.confirm(
        `Found unsaved trip from ${new Date(savedAt).toLocaleString()}. Restore?`
      );
      
      if (shouldRestore) {
        reset(data);
        toast.success('Draft restored');
      } else {
        localStorage.removeItem('tripFormDraft');
      }
    }
  }, [initialData, reset]);

  // Step validation
  const validateStep = async (step: number) => {
    let fieldsToValidate: (keyof TripFormData)[] = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ['vehicle_id', 'driver_id', 'trip_start_date', 'trip_end_date'];
        break;
      case 2:
        fieldsToValidate = ['warehouse_id', 'destinations'];
        break;
      case 3:
        fieldsToValidate = ['start_km', 'end_km'];
        break;
    }
    
    const isValid = await trigger(fieldsToValidate);
    return isValid;
  };

  // Step navigation
  const handleNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      toast.error('Please fix the errors before proceeding');
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Form submission
  const handleFormSubmit = async (data: TripFormData) => {
    // Clear draft on successful submission
    localStorage.removeItem('tripFormDraft');
    await onSubmit(data);
  };

  // Progress indicator
  const steps = [
    { number: 1, title: 'Basic Info', icon: Truck },
    { number: 2, title: 'Route', icon: Route },
    { number: 3, title: 'Odometer', icon: Calculator },
    { number: 4, title: 'Expenses', icon: IndianRupee },
    { number: 5, title: 'Review', icon: Check }
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep >= step.number
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    currentStep > step.number ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs">
          {steps.map(step => (
            <span
              key={step.number}
              className={`${
                currentStep >= step.number ? 'text-primary-600 font-medium' : 'text-gray-500'
              }`}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Duplicate Warning */}
      {showDuplicateWarning && duplicateTrip && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Potential Duplicate Detected
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                A similar trip exists: {duplicateTrip.trip_serial_number} on{' '}
                {format(new Date(duplicateTrip.trip_start_date), 'dd/MM/yyyy')}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                >
                  Continue Anyway
                </button>
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="text-sm bg-white text-yellow-800 px-3 py-1 rounded border border-yellow-300 hover:bg-yellow-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Calculations Display */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Live Calculations</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Distance</div>
            <div className="text-lg font-semibold">{liveCalculations.distance} km</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Mileage</div>
            <div className="text-lg font-semibold">{liveCalculations.mileage} km/L</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Cost/km</div>
            <div className="text-lg font-semibold">₹{liveCalculations.costPerKm}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Fuel Cost</div>
            <div className="text-lg font-semibold">₹{liveCalculations.fuelCost}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Total Expense</div>
            <div className="text-lg font-semibold">₹{liveCalculations.totalExpense}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Est. Profit</div>
            <div className={`text-lg font-semibold flex items-center ${
              liveCalculations.estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {liveCalculations.estimatedProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              ₹{Math.abs(liveCalculations.estimatedProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            {/* Vehicle selection with auto-population */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle *
              </label>
              <Controller
                name="vehicle_id"
                control={control}
                rules={{ required: 'Vehicle is required' }}
                render={({ field }) => (
                  <select
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleVehicleSelection(e.target.value);
                      checkForDuplicates();
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Vehicle</option>
                    {allVehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration_number} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.vehicle_id && (
                <p className="text-red-500 text-xs mt-1">{errors.vehicle_id.message}</p>
              )}
            </div>

            {/* Driver selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driver *
              </label>
              <Controller
                name="driver_id"
                control={control}
                rules={{ required: 'Driver is required' }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Driver</option>
                    {allDrivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.license_number}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.driver_id && (
                <p className="text-red-500 text-xs mt-1">{errors.driver_id.message}</p>
              )}
            </div>

            {/* Date fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  {...register('trip_start_date', { required: 'Start date is required' })}
                  onChange={(e) => {
                    register('trip_start_date').onChange(e);
                    checkForDuplicates();
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {errors.trip_start_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.trip_start_date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  {...register('trip_end_date', { required: 'End date is required' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {errors.trip_end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.trip_end_date.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add similar sections for steps 2-5 */}
        {/* Step 2: Route, Step 3: Odometer, Step 4: Expenses, Step 5: Review */}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex items-center text-sm text-gray-500">
          {autoSaveEnabled && lastSaved && (
            <>
              <Save className="h-4 w-4 mr-1" />
              Draft saved {format(lastSaved, 'HH:mm:ss')}
            </>
          )}
        </div>
        
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Trip' : 'Create Trip'}
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              if (isDirty && !confirm('Discard changes?')) return;
              localStorage.removeItem('tripFormDraft');
              window.history.back();
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
};

export default EnhancedTripForm;