import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Combobox } from '@headlessui/react';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse, Refueling } from '@/types';
import { getVehicles, getDrivers, getDestinations, getWarehouses, analyzeRoute, getLatestOdometer } from '../../utils/storage';
import { supabase } from '../../utils/supabaseClient';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { ensureUniqueTripSerial } from '../../utils/tripSerialGenerator';
import { subDays, format, parseISO } from 'date-fns';
import { analyzeTripAndGenerateAlerts } from '../../utils/aiAnalytics';
import { CorrectionCascadeManager } from '../../utils/correctionCascadeManager';
import { recalculateMileageForRefuelingTrip } from '../../utils/mileageRecalculation';
import Input from '../ui/Input';
import Button from '../ui/Button';
import EnhancedInput from '../ui/EnhancedInput';
import WarehouseSelector from './WarehouseSelector';
import SearchableDestinationInput from './SearchableDestinationInput';
import MaterialSelector from './MaterialSelector';
import CollapsibleRouteAnalysis from './CollapsibleRouteAnalysis';
import RefuelingForm from './RefuelingForm';
import CollapsibleSection from '../ui/CollapsibleSection';
import { CascadePreviewModal } from './CascadePreviewModal';
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
  Info,
  Plus,
  X,
  Hash
} from 'lucide-react';
import { toast } from 'react-toastify';

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  onCancel?: () => void;
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
  onCancel,
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
  const [cascadePreview, setCascadePreview] = useState<{
    isOpen: boolean;
    affectedTrips: Array<{
      trip_serial_number: string;
      current_start_km: number;
      new_start_km: number;
    }>;
    newEndKm: number;
    loading: boolean;
  }>({
    isOpen: false,
    affectedTrips: [],
    newEndKm: 0,
    loading: false
  });
  const [selectedDestinationObjects, setSelectedDestinationObjects] = useState<Destination[]>([]);
  const [fuelBillUploadProgress, setFuelBillUploadProgress] = useState(0);
  const [fuelBillUploadStatus, setFuelBillUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [driverQuery, setDriverQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Smart trip form state management
  const [isRefuelingTrip, setIsRefuelingTrip] = useState<boolean>(false);
  const [showRefuelingInfo, setShowRefuelingInfo] = useState<boolean>(false);
  const [showRefuelingHint, setShowRefuelingHint] = useState<boolean>(true);
  const [lastTripData, setLastTripData] = useState<{ end_km: number; end_time: string } | null>(null);
  const [previousRefuelTrip, setPreviousRefuelTrip] = useState<{ end_km: number; end_time: string } | null>(null);
  const [odometerWarning, setOdometerWarning] = useState<string | null>(null);
  const [manualToggle, setManualToggle] = useState<boolean>(false);
  const [showRefuelingDetails, setShowRefuelingDetails] = useState<boolean>(false);
  const [formValidationErrors, setFormValidationErrors] = useState<string[]>([]);
  const [autoTieDriver, setAutoTieDriver] = useState(true);
  
  // Debug mode for testing
  const DEBUG_MODE = process.env.NODE_ENV === 'development';

  // Get yesterday's date for auto-defaulting
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors }
  } = useForm<TripFormData>({
    defaultValues: {
      trip_start_date: initialData?.trip_start_date || yesterdayDate, // Use initial data if available
      trip_end_date: initialData?.trip_end_date || yesterdayDate, // Use initial data if available
      refuelings: [{
        location: '',
        fuel_quantity: 0,
        fuel_rate_per_liter: 0,
        total_fuel_cost: 0
      }],
      is_return_trip: true,
      gross_weight: 0,
      unloading_expense: 0,
      driver_expense: 0,
      road_rto_expense: 0,
      toll_expense: 0,
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
      // Ensure at least one refueling entry exists
      const refuelings = initialData.refuelings && initialData.refuelings.length > 0 
        ? initialData.refuelings 
        : [{
            location: '',
            fuel_quantity: 0,
            fuel_rate_per_liter: 0,
            total_fuel_cost: 0
          }];
      setValue('refuelings', refuelings);
      setValue('fuel_quantity', initialData.fuel_quantity || 0);
      setValue('total_fuel_cost', initialData.total_fuel_cost || 0);
      setValue('fuel_rate_per_liter', initialData.fuel_rate_per_liter || 0);
      setValue('total_fuel_cost', initialData.total_fuel_cost || 0);
      setValue('fuel_rate_per_liter', initialData.fuel_rate_per_liter || 0);
      setValue('unloading_expense', initialData.unloading_expense || 0);
      setValue('driver_expense', initialData.driver_expense || 0);
      setValue('road_rto_expense', initialData.road_rto_expense || 0);
      setValue('toll_expense', initialData.toll_expense || 0);
      setValue('breakdown_expense', initialData.breakdown_expense || 0);
      setValue('miscellaneous_expense', initialData.miscellaneous_expense || 0);
      setValue('total_road_expenses', initialData.total_road_expenses || 0);
      setValue('is_return_trip', initialData.is_return_trip || false);
      setValue('remarks', initialData.remarks || '');
      setValue('trip_serial_number', initialData.trip_serial_number || '');
      setValue('material_type_ids', initialData.material_type_ids || []);
      setValue('station', initialData.station || '');
    }
  }, [initialData, setValue, yesterdayDate]);

  // Watch form values for calculations
  const watchedValues = watch();
  const selectedVehicleId = watch('vehicle_id');
  const selectedWarehouseId = watch('warehouse_id');
  const startKm = watch('start_km');
  const endKm = watch('end_km');
  const refuelings = watch('refuelings') || [];
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
  }, [watch, drivers]);
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

  // Handle cloned trip data - set destinations when they become available
  useEffect(() => {
    if (initialData?.destinations && destinations.length > 0 && selectedDestinationObjects.length === 0) {
      const selectedDests = initialData.destinations
        .map(id => destinations.find(d => d.id === id))
        .filter(Boolean) as Destination[];
      if (selectedDests.length > 0) {
        setSelectedDestinationObjects(selectedDests);
      }
    }
  }, [initialData?.destinations, destinations, selectedDestinationObjects.length]);

  // Add a ref to track vehicle changes
  const vehicleJustChanged = useRef(false);

  // Auto-select assigned driver when vehicle is selected (Fix A: Always Auto-Select Primary Driver)
  useEffect(() => {
    if (autoTieDriver && selectedVehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle?.primary_driver_id) {
        // Get current driver value
        const currentDriverId = watch('driver_id');
        
        // Only auto-select if no driver is currently selected
        // OR if user just changed the vehicle
        if (!currentDriverId || vehicleJustChanged.current) {
          setValue('driver_id', selectedVehicle.primary_driver_id);
          
          // Auto-select the driver object for display
          const primaryDriver = drivers.find(d => d.id === selectedVehicle.primary_driver_id);
          if (primaryDriver) {
            setSelectedDriver(primaryDriver);
          }
        }
        vehicleJustChanged.current = false;
      }
    }
  }, [autoTieDriver, selectedVehicleId, vehicles, drivers, setValue, watch]);

  // Auto-generate trip serial number when vehicle and start date are selected
  useEffect(() => {
    const abortController = new AbortController();
    
    const generateSerial = async () => {
      if (selectedVehicleId && watchedValues.trip_start_date && !initialData?.trip_serial_number && !watchedValues.trip_serial_number) {
        try {
          const vehicle = vehicles.find(v => v.id === selectedVehicleId);
          if (vehicle && !abortController.signal.aborted) {
            // Use ensureUniqueTripSerial which handles retries and guarantees uniqueness
            const serialNumber = await ensureUniqueTripSerial(
              vehicle.registration_number,
              watchedValues.trip_start_date,
              selectedVehicleId
            );
            if (!abortController.signal.aborted) {
              setValue('trip_serial_number', serialNumber);
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error generating trip serial:', error);
            toast.error('Could not generate unique trip serial. Please try again or enter manually.');
          }
        }
      }
    };

    generateSerial();
    
    return () => abortController.abort();
  }, [selectedVehicleId, watchedValues.trip_start_date, watchedValues.trip_serial_number, vehicles, setValue, initialData?.trip_serial_number]);

  // Auto-fill start KM when vehicle is selected
  useEffect(() => {
    const abortController = new AbortController();
    
    const fillStartKm = async () => {
      if (selectedVehicleId && !initialData?.start_km && !watchedValues.start_km) { // Only auto-fill if no initial or current value
        try {
          const { value: latestOdometer } = await getLatestOdometer(selectedVehicleId);
          if (!abortController.signal.aborted) {
            setValue('start_km', latestOdometer);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error getting latest odometer:', error);
          }
        }
      }
    };

    fillStartKm();
    
    return () => abortController.abort();
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

  // Enhanced End KM blur handler with cascade preview and route analysis
  const handleEndKmBlur = async () => {
    // Check for cascade impact first (only for editing existing trips)
    if (initialData?.id && endKm && endKm !== initialData.end_km) {
      await handleEndKmChange(endKm);
    }

    // Original route analysis logic
    if (selectedVehicleId && selectedWarehouseId && selectedDestinationObjects.length > 0 && startKm && endKm) {
      setIsAnalyzing(true);
      try {
        // Analyze route
        const analysis = await analyzeRoute(selectedWarehouseId, selectedDestinationObjects.map(d => d.id));
        setRouteAnalysis(analysis);
        
        if (analysis) {
          // Auto-fill toll expense if available
          if (analysis.estimated_toll) {
            const tollAmount = watchedValues.is_return_trip 
              ? analysis.estimated_toll * 2  // Double toll for return trip
              : analysis.estimated_toll;
            setValue('toll_expense', tollAmount);
          }
          
          // Calculate route deviation
          const actualDistance = endKm - startKm;
          const standardDistance = analysis.total_distance;
          
          // For return trips, double the standard distance since it's a round trip
          const effectiveStandardDistance = watchedValues.is_return_trip 
            ? standardDistance * 2 
            : standardDistance;
          
          if (effectiveStandardDistance > 0 && actualDistance > 0) {
            const deviation = ((actualDistance - effectiveStandardDistance) / effectiveStandardDistance) * 100;
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
              is_return_trip: watchedValues.is_return_trip,
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
      (watchedValues.toll_expense || 0) +
      (watchedValues.miscellaneous_expense || 0) +
      (watchedValues.breakdown_expense || 0)
    );
    setValue('total_road_expenses', totalRoadExpenses);
  }, [
    watchedValues.unloading_expense,
    watchedValues.driver_expense,
    watchedValues.road_rto_expense,
    watchedValues.toll_expense,
    watchedValues.miscellaneous_expense,
    watchedValues.breakdown_expense,
    setValue
  ]);

  // Analyze route when warehouse and destinations change
  useEffect(() => {
    const abortController = new AbortController();
    
    const performRouteAnalysis = async () => {
      if (selectedWarehouseId && selectedDestinationObjects.length > 0) {
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeRoute(selectedWarehouseId, selectedDestinationObjects.map(d => d.id));
          if (!abortController.signal.aborted) {
            setRouteAnalysis(analysis);
            
            // Auto-fill toll expense when route is analyzed
            if (analysis?.estimated_toll) {
              const tollAmount = watchedValues.is_return_trip 
                ? analysis.estimated_toll * 2  // Double toll for return trip
                : analysis.estimated_toll;
              setValue('toll_expense', tollAmount);
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error analyzing route:', error);
            if (!abortController.signal.aborted) {
              setRouteAnalysis(null);
            }
          }
        } finally {
          if (!abortController.signal.aborted) {
            setIsAnalyzing(false);
          }
        }
      } else {
        if (!abortController.signal.aborted) {
          setRouteAnalysis(null);
        }
      }
    };

    performRouteAnalysis();
    
    return () => abortController.abort();
  }, [selectedWarehouseId, selectedDestinationObjects, watchedValues.is_return_trip, setValue]);

  // Smart auto-detection logic for refueling vs non-refueling trips
  useEffect(() => {
    const hasFuelData = 
      (watchedValues.total_fuel_cost && watchedValues.total_fuel_cost > 0) ||
      (watchedValues.fuel_quantity && watchedValues.fuel_quantity > 0) ||
      (watchedValues.refuelings && watchedValues.refuelings.length > 0 && 
       watchedValues.refuelings.some(r => r.fuel_quantity > 0 || r.total_fuel_cost > 0));

    // Auto-detect refueling when fuel data is entered (unless manually toggled)
    if (hasFuelData && !isRefuelingTrip && !manualToggle) {
      setIsRefuelingTrip(true);
      setShowRefuelingInfo(true);
      setShowRefuelingDetails(true);
      setValue('refueling_done', true);
    } 
    // Auto-detect non-refueling when fuel data is cleared (unless manually toggled)
    else if (!hasFuelData && isRefuelingTrip && showRefuelingInfo && !manualToggle) {
      setIsRefuelingTrip(false);
      setShowRefuelingInfo(false);
      setShowRefuelingDetails(false);
      setValue('refueling_done', false);
      setValue('refuelings', []);
      setValue('total_fuel_cost', 0);
      setValue('fuel_quantity', 0);
      setValue('fuel_rate_per_liter', 0);
    }
  }, [watchedValues.total_fuel_cost, watchedValues.fuel_quantity, watchedValues.refuelings, isRefuelingTrip, showRefuelingInfo, manualToggle, setValue]);

  // Initialize refueling state based on initial data
  useEffect(() => {
    if (initialData?.refueling_done) {
      setIsRefuelingTrip(true);
      setShowRefuelingInfo(true);
      setShowRefuelingDetails(true);
    }
  }, [initialData]);

  // Auto-dismiss refueling hint after 2 seconds
  useEffect(() => {
    if (showRefuelingHint && watchedValues.refueling_done) {
      const timer = setTimeout(() => {
        setShowRefuelingHint(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [watchedValues.refueling_done, showRefuelingHint]);

  // Smart vehicle selection with odometer suggestion
  const handleVehicleSelection = async (vehicleId: string) => {
    if (!vehicleId) return;
    
    try {
      // Get last trip for this vehicle
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: lastTrip, error } = await supabase
        .from('trips')
        .select('end_km, trip_end_date, created_at')
        .eq('vehicle_id', vehicleId)
        .eq('created_by', user.id)
        .not('end_km', 'is', null)
        .order('trip_end_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1);

      if (!error && lastTrip && lastTrip.length > 0 && lastTrip[0].end_km !== null && lastTrip[0].end_km !== undefined) {
        const latestTripRecord = lastTrip[0];
        const normalizedLastTrip = {
          end_km: latestTripRecord.end_km,
          end_time: latestTripRecord.trip_end_date || latestTripRecord.created_at || new Date().toISOString()
        };
        setLastTripData(normalizedLastTrip);
        setValue('start_km', latestTripRecord.end_km);
        
        // Get previous refueling trip for mileage window calculation
        const { data: prevRefuelTrip } = await supabase
          .from('trips')
          .select('end_km, trip_end_date, created_at')
          .eq('vehicle_id', vehicleId)
          .eq('created_by', user.id)
          .or('fuel_quantity.gt.0,total_fuel_cost.gt.0')
          .not('end_km', 'is', null)
          .order('trip_end_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(1);

        if (prevRefuelTrip && prevRefuelTrip.length > 0 && prevRefuelTrip[0].end_km !== null && prevRefuelTrip[0].end_km !== undefined) {
          const refuelTripRecord = prevRefuelTrip[0];
          setPreviousRefuelTrip({
            end_km: refuelTripRecord.end_km,
            end_time: refuelTripRecord.trip_end_date || refuelTripRecord.created_at || new Date().toISOString()
          });
        } else {
          setPreviousRefuelTrip(null);
        }
      } else {
        const { value: odometerFromTrips, fromTrip } = await getLatestOdometer(vehicleId);

        if (fromTrip && odometerFromTrips !== null && odometerFromTrips !== undefined) {
          setValue('start_km', odometerFromTrips);
          setLastTripData({ end_km: odometerFromTrips, end_time: new Date().toISOString() });
          setPreviousRefuelTrip(null);
        } else {
          // No previous trips, use vehicle's current odometer
          const vehicle = vehicles.find(v => v.id === vehicleId);
          if (vehicle) {
            const fallbackOdometer = vehicle.current_odometer || 0;
            setValue('start_km', fallbackOdometer);
            setLastTripData({ end_km: fallbackOdometer, end_time: new Date().toISOString() });
          } else {
            setLastTripData(null);
          }
          setPreviousRefuelTrip(null);
        }
      }
    } catch (error) {
      console.error('Error fetching last trip data:', error);
    }
  };

  // Smart odometer warning system
  const checkOdometerAnomaly = (startKm: number, endKm: number) => {
    if (!lastTripData) return;
    
    const expectedStart = lastTripData.end_km;
    const deviation = Math.abs(startKm - expectedStart);
    
    if (deviation > 100) { // Configurable threshold
      setOdometerWarning(
        `Warning: Start odometer (${startKm}) differs significantly from expected value (${expectedStart}). Deviation: ${deviation} km.`
      );
    } else {
      setOdometerWarning(null);
    }
  };

  // Enhanced form validation with smart refueling logic
  const validateFormData = (data: TripFormData): string | null => {
    const errors: string[] = [];
    
    // 1. Distance validation
    const distance = (data.end_km || 0) - (data.start_km || 0);
    if (distance <= 0) {
      errors.push('Distance cannot be zero or negative. End KM must be greater than Start KM.');
    }
    
    // 2. Time consistency validation - Allow same day trips and back-dated trips
    if (data.trip_start_date && data.trip_end_date) {
      const startDateTime = new Date(`${data.trip_start_date}T${data.trip_start_time || '00:00'}`);
      const endDateTime = new Date(`${data.trip_end_date}T${data.trip_end_time || '00:00'}`);
      
      // Only validate if end time is before start time on the same day
      if (endDateTime < startDateTime) {
        errors.push('End time must be after start time.');
      }
      
      // Removed future date validation to allow back-dated trips
    }
    
    // 3. Odometer validation
    if (data.start_km < 0) {
      errors.push('Start KM cannot be negative.');
    }
    if (data.end_km < 0) {
      errors.push('End KM cannot be negative.');
    }
    
    // 4. Fuel validation (only if refueling)
    const isRefuel = showRefuelingDetails || 
      (data.refueling_done) || 
      (data.fuel_quantity && data.fuel_quantity > 0) || 
      (data.total_fuel_cost && data.total_fuel_cost > 0) ||
      (data.refuelings && data.refuelings.length > 0 && 
       data.refuelings.some(r => r.fuel_quantity > 0 || r.total_fuel_cost > 0));

    if (isRefuel) {
      const hasValidFuelData = 
        (data.fuel_quantity && data.fuel_quantity > 0) ||
        (data.total_fuel_cost && data.total_fuel_cost > 0) ||
        (data.refuelings && data.refuelings.length > 0 && 
         data.refuelings.some(r => r.fuel_quantity > 0 || r.total_fuel_cost > 0));

      if (!hasValidFuelData) {
        errors.push('Please enter fuel data for refueling trips or remove refueling section.');
      } else {
        // Validate fuel amounts
        if (data.fuel_quantity && data.fuel_quantity <= 0) {
          errors.push('Fuel quantity must be greater than zero.');
        }
        if (data.total_fuel_cost && data.total_fuel_cost <= 0) {
          errors.push('Fuel cost must be greater than zero.');
        }
        
        // Validate refueling details
        if (data.refuelings && data.refuelings.length > 0) {
          for (const refueling of data.refuelings) {
            if (refueling.fuel_quantity && refueling.fuel_quantity <= 0) {
              errors.push('Fuel quantity must be greater than zero for all refuelings.');
              break;
            }
            if (refueling.total_fuel_cost && refueling.total_fuel_cost < 0) {
              errors.push('Fuel cost cannot be negative for any refueling.');
              break;
            }
          }
        }
      }
      
      data.refueling_done = true;
    } else {
      // For non-refueling trips, clear fuel data
      data.refueling_done = false;
      data.refuelings = [];
      data.total_fuel_cost = 0;
      data.fuel_quantity = 0;
      data.fuel_rate_per_liter = 0;
    }
    
    // 5. Weight validation
    if (data.gross_weight && data.gross_weight < 0) {
      errors.push('Gross weight cannot be negative.');
    }
    
    // 6. Expense validation
    const expenses = [
      { field: data.unloading_expense, name: 'Unloading expense' },
      { field: data.driver_expense, name: 'Driver expense' },
      { field: data.road_rto_expense, name: 'Road RTO expense' },
      { field: data.toll_expense, name: 'Toll expense' },
      { field: data.breakdown_expense, name: 'Breakdown expense' },
      { field: data.miscellaneous_expense, name: 'Miscellaneous expense' }
    ];
    
    expenses.forEach(({ field, name }) => {
      if (field && field < 0) {
        errors.push(`${name} cannot be negative.`);
      }
    });
    
    setFormValidationErrors(errors);
    return errors.length > 0 ? errors[0] : null;
  };

  const handleFormSubmit = async (data: TripFormData) => {
    // Validate form data with enhanced validation
    const validationError = validateFormData(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Calculate mileage using tank-to-tank method if refueling data is available
    const totalFuel = (data.refuelings || []).reduce((sum, r) => sum + (r.fuel_quantity || 0), 0);
    if (totalFuel > 0 && data.start_km && data.end_km) {
      // Create a temporary trip object for mileage calculation
      const tempTrip: Trip = {
        ...data,
        id: data.id || 'temp',
        refueling_done: true,
        fuel_quantity: totalFuel,
        trip_end_date: data.trip_end_date || new Date().toISOString()
      } as Trip;

      // Use the utility function to calculate mileage
      const { updatedTrip } = recalculateMileageForRefuelingTrip(tempTrip, trips);
      data.calculated_kmpl = updatedTrip.calculated_kmpl;
    }
    
    // For backward compatibility, convert refuelings to old format if there's one refueling
    if (data.refuelings && data.refuelings.length > 0) {
      data.refueling_done = true;
      data.fuel_quantity = totalFuel;
      data.total_fuel_cost = data.refuelings.reduce((sum, r) => sum + (r.total_fuel_cost || 0), 0);
      if (data.refuelings.length === 1) {
        data.fuel_rate_per_liter = data.refuelings[0].fuel_rate_per_liter;
      }
    } else {
      data.refueling_done = false;
    }

    // Calculate route deviation if analysis is available
    if (routeAnalysis) {
      const actualDistance = (data.end_km || 0) - (data.start_km || 0);
      
      // For return trips, double the standard distance since it's a round trip
      const effectiveStandardDistance = data.is_return_trip 
        ? routeAnalysis.total_distance * 2 
        : routeAnalysis.total_distance;
      
      if (effectiveStandardDistance > 0 && actualDistance > 0) {
        data.route_deviation = ((actualDistance - effectiveStandardDistance) / effectiveStandardDistance) * 100;
      }
    }

    // Calculate trip duration
    if (data.trip_start_date && data.trip_end_date) {
      const startTime = new Date(data.trip_start_date).getTime();
      const endTime = new Date(data.trip_end_date).getTime();
      data.trip_duration = Math.round((endTime - startTime) / (1000 * 60 * 60)); // hours
    }

    // Add destination names for direct display (no need to fetch later)
    if (selectedDestinationObjects.length > 0) {
      data.destination_names = selectedDestinationObjects.map(d => d.name);
      // Create display string like "Raipur → Bacheli"
      const warehouseName = warehouses.find(w => w.id === data.warehouse_id)?.name || '';
      const destNames = selectedDestinationObjects.map(d => d.name).join(' → ');
      // destination_display removed - not in database schema
    }

    // Map toll_expense to breakdown_expense for database compatibility and ensure required fields
    const submitData: any = { 
      ...data,
      // Ensure destinations is an array of destination IDs (required by database)
      destinations: selectedDestinationObjects.map(d => d.id),
      // Ensure required fields are present
      trip_duration: data.trip_duration || 1,
      gross_weight: data.gross_weight || 0,
      // Map breakdown_expense properly
      breakdown_expense: data.breakdown_expense || 0
    };

    // Remove fields that don't exist in database schema
    delete submitData.destination_names;
    delete submitData.destination_display;
    delete submitData.toll_expense; // Database uses breakdown_expense instead

    console.log('Submitting trip data:', submitData); // Debug log

    await onSubmit(submitData);
  };

  // Cascade handlers for data correction
  const handleEndKmChange = async (newEndKm: number) => {
    // Only show cascade preview if we're editing an existing trip and End KM has changed
    if (!initialData?.id || !newEndKm || newEndKm === initialData.end_km) {
      return;
    }

    try {
      const affectedTrips = await CorrectionCascadeManager.previewCascadeImpact(
        initialData.id,
        newEndKm
      );

      if (affectedTrips.length > 0) {
        setCascadePreview({
          isOpen: true,
          affectedTrips,
          newEndKm,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error previewing cascade impact:', error);
      toast.error('Could not preview cascade impact');
    }
  };

  const handleApplyCascade = async () => {
    if (!initialData?.id) return;

    setCascadePreview(prev => ({ ...prev, loading: true }));

    try {
      const result = await CorrectionCascadeManager.cascadeOdometerCorrection(
        initialData.id,
        cascadePreview.newEndKm,
        'Odometer correction from trip edit'
      );

      if (result.success) {
        // Update form's end_km to reflect the correction
        setValue('end_km', cascadePreview.newEndKm);
        
        toast.success(`Successfully updated ${result.affectedTrips.length} subsequent trips`);
        // Close modal
        setCascadePreview({
          isOpen: false,
          affectedTrips: [],
          newEndKm: 0,
          loading: false
        });
        
        // Trigger route analysis refresh with new end KM
        if (selectedVehicleId && selectedWarehouseId && selectedDestinationObjects.length > 0 && startKm) {
          setTimeout(() => {
            handleEndKmBlur();
          }, 100); // Small delay to ensure state is updated
        }
      } else {
        toast.error(result.error || 'Failed to apply cascade corrections');
      }
    } catch (error) {
      console.error('Error applying cascade:', error);
      toast.error('Failed to apply cascade corrections');
    } finally {
      setCascadePreview(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCloseCascadePreview = () => {
    setCascadePreview({
      isOpen: false,
      affectedTrips: [],
      newEndKm: 0,
      loading: false
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md 
                      border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 
                         bg-clip-text text-transparent flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            {initialData ? 'Edit Trip Sheet' : 'New Trip Sheet'}
          </h1>
          <span className="text-xs text-gray-500">
            Trip #{watchedValues.trip_serial_number || 'Generating...'}
          </span>
        </div>
      </div>

      {/* Main Form Container with Professional Styling */}
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Animated Form Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl 
                          border border-gray-200 dark:border-gray-700
                          ring-1 ring-gray-100 dark:ring-gray-900
                          transform transition-all duration-300 hover:shadow-2xl">
            
            {/* Form Sections */}
            <div className="p-6 space-y-6">
      {/* Form Validation Errors */}
      {formValidationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                {formValidationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-red-500">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Trip Information */}
      <div className="group bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/20 dark:to-gray-800 
                      rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-4
                      shadow-sm hover:shadow-md transition-all duration-200
                      hover:border-slate-400 dark:hover:border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 
                         flex items-center gap-2 group-hover:text-primary-600 
                         transition-colors duration-200">
            <div className="p-1.5 bg-slate-100 dark:bg-slate-900/30 rounded-lg
                            group-hover:bg-slate-200 dark:group-hover:bg-slate-800/40
                            transition-colors duration-200">
              <Route className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            Trip Information
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 
                             dark:bg-green-900/30 dark:text-green-400 rounded-full">
              Active
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Input
            label="Trip Serial Number"
            icon={<Hash className="h-4 w-4" />}
            value={watchedValues.trip_serial_number || ''}
            disabled
            inputSize="sm"
            className="pl-10"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Input
              label="Trip Start Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              required
              {...register('trip_start_date', { required: 'Start date is required' })}
              inputSize="sm"
            />
            <Input
              label="Trip End Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              required
              {...register('trip_end_date', { required: 'End date is required' })}
              inputSize="sm"
            />
            <div className="flex items-center gap-2 pb-1">
              <Controller
                name="is_return_trip"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    aria-pressed={field.value}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      field.value ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                    title={field.value ? "Return trip enabled" : "One-way trip"}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition ${
                        field.value ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              />
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Return Trip
                <span className="text-[10px] text-gray-500 ml-1">
                  {watchedValues.is_return_trip ? '(Round Trip)' : '(One Way)'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle & Driver Selection */}
      <div className="group bg-gradient-to-br from-blue-50/40 to-white dark:from-blue-900/10 dark:to-gray-800 
                      rounded-xl border border-blue-200/50 dark:border-blue-800/30 p-4
                      shadow-sm hover:shadow-md transition-all duration-200
                      hover:border-blue-400 dark:hover:border-blue-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 
                         flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg
                            animate-pulse-subtle">
              <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400
                               group-hover:animate-bounce-subtle" />
            </div>
            Vehicle & Driver
          </h3>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={autoTieDriver}
              onChange={(e) => setAutoTieDriver(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Auto-assign driver
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <EnhancedInput
            label="Vehicle"
            required
            icon={Truck}
            isVehicle
            value={selectedVehicle?.registration_number || ''}
            onChange={(value) => {
              const vehicle = vehicles.find(v => v.registration_number === value);
              setSelectedVehicle(vehicle || null);
              setValue('vehicle_id', vehicle?.id || '');
              if (vehicle?.id) {
                vehicleJustChanged.current = true; // Mark that vehicle was just changed
                handleVehicleSelection(vehicle.id);
              }
            }}
            placeholder="Type vehicle number..."
            isDropdown
            dropdownOptions={filteredVehicles.map(vehicle => ({
              id: vehicle.id,
              label: vehicle.registration_number,
              value: vehicle.registration_number,
              subtitle: `${vehicle.make} ${vehicle.model}`,
              status: vehicle.status as any
            }))}
            onDropdownSelect={(option) => {
              const vehicle = vehicles.find(v => v.id === option.id);
              if (vehicle) {
                setSelectedVehicle(vehicle);
                setValue('vehicle_id', vehicle.id);
                vehicleJustChanged.current = true; // Mark that vehicle was just changed
                handleVehicleSelection(vehicle.id);
              }
            }}
            dropdownSearchable
            dropdownPlaceholder="Search vehicles..."
          />

          <EnhancedInput
            label="Driver"
            required
            icon={User}
            value={selectedDriver?.name || ''}
            onChange={(value) => {
              const driver = drivers.find(d => d.name === value);
              setSelectedDriver(driver || null);
              setValue('driver_id', driver?.id || '');
            }}
            placeholder="Type driver name..."
            isDropdown
            dropdownOptions={filteredDrivers.map(driver => ({
              id: driver.id,
              label: driver.name,
              value: driver.name,
              subtitle: driver.license_number,
              status: driver.status as any
            }))}
            onDropdownSelect={(option) => {
              const driver = drivers.find(d => d.id === option.id);
              if (driver) {
                setSelectedDriver(driver);
                setValue('driver_id', driver.id);
              }
            }}
            dropdownSearchable
            dropdownPlaceholder="Search drivers..."
          />
        </div>
      </div>

      {/* Route Planning */}
      <div className="group bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-900/10 dark:to-gray-800 
                      rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 p-4
                      shadow-sm hover:shadow-md transition-all duration-200
                      relative overflow-hidden">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
               }}
          />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 
                         flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
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
            <CollapsibleRouteAnalysis
              analysis={routeAnalysis}
              alerts={[]}
              onAlertAction={() => {}}
              isAnalyzing={isAnalyzing}
              vehicleId={selectedVehicleId}
              destinations={destinations.map(d => d.name)}
            />
          </div>
        )}
        </div>
      </div>

      {/* Smart Trip Type Toggle */}
      <div className="group bg-gradient-to-br from-red-50/40 to-white dark:from-red-900/10 dark:to-gray-800 
                      rounded-xl border border-red-200/50 dark:border-red-800/30 p-4
                      shadow-sm hover:shadow-md transition-all duration-200
                      hover:border-red-400 dark:hover:border-red-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Fuel className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Trip Type</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Choose whether this trip includes refueling</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${!isRefuelingTrip ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
              Non-Refueling
            </span>
            <button
              type="button"
              onClick={() => {
                const newState = !isRefuelingTrip;
                setIsRefuelingTrip(newState);
                setShowRefuelingInfo(newState);
                setShowRefuelingDetails(newState);
                setManualToggle(true); // Mark as manually toggled
                setValue('refueling_done', newState);
                
                if (!newState) {
                  // Clear fuel data when switching to non-refueling
                  setValue('refuelings', []);
                  setValue('total_fuel_cost', 0);
                  setValue('fuel_quantity', 0);
                  setValue('fuel_rate_per_liter', 0);
                }
              }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              style={{ backgroundColor: isRefuelingTrip ? '#3B82F6' : '#D1D5DB' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRefuelingTrip ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isRefuelingTrip ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
              Refueling
            </span>
          </div>
        </div>

        {/* Trip Type Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">
                {isRefuelingTrip ? 'Refueling Trip' : 'Non-Refueling Trip'}
              </p>
              <p>
                {isRefuelingTrip 
                  ? 'This trip includes fuel purchase. Distance will be calculated from the last refueling trip to this one (tank-to-tank method).'
                  : 'This trip does not include fuel purchase. It will contribute to the total distance for the next refueling trip calculation.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Main Details Section - Grid Layout for Symmetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Trip Details - Left Column */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full">
          <CollapsibleSection
            title="Trip Details"
            icon={<FileText className="h-5 w-5" />}
            iconColor="text-primary-600"
            defaultExpanded={true}
          >
            <div className="space-y-4 p-4">
              {/* Start KM */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start KM <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    {...register('start_km', { required: 'Start KM is required' })}
                  />
                </div>
                {lastTripData && (
                  <p className="text-xs text-gray-500 mt-1">Suggested from last trip: {lastTripData.end_km} km</p>
                )}
                {odometerWarning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {odometerWarning}
                  </p>
                )}
              </div>

              {/* End KM */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End KM <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    {...register('end_km', { required: 'End KM is required' })}
                    onBlur={handleEndKmBlur}
                  />
                </div>
                {watchedValues.start_km && watchedValues.end_km && (
                  <p className="text-xs text-gray-500 mt-1">
                    Distance: {watchedValues.end_km - watchedValues.start_km} km
                  </p>
                )}
              </div>

              {/* Distance */}
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Distance:</span>
                  <span className="text-sm font-medium">{watchedValues.end_km - watchedValues.start_km} km</span>
                </div>
              </div>

              {/* Gross Weight */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gross Weight (kg) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    {...register('gross_weight', { required: 'Gross weight is required' })}
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Refueling Details - Right Column (Only show if refueling is selected) */}
        {isRefuelingTrip && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full">
            <CollapsibleSection
              title="Refueling Details"
              icon={<Fuel className="h-5 w-5" />}
              iconColor="text-green-600"
              defaultExpanded={true}
            >
              <div className="space-y-4 p-4">
                {/* Refueling Info Hint - with auto-dismiss */}
                {showRefuelingHint && (
                  <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg relative animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => setShowRefuelingHint(false)}
                      className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>This trip includes fuel purchase. Distance will be calculated from the last refueling trip to this one (tank-to-tank method).</p>
                    </div>
                  </div>
                )}

                {/* Refueling Form */}
                <RefuelingForm
                  refuelings={refuelings}
                  onChange={(newRefuelings) => setValue('refuelings', newRefuelings)}
                  disabled={isSubmitting}
                />

                {/* Add Refueling Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowRefuelingDetails(true);
                    setIsRefuelingTrip(true);
                    setShowRefuelingInfo(true);
                    setManualToggle(true);
                    setValue('refueling_done', true);
                  }}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 transition-colors"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add Refueling
                </button>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* If no refueling, show empty state or placeholder to maintain grid */}
        {!isRefuelingTrip && (
          <div className="lg:block hidden">
            {/* Empty div to maintain grid structure */}
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="group bg-gradient-to-br from-amber-50/40 to-white dark:from-amber-900/10 dark:to-gray-800 
                      rounded-xl border border-amber-200/50 dark:border-amber-800/30 p-4
                      shadow-sm hover:shadow-md transition-all duration-200
                      hover:border-amber-400 dark:hover:border-amber-600">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <IndianRupee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
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
                  name="toll_expense"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                        FASTag / Toll (₹)
                        {routeAnalysis?.estimated_toll && (
                          <span className="text-[11px] text-gray-500 ml-1">
                            (Est: ₹{watchedValues.is_return_trip ? routeAnalysis.estimated_toll * 2 : routeAnalysis.estimated_toll})
                          </span>
                        )}
                      </label>
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
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Additional Information - Collapsible and Compact */}
      <CollapsibleSection
        title="Additional Information"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-gray-600"
        defaultExpanded={false}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm"
      >
        <div className="p-4 space-y-3">
          {/* Station - Single Line */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[80px]">
              Station:
            </label>
            <div className="flex-1 relative">
              <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-primary-500"
                placeholder="Fuel station name (optional)"
                {...register('station')}
              />
            </div>
          </div>

          {/* Remarks - Expandable Textarea */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks:
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-primary-500 resize-none transition-all"
              rows={2}
              placeholder="Any additional notes or remarks about this trip..."
              onFocus={(e) => {
                e.target.rows = 4; // Expand on focus
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.rows = 2; // Collapse if empty
                }
              }}
              {...register('remarks')}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Debug Panel */}
      {DEBUG_MODE && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
          <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Debug Info:</h4>
          <div className="grid grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
            <p>Vehicle ID: {selectedVehicleId || 'None'}</p>
            <p>Primary Driver ID: {vehicles.find(v => v.id === selectedVehicleId)?.primary_driver_id || 'None'}</p>
            <p>Selected Driver ID: {watch('driver_id') || 'None'}</p>
            <p>Auto-tie Active: {autoTieDriver ? 'Yes' : 'No'}</p>
            <p>Refueling Mode: {isRefuelingTrip ? 'Yes' : 'No'}</p>
            <p>Total Expenses: ₹{watchedValues.total_road_expenses || 0}</p>
            <p>Start KM: {watchedValues.start_km || 0}</p>
            <p>End KM: {watchedValues.end_km || 0}</p>
            <p>Distance: {(watchedValues.end_km || 0) - (watchedValues.start_km || 0)} km</p>
            <p>Gross Weight: {watchedValues.gross_weight || 0} kg</p>
            <p>Return Trip: {watchedValues.is_return_trip ? 'Yes' : 'No'}</p>
            <p>Vehicle Just Changed: {vehicleJustChanged.current ? 'Yes' : 'No'}</p>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">All Form Values</summary>
            <pre className="mt-2 p-2 bg-gray-200 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(watch(), null, 2)}
            </pre>
          </details>
        </div>
      )}

            </div>
          </div>
        </form>

        {/* Professional Action Buttons */}
        <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md 
                        border-t border-gray-200 dark:border-gray-700 px-6 py-4 mt-6">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (onCancel) {
                  onCancel();
                } else {
                  window.history.back();
                }
              }}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 
                         bg-white dark:bg-gray-800 
                         border border-gray-300 dark:border-gray-600
                         rounded-xl font-medium
                         hover:bg-gray-50 dark:hover:bg-gray-700
                         hover:border-gray-400 dark:hover:border-gray-500
                         focus:outline-none focus:ring-2 focus:ring-gray-500/20
                         transition-all duration-200 hover-lift"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || fuelBillUploadStatus === 'uploading'}
              className="px-8 py-2.5 text-white 
                         bg-gradient-to-r from-primary-600 to-primary-500
                         hover:from-primary-700 hover:to-primary-600
                         rounded-xl font-medium shadow-lg
                         hover:shadow-xl hover:shadow-primary-500/25
                         focus:outline-none focus:ring-2 focus:ring-primary-500/50
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 hover-lift
                         relative overflow-hidden group"
              onClick={handleSubmit(handleFormSubmit)}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    {initialData ? 'Update Trip' : 'Save Trip'}
                  </>
                )}
              </span>
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r 
                              from-transparent via-white/20 to-transparent 
                              transform translate-x-[-200%] group-hover:translate-x-[200%] 
                              transition-transform duration-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Cascade Preview Modal */}
      <CascadePreviewModal
        isOpen={cascadePreview.isOpen}
        onClose={handleCloseCascadePreview}
        onApply={handleApplyCascade}
        affectedTrips={cascadePreview.affectedTrips}
        loading={cascadePreview.loading}
      />
    </div>
  );
};

export default TripForm;