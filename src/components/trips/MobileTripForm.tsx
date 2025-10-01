import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '@/types';
import { getVehicles, getDestinations, getWarehouses } from '../../utils/storage';
import { getDrivers } from '../../utils/api/drivers';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { supabase } from '../../utils/supabaseClient';
import { ensureUniqueTripSerial } from '../../utils/tripSerialGenerator';
import { subDays, format } from 'date-fns';
import { 
  Truck, User, Calendar, MapPin, Fuel, IndianRupee, 
  FileText, Package, Route, ChevronDown, X, Plus,
  AlertTriangle, Check, Hash, Upload
} from 'lucide-react';
import { toast } from 'react-toastify';
import '../../styles/mobile.css';

// Import the new warehouse rules system
import { autoAssignWarehouse } from '../../utils/vehicleWarehouseRules';

interface MobileTripFormProps {
  onSubmit: (data: TripFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  trips?: Trip[];
  initialData?: Partial<TripFormData>;
  allVehicles?: Vehicle[];
  allDrivers?: Driver[];
  allDestinations?: Destination[];
  allWarehouses?: Warehouse[];
  allMaterialTypes?: MaterialType[];
}

const MobileTripForm: React.FC<MobileTripFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
  trips = [],
  initialData,
  allVehicles,
  allDrivers,
  allDestinations,
  allWarehouses,
  allMaterialTypes,
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestinationObjects, setSelectedDestinationObjects] = useState<Destination[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [vehicleInputValue, setVehicleInputValue] = useState('');
  const [driverInputValue, setDriverInputValue] = useState('');
  const [isRefuelingTrip, setIsRefuelingTrip] = useState<boolean>(false);
  const [showRefuelingDetails, setShowRefuelingDetails] = useState<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [autoCompleteOpen, setAutoCompleteOpen] = useState<{
    vehicles: boolean;
    drivers: boolean;
    destinations: boolean;
  }>({ vehicles: false, drivers: false, destinations: false });
  const [autoCompleteResults, setAutoCompleteResults] = useState<{
    vehicles: Vehicle[];
    drivers: Driver[];
    destinations: Destination[];
  }>({ vehicles: [], drivers: [], destinations: [] });

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
      trip_start_date: initialData?.trip_start_date || yesterdayDate,
      trip_end_date: initialData?.trip_end_date || yesterdayDate,
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

  const watchedValues = watch();
  const selectedVehicleId = watch('vehicle_id');
  const selectedDriverId = watch('driver_id');
  const selectedWarehouseId = watch('warehouse_id');
  const startKm = watch('start_km');
  const endKm = watch('end_km');
  const computedDistance = Math.max(0, (endKm || 0) - (startKm || 0));

  // Initialize data
  useEffect(() => {
    if (allVehicles && allDrivers && allDestinations && allWarehouses && allMaterialTypes) {
      setVehicles(allVehicles);
      setDrivers(allDrivers);
      setDestinations(allDestinations);
      setWarehouses(allWarehouses);
      setMaterialTypes(allMaterialTypes);
      setLoading(false);
      return;
    }

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

  // Auto-complete handlers
  const handleVehicleSearch = (query: string) => {
    if (query.length < 2) {
      setAutoCompleteOpen(prev => ({ ...prev, vehicles: false }));
      return;
    }
    
    const filtered = vehicles.filter(vehicle => 
      vehicle.registration_number.toLowerCase().includes(query.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(query.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(query.toLowerCase())
    );
    
    setAutoCompleteResults(prev => ({ ...prev, vehicles: filtered }));
    setAutoCompleteOpen(prev => ({ ...prev, vehicles: true }));
  };

  const handleDriverSearch = (query: string) => {
    if (query.length < 2) {
      setAutoCompleteOpen(prev => ({ ...prev, drivers: false }));
      return;
    }
    
    const filtered = drivers.filter(driver => 
      driver.name.toLowerCase().includes(query.toLowerCase()) ||
      driver.license_number.toLowerCase().includes(query.toLowerCase())
    );
    
    setAutoCompleteResults(prev => ({ ...prev, drivers: filtered }));
    setAutoCompleteOpen(prev => ({ ...prev, drivers: true }));
  };

  const handleDestinationSearch = (query: string) => {
    if (query.length < 2) {
      setAutoCompleteOpen(prev => ({ ...prev, destinations: false }));
      return;
    }
    
    const filtered = destinations.filter(destination => 
      destination.name.toLowerCase().includes(query.toLowerCase()) ||
      (destination.place_name && destination.place_name.toLowerCase().includes(query.toLowerCase()))
    );
    
    setAutoCompleteResults(prev => ({ ...prev, destinations: filtered }));
    setAutoCompleteOpen(prev => ({ ...prev, destinations: true }));
  };

  const selectVehicle = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleInputValue(vehicle.registration_number);
    setValue('vehicle_id', vehicle.id);
    setAutoCompleteOpen(prev => ({ ...prev, vehicles: false }));
    
    // Auto-assign warehouse based on organization rules
    if (vehicle.registration_number) {
      try {
        const assignedWarehouseId = await autoAssignWarehouse(
          vehicle.registration_number!,
          undefined, // Will use current organization
          warehouses
        );
        
        if (assignedWarehouseId) {
          setValue('warehouse_id', assignedWarehouseId);
          
          // Highlight the warehouse field briefly
          const warehouseField = document.querySelector('[name="warehouse_id"]') as HTMLElement;
          if (warehouseField) {
            warehouseField.style.backgroundColor = '#fef3c7'; // Light yellow
            warehouseField.style.transition = 'background-color 0.3s ease';
            setTimeout(() => {
              warehouseField.style.backgroundColor = '';
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Error auto-assigning warehouse:', error);
      }
    }
    
    // Auto-assign primary driver
    if (vehicle.primary_driver_id) {
      const primaryDriver = drivers.find(d => d.id === vehicle.primary_driver_id);
      if (primaryDriver) {
        setSelectedDriver(primaryDriver);
        setDriverInputValue(primaryDriver.name);
        setValue('driver_id', primaryDriver.id!);
      }
    }
  };

  const selectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDriverInputValue(driver.name);
    setValue('driver_id', driver.id!);
    setAutoCompleteOpen(prev => ({ ...prev, drivers: false }));
  };

  const addDestination = (destination: Destination) => {
    if (!selectedDestinationObjects.find(d => d.id === destination.id)) {
      const newDestinations = [...selectedDestinationObjects, destination];
      setSelectedDestinationObjects(newDestinations);
      setValue('destinations', newDestinations.map(d => d.id));
    }
    setAutoCompleteOpen(prev => ({ ...prev, destinations: false }));
  };

  const removeDestination = (index: number) => {
    const newDestinations = selectedDestinationObjects.filter((_, i) => i !== index);
    setSelectedDestinationObjects(newDestinations);
    setValue('destinations', newDestinations.map(d => d.id));
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const initialDestinationIds = initialData?.destinations;
    if (!Array.isArray(initialDestinationIds) || initialDestinationIds.length === 0) {
      return;
    }

    const matchedDestinations = destinations.filter((destination) =>
      initialDestinationIds.map(String).includes(String(destination.id))
    );

    if (matchedDestinations.length > 0) {
      setSelectedDestinationObjects(matchedDestinations);
      setValue(
        'destinations',
        matchedDestinations.map((destination) => destination.id),
        { shouldValidate: false }
      );
    }
  }, [initialData?.destinations, destinations, setValue]);

  const handleFormSubmit = async (data: any) => {
    try {
      const startKmValue = Number(data.start_km);
      const endKmValue = Number(data.end_km);

      if (Number.isNaN(startKmValue) || Number.isNaN(endKmValue)) {
        toast.error('Please enter valid start and end kilometers');
        return;
      }

      if (endKmValue <= startKmValue) {
        toast.error('Please enter valid start and end kilometers');
        return;
      }

      await onSubmit({
        ...data,
        start_km: startKmValue,
        end_km: endKmValue,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred while submitting the form');
    }
  };
  if (loading) {
    return (
      <div className="mobile-container">
        <div className="trip-form-container">
          <div className="form-section">
            <div className="mobile-loading" style={{ height: '200px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Mobile Header */}
      <div className="header-mobile">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Edit Trip' : 'New Trip'}
          </h1>
          <span className="text-sm text-gray-500">
            #{watchedValues.trip_serial_number || 'Generating...'}
          </span>
        </div>
      </div>

      <div className="trip-form-container">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          
          {/* Trip Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Route className="h-4 w-4 text-primary-600" />
                Trip Information
              </h3>
              <button
                type="button"
                onClick={() => toggleSection('trip-info')}
                className={`section-toggle ${collapsedSections.has('trip-info') ? 'collapsed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            {!collapsedSections.has('trip-info') && (
              <div className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Trip Serial Number</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="form-input pl-10"
                      value={watchedValues.trip_serial_number || ''}
                      disabled
                    />
                  </div>
                </div>

                <div className="date-input-group">
                  <div className="date-input-wrapper">
                    <label className="form-label">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        className="form-input pl-10"
                        {...register('trip_start_date', { required: true })}
                      />
                    </div>
                  </div>
                  <div className="date-input-wrapper">
                    <label className="form-label">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        className="form-input pl-10"
                        {...register('trip_end_date', { required: true })}
                      />
                    </div>
                  </div>
                </div>

                <div className="toggle-container">
                  <label className="text-sm font-medium text-gray-700">Return Trip</label>
                  <Controller
                    name="is_return_trip"
                    control={control}
                    render={({ field }) => (
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vehicle & Driver Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Vehicle & Driver
              </h3>
              <button
                type="button"
                onClick={() => toggleSection('vehicle-driver')}
                className={`section-toggle ${collapsedSections.has('vehicle-driver') ? 'collapsed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            {!collapsedSections.has('vehicle-driver') && (
              <div className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Vehicle *</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="form-input pl-10"
                      value={vehicleInputValue}
                      onChange={(e) => {
                        setVehicleInputValue(e.target.value);
                        handleVehicleSearch(e.target.value);
                      }}
                      placeholder="Type vehicle number..."
                    />
                    {selectedVehicle && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  {autoCompleteOpen.vehicles && autoCompleteResults.vehicles.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {autoCompleteResults.vehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="autocomplete-item"
                          onClick={() => selectVehicle(vehicle)}
                        >
                          <div className="font-medium">{vehicle.registration_number}</div>
                          <div className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Driver *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="form-input pl-10"
                      value={driverInputValue}
                      onChange={(e) => {
                        setDriverInputValue(e.target.value);
                        handleDriverSearch(e.target.value);
                      }}
                      placeholder="Type driver name..."
                    />
                    {selectedDriver && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  {autoCompleteOpen.drivers && autoCompleteResults.drivers.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {autoCompleteResults.drivers.map((driver) => (
                        <div
                          key={driver.id}
                          className="autocomplete-item"
                          onClick={() => selectDriver(driver)}
                        >
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.license_number}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Route Planning Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Route Planning
              </h3>
              <button
                type="button"
                onClick={() => toggleSection('route-planning')}
                className={`section-toggle ${collapsedSections.has('route-planning') ? 'collapsed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            {!collapsedSections.has('route-planning') && (
              <div className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Origin Warehouse</label>
                  <select className="form-input" {...register('warehouse_id')}>
                    <option value="">Select warehouse...</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Add Destinations</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="form-input pl-10"
                      placeholder="Search destinations..."
                      onChange={(e) => handleDestinationSearch(e.target.value)}
                    />
                  </div>
                  
                  {autoCompleteOpen.destinations && autoCompleteResults.destinations.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {autoCompleteResults.destinations.map((destination) => (
                        <div
                          key={destination.id}
                          className="autocomplete-item"
                          onClick={() => addDestination(destination)}
                        >
                          <div className="font-medium">{destination.name}</div>
                          <div className="text-sm text-gray-500">{destination.place_name || destination.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedDestinationObjects.length > 0 && (
                  <div className="destination-chips">
                    {selectedDestinationObjects.map((destination, index) => (
                      <div key={destination.id} className="destination-chip">
                        <span>{destination.name}</span>
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => removeDestination(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Material Types</label>
                  <div className="material-types">
                    {materialTypes.map((material) => (
                      <div
                        key={material.id}
                        className={`material-type-item ${
                          (watchedValues.material_type_ids || []).includes(material.id) ? 'selected' : ''
                        }`}
                        onClick={() => {
                          const currentIds = watchedValues.material_type_ids || [];
                          const newIds = currentIds.includes(material.id)
                            ? currentIds.filter(id => id !== material.id)
                            : [...currentIds, material.id];
                          setValue('material_type_ids', newIds);
                        }}
                      >
                        <div className="material-type-label">{material.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trip Details Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary-600" />
                Trip Details
              </h3>
              <button
                type="button"
                onClick={() => toggleSection('trip-details')}
                className={`section-toggle ${collapsedSections.has('trip-details') ? 'collapsed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            {!collapsedSections.has('trip-details') && (
              <div className="space-y-3">
                <div className="mobile-grid-2">
                  <div className="form-group">
                    <label className="form-label">Start KM *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        className="form-input pl-10"
                        {...register('start_km', { required: true, min: 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">End KM *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        className="form-input pl-10"
                        {...register('end_km', { required: true, min: 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Distance:</span>
                    <span className="text-sm font-medium">{computedDistance} km</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Gross Weight (kg) *</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      className="form-input pl-10"
                      {...register('gross_weight', { required: true, min: 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trip Type Toggle */}
          <div className="form-section">
            <div className="toggle-container">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Trip Type</h3>
                <p className="text-sm text-gray-600">Include refueling in this trip</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isRefuelingTrip}
                  onChange={(e) => {
                    setIsRefuelingTrip(e.target.checked);
                    setShowRefuelingDetails(e.target.checked);
                    setValue('refueling_done', e.target.checked);
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Refueling Details Section */}
          {isRefuelingTrip && (
            <div className="form-section">
              <div className="form-section-header">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-green-600" />
                  Refueling Details
                </h3>
                <button
                  type="button"
                  onClick={() => toggleSection('refueling')}
                  className={`section-toggle ${collapsedSections.has('refueling') ? 'collapsed' : ''}`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              
              {!collapsedSections.has('refueling') && (
                <div className="space-y-3">
                  <div className="form-group">
                    <label className="form-label">Fuel Station</label>
                    <input
                      type="text"
                      className="form-input"
                      {...register('station')}
                      placeholder="Fuel station name"
                    />
                  </div>

                  <div className="mobile-grid-2">
                    <div className="form-group">
                      <label className="form-label">Fuel Quantity (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        {...register('fuel_quantity', { min: 0 })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Rate per Liter (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        {...register('fuel_rate_per_liter', { min: 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Fuel Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      {...register('total_fuel_cost', { min: 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fuel Bill Upload</label>
                    <div className="mobile-file-upload">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        {...register('fuel_bill_url')}
                      />
                      <label className="mobile-file-upload-label">
                        <Upload className="h-4 w-4" />
                        <span>Upload fuel bill</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expenses Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-amber-600" />
                Trip Expenses
              </h3>
              <button
                type="button"
                onClick={() => toggleSection('expenses')}
                className={`section-toggle ${collapsedSections.has('expenses') ? 'collapsed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            {!collapsedSections.has('expenses') && (
              <div className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Unloading Expense (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    {...register('unloading_expense', { min: 0 })}
                    placeholder="0"
                  />
                </div>

                <div className="mobile-expense-grid">
                  <div className="form-group">
                    <label className="form-label">Driver Bata (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      {...register('driver_expense', { min: 0 })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Road/RTO (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      {...register('road_rto_expense', { min: 0 })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">FASTag/Toll (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      {...register('toll_expense', { min: 0 })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Miscellaneous (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      {...register('miscellaneous_expense', { min: 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Road Expenses (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input bg-gray-50"
                    value={watchedValues.total_road_expenses || 0}
                    disabled
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Information Section */}
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                Additional Information
              </h3>
              <button
                type="button"
                onClick={() => toggleSection('additional')}
                className={`section-toggle ${collapsedSections.has('additional') ? 'collapsed' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            {!collapsedSections.has('additional') && (
              <div className="space-y-3">
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    {...register('remarks')}
                    placeholder="Any additional notes about this trip..."
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Fixed Bottom Action Button */}
      <div className="bottom-action-container">
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 w-full py-3 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
          className="save-trip-btn"
        >
          {isSubmitting ? (
            <>
              <div className="spinner"></div>
              Saving...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              {initialData ? 'Update Trip' : 'Save Trip'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileTripForm;
