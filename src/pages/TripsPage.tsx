import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripList from '../components/trips/TripList';
import TripDashboard from '../components/trips/TripDashboard';
import TripForm from '../components/trips/TripForm';
import TripPnlModal from '../components/trips/TripPnlModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import MultiSelect from '../components/ui/MultiSelect';
import Checkbox from '../components/ui/Checkbox';
import { Trip, TripFormData, Vehicle, Driver, Warehouse } from '../types';
import { getTrips, getVehicles, getDrivers, createTrip, getWarehouses } from '../utils/storage';
import { getMaterialTypes, MaterialType } from '../utils/materialTypes';
import { validateTripSerialUniqueness } from '../utils/tripSerialGenerator';
import { uploadFilesAndGetPublicUrls } from '../utils/supabaseStorage';
import { PlusCircle, FileText, BarChart2, Route, Calendar, MapPin, Package, AlertTriangle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { parseISO, isValid, isWithinInterval } from 'date-fns';

const TripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTripForPnl, setSelectedTripForPnl] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [tripsPerPage] = useState(10);
  const [showLoadMore, setShowLoadMore] = useState(false);
  
  // Enhanced filter state
  const [filters, setFilters] = useState({
    search: '',
    vehicle: '',
    driver: '',
    refueling: '',
    startDate: '',
    endDate: '',
    warehouse: '',
    materials: [] as string[],
    routeDeviation: false
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Load data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tripsData, vehiclesData, driversData, warehousesData, materialTypesData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getMaterialTypes()
        ]);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter trips based on all filter criteria
  const filteredTrips = React.useMemo(() => {
    return Array.isArray(trips) ? trips.filter(trip => {
      // Search filter
      if (filters.search) {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        const driver = drivers.find(d => d.id === trip.driver_id);
        
        const searchLower = filters.search.toLowerCase();
        const serialMatch = trip.trip_serial_number?.toLowerCase().includes(searchLower);
        const vehicleMatch = vehicle?.registration_number?.toLowerCase().includes(searchLower);
        const driverMatch = driver?.name?.toLowerCase().includes(searchLower);
        if (!(serialMatch || vehicleMatch || driverMatch)) {
          return false;
        }
      }
      
      // Vehicle filter
      if (filters.vehicle && trip.vehicle_id !== filters.vehicle) {
        return false;
      }
      
      // Driver filter
      if (filters.driver && trip.driver_id !== filters.driver) {
        return false;
      }
      
      // Refueling filter
      if (filters.refueling === 'refueling' && !trip.refueling_done) {
        return false;
      } else if (filters.refueling === 'no-refueling' && trip.refueling_done) {
        return false;
      }
      
      // Date range filter
      if (filters.startDate || filters.endDate) {
        const tripDate = parseISO(trip.trip_start_date);
        if (!isValid(tripDate)) return false;
        
        if (filters.startDate) {
          const startDate = parseISO(filters.startDate);
          if (isValid(startDate) && tripDate < startDate) return false;
        }
        
        if (filters.endDate) {
          const endDate = parseISO(filters.endDate);
          if (isValid(endDate) && tripDate > endDate) return false;
        }
      }
      
      // Warehouse filter
      if (filters.warehouse && trip.warehouse_id !== filters.warehouse) {
        return false;
      }
      
      // Material filter
      if (filters.materials.length > 0) {
        if (!trip.material_type_ids || trip.material_type_ids.length === 0) {
          return false;
        }
        const hasMatchingMaterial = filters.materials.some(materialId => 
          trip.material_type_ids?.includes(materialId)
        );
        if (!hasMatchingMaterial) return false;
      }
      
      // Route deviation filter
      if (filters.routeDeviation) {
        if (!trip.route_deviation || Math.abs(trip.route_deviation) <= 8) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) =>
      new Date(b.trip_start_date || 0).getTime() -
      new Date(a.trip_start_date || 0).getTime()
    ) : [];
  }, [trips, filters, vehicles, drivers]);
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredTrips.length / tripsPerPage);
  const indexOfLastTrip = currentPage * tripsPerPage;
  const indexOfFirstTrip = indexOfLastTrip - tripsPerPage;
  const currentTrips = filteredTrips.slice(indexOfFirstTrip, indexOfLastTrip);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  
  // Handle pagination
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle load more
  const handleLoadMore = () => {
    const nextPageTrips = filteredTrips.slice(indexOfLastTrip, indexOfLastTrip + tripsPerPage);
    setCurrentPage(prev => prev + 1);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      vehicle: '',
      driver: '',
      refueling: '',
      startDate: '',
      endDate: '',
      warehouse: '',
      materials: [],
      routeDeviation: false
    });
    setCurrentPage(1);
  };
  
  const handleAddTrip = async (data: TripFormData) => {
    setIsSubmitting(true);
    
    try {
    // Validate trip serial number uniqueness
    if (data.trip_serial_number) {
        // Pass current trip ID if editing to exclude it from uniqueness check
        const excludeTripId = editingTrip?.id;
        const isUnique = await validateTripSerialUniqueness(data.trip_serial_number, excludeTripId);
        if (!isUnique) {
          toast.error('Trip serial number already exists. Please use a different number.');
          setIsSubmitting(false);
          return;
        }
    }
      
      // Validate vehicle_id is present
      if (!data.vehicle_id) {
        throw new Error("Vehicle selection is required");
      }
      
      // Validate required fields
      if (!data.driver_id) {
        throw new Error("Driver selection is required");
      }
      
      if (!data.warehouse_id) {
        throw new Error("Origin warehouse is required");
      }
      
      if (!data.destinations || data.destinations.length === 0) {
        throw new Error("At least one destination is required");
      }
      
      if (!data.start_km) {
        throw new Error("Start KM is required");
      }
      
      if (!data.end_km) {
        throw new Error("End KM is required");
      }
      
      // Handle file upload to Supabase Storage
      let fuelBillUrl: string | undefined = undefined;
      if (data.fuel_bill_file && Array.isArray(data.fuel_bill_file) && data.fuel_bill_file.length > 0) {
          const uploadedUrls = await uploadFilesAndGetPublicUrls(
            'trip-docs',
            `trip_${Date.now()}/fuel_bill`,
            data.fuel_bill_file
          );
          fuelBillUrl = uploadedUrls[0]; // Take the first uploaded file URL
      }
      
      // Create trip without the file object (replaced with URL)
      const { fuel_bill_file, ...tripData } = data;

      // Add trip to storage
      const newTrip = await createTrip({
        ...tripData,
        fuel_bill_url: fuelBillUrl
      });
      
      if (newTrip) {
        // Update state
        setTrips(prev => Array.isArray(prev) ? [...prev, newTrip] : [newTrip]);
        setIsAddingTrip(false);
        setEditingTrip(null);
        
        // Redirect to the trip details page
        navigate(`/trips/${newTrip.id}`);
        toast.success('Trip added successfully');
      } else {
        throw new Error('Failed to add trip');
      }
    } catch (error) {
      console.error('Error adding trip:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Error adding trip';
      toast.error(errorMessage);
      
      // The error will be caught by TripForm's handleFormSubmit which will focus the first error field
      throw error; // Re-throw to trigger field focusing in TripForm
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTripSelect = (trip: Trip) => {
    navigate(`/trips/${trip.id}`);
  };
  
  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setIsAddingTrip(true);
  };

  const handlePnlClick = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setSelectedTripForPnl(trip);
  };

  const handleTripUpdate = (updatedTrip: Trip) => {
    setTrips(prev => 
      prev.map(trip => trip.id === updatedTrip.id ? updatedTrip : trip)
    );
  };
  
  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Route className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Trip Management</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Log and track all vehicle trips</p>
        {!isAddingTrip ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/trip-pnl-reports')}
              icon={<BarChart2 className="h-4 w-4" />}
            >
              P&L Report
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDashboard(!showDashboard)}
            >
              {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
            </Button>
            <Button
              onClick={() => setIsAddingTrip(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              Add New Trip
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingTrip(false);
                setEditingTrip(null);
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {isAddingTrip ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center border-l-2 border-blue-500 pl-2">
              <FileText className="h-5 w-5 mr-2 text-primary-500" />
              New Trip Sheet
            </h2>
            
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingTrip(false);
                setEditingTrip(null);
              }}
            >
              Cancel
            </Button>
          </div>
          
          <TripForm
            onSubmit={handleAddTrip}
            isSubmitting={isSubmitting}
            trips={trips}
            initialData={editingTrip ? {
              vehicle_id: editingTrip.vehicle_id,
              driver_id: editingTrip.driver_id,
              warehouse_id: editingTrip.warehouse_id,
              destinations: editingTrip.destinations,
              trip_start_date: editingTrip.trip_start_date,
              trip_end_date: editingTrip.trip_end_date,
              start_km: editingTrip.start_km,
              end_km: editingTrip.end_km,
              gross_weight: editingTrip.gross_weight,
              refueling_done: editingTrip.refueling_done,
              fuel_quantity: editingTrip.fuel_quantity,
              fuel_cost: editingTrip.fuel_cost,
              total_fuel_cost: editingTrip.total_fuel_cost,
              unloading_expense: editingTrip.unloading_expense,
              driver_expense: editingTrip.driver_expense,
              road_rto_expense: editingTrip.road_rto_expense,
              breakdown_expense: editingTrip.breakdown_expense,
              miscellaneous_expense: editingTrip.miscellaneous_expense,
              total_road_expenses: editingTrip.total_road_expenses,
              remarks: editingTrip.remarks,
              material_type_ids: editingTrip.material_type_ids,
              trip_serial_number: editingTrip.trip_serial_number,
              manual_trip_id: editingTrip.manual_trip_id,
              is_return_trip: editingTrip.is_return_trip
            } : undefined}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {showDashboard && (
            <TripDashboard 
              trips={trips}
              vehicles={vehicles}
              drivers={drivers}
            />
          )}
          
          {/* Enhanced Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Filter className="h-5 w-5 mr-2 text-primary-500" />
                Trip Filters
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={Object.values(filters).every(v => !v || (Array.isArray(v) && v.length === 0))}
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <Input
                  placeholder="Search trips..."
                  value={filters.search}
                  onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  size="sm"
                />
                
                {/* Vehicle Filter */}
                <Select
                  options={[
                    { value: '', label: 'All Vehicles' },
                    ...vehicles.map(vehicle => ({
                      value: vehicle.id,
                      label: vehicle.registration_number
                    }))
                  ]}
                  value={filters.vehicle}
                  onChange={e => setFilters(prev => ({ ...prev, vehicle: e.target.value }))}
                  size="sm"
                />
                
                {/* Driver Filter */}
                <Select
                  options={[
                    { value: '', label: 'All Drivers' },
                    ...drivers.map(driver => ({
                      value: driver.id,
                      label: driver.name
                    }))
                  ]}
                  value={filters.driver}
                  onChange={e => setFilters(prev => ({ ...prev, driver: e.target.value }))}
                  size="sm"
                />
                
                {/* Refueling Status */}
                <Select
                  options={[
                    { value: '', label: 'All Trips' },
                    { value: 'refueling', label: 'Refueling Trips' },
                    { value: 'no-refueling', label: 'No Refueling' }
                  ]}
                  value={filters.refueling}
                  onChange={e => setFilters(prev => ({ ...prev, refueling: e.target.value }))}
                  size="sm"
                />
                
                {/* Date Range */}
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  size="sm"
                  icon={<Calendar className="h-4 w-4" />}
                />
                
                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  size="sm"
                  icon={<Calendar className="h-4 w-4" />}
                />
                
                {/* Warehouse Filter */}
                <Select
                  options={[
                    { value: '', label: 'All Warehouses' },
                    ...warehouses.map(warehouse => ({
                      value: warehouse.id,
                      label: warehouse.name
                    }))
                  ]}
                  value={filters.warehouse}
                  onChange={e => setFilters(prev => ({ ...prev, warehouse: e.target.value }))}
                  size="sm"
                />
                
                {/* Material Types Filter */}
                <MultiSelect
                  options={materialTypes.map(material => ({
                    value: material.id,
                    label: material.name
                  }))}
                  value={filters.materials}
                  onChange={materials => setFilters(prev => ({ ...prev, materials }))}
                  size="sm"
                />
                
                {/* Route Deviation Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    label="Route Deviation > 8%"
                    checked={filters.routeDeviation}
                    onChange={e => setFilters(prev => ({ ...prev, routeDeviation: e.target.checked }))}
                  />
                </div>
              </div>
            )}
            
            {/* Filter Summary */}
            <div className="mt-3 text-sm text-gray-600">
              Showing {currentTrips.length} of {filteredTrips.length} trips
              {filteredTrips.length !== trips.length && ` (filtered from ${trips.length} total)`}
            </div>
          </div>
          
          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading trips...</span>
            </div>
          ) : (
            <>
              <TripList 
                trips={currentTrips} 
                vehicles={vehicles} 
                drivers={drivers}
                onSelectTrip={handleTripSelect}
                onPnlClick={handlePnlClick}
                onEditTrip={handleEditTrip}
              />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Page Info */}
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} • {filteredTrips.length} total trips
                    </div>
                    
                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        icon={<ChevronLeft className="h-4 w-4" />}
                      >
                        Prev
                      </Button>
                      
                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum = i + 1;
                          
                          // Smart pagination logic
                          if (totalPages > 5) {
                            if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        icon={<ChevronRight className="h-4 w-4" />}
                      >
                        Next
                      </Button>
                    </div>
                    
                    {/* Load More Option */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        label="Load More Style"
                        checked={showLoadMore}
                        onChange={e => setShowLoadMore(e.target.checked)}
                      />
                      {showLoadMore && currentPage < totalPages && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMore}
                        >
                          Load More
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* P&L Modal */}
      {selectedTripForPnl && (
        <TripPnlModal
          isOpen={!!selectedTripForPnl}
          onClose={() => setSelectedTripForPnl(null)}
          trip={selectedTripForPnl}
          vehicle={vehicles.find(v => v.id === selectedTripForPnl.vehicle_id)}
          driver={drivers.find(d => d.id === selectedTripForPnl.driver_id)}
          onUpdate={handleTripUpdate}
        />
      )}
    </Layout>
  );
};

export default TripsPage;