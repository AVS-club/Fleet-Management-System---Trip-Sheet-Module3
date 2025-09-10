import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripList from '../components/trips/TripList';
import TripListView from '../components/trips/TripListView';
import TripTable from '../components/trips/TripTable';
import TripDashboard from '../components/trips/TripDashboard';
import TripForm from '../components/trips/TripForm';
import TripPnlModal from '../components/trips/TripPnlModal';
import ComprehensiveFilters, { ViewMode } from '../components/trips/ComprehensiveFilters';
import Button from '../components/ui/Button';
import { Trip, TripFormData, Vehicle, Driver, Warehouse } from '@/types';
import { getTrips, getVehicles, getDrivers, createTrip, updateTrip, getWarehouses, getDestinations } from '../utils/storage';
import { getMaterialTypes, MaterialType } from '../utils/materialTypes';
import { validateTripSerialUniqueness } from '../utils/tripSerialGenerator';
import { uploadFilesAndGetPublicUrls } from '../utils/supabaseStorage';
import { searchTrips, TripFilters, useDebounce } from '../utils/tripSearch';
import { PlusCircle, FileText, BarChart2, Route, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';

const TripsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTripForPnl, setSelectedTripForPnl] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [tripsPerPage, setTripsPerPage] = useState(25);
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // Enhanced filter state with new comprehensive filters
  const [filters, setFilters] = useState<TripFilters>({
    search: '',
    vehicle: '',
    driver: '',
    warehouse: '',
    refueling: 'all',
    dateRange: 'all',
    startDate: '',
    endDate: '',
    materials: [],
    routeDeviation: false,
    sortBy: 'date-desc'
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  
  // Handle cloned trip data from location state
  const [clonedTripData, setClonedTripData] = useState<Partial<TripFormData> | null>(null);

  // Check for cloned trip data or action query parameter
  useEffect(() => {
    // Check query parameters
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    
    if (location.state?.clonedTripData) {
      setClonedTripData(location.state.clonedTripData);
      setEditingTrip(null); // Clear any editing trip
      setIsAddingTrip(true); // Open the add form
      
      // Clear the location state to prevent re-applying cloned data
      window.history.replaceState({}, document.title);
    } else if (location.state?.openAddForm || action === 'new') {
      // Handle opening add form without clone data
      setIsAddingTrip(true);
      
      // Clear query params and state
      if (action === 'new') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, location.search]);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tripsData, vehiclesData, driversData, warehousesData, destinationsData, materialTypesData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations(),
          getMaterialTypes()
        ]);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setDestinations(Array.isArray(destinationsData) ? destinationsData : []);
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
  
  // Debounced search to reduce API calls
  const debouncedFilters = useDebounce(filters, 300);
  
  // Perform search using the comprehensive search system
  const performSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const result = await searchTrips(
        trips,
        vehicles,
        drivers,
        warehouses,
        debouncedFilters,
        { page: currentPage, limit: tripsPerPage }
      );
      setSearchResult(result);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [trips, vehicles, drivers, warehouses, debouncedFilters, currentPage, tripsPerPage]);
  
  // Perform search when dependencies change
  useEffect(() => {
    if (trips.length > 0 && vehicles.length > 0 && drivers.length > 0) {
      performSearch();
    }
  }, [performSearch, trips.length, vehicles.length, drivers.length]);
  
  // Get current display data
  const currentTrips = searchResult?.trips || [];
  const totalTrips = searchResult?.totalCount || 0;
  const statistics = searchResult?.statistics;
  const totalPages = Math.ceil(totalTrips / tripsPerPage);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);
  
  // Handle pagination
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setTripsPerPage(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };
  
  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: TripFilters) => {
    setFilters(newFilters);
  }, []);
  
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

      // Add or update trip in storage
      if (editingTrip?.id) {
        // Update existing trip
        const updatedTrip = await updateTrip(editingTrip.id, {
          ...tripData,
          fuel_bill_url: fuelBillUrl || editingTrip.fuel_bill_url
        });
        
        if (updatedTrip) {
          // Update state
          setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
          setIsAddingTrip(false);
          setEditingTrip(null);
          toast.success('Trip updated successfully');
        } else {
          throw new Error('Failed to update trip');
        }
      } else {
        // Add new trip
        const newTrip = await createTrip({
          ...tripData,
          fuel_bill_url: fuelBillUrl
        });
        
        if (newTrip) {
          // Update state
          setTrips(prev => Array.isArray(prev) ? [...prev, newTrip] : [newTrip]);
          setIsAddingTrip(false);
          setEditingTrip(null);
          setClonedTripData(null); // Clear cloned data after successful submission
          
          // Redirect to the trip details page
          navigate(`/trips/${newTrip.id}`);
          toast.success('Trip added successfully');
        } else {
          throw new Error('Failed to add trip');
        }
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
                setClonedTripData(null);
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
                setClonedTripData(null); // Clear cloned data on cancel
              }}
            >
              Cancel
            </Button>
          </div>
          
          <TripForm
            onSubmit={handleAddTrip}
            onCancel={() => {
              setIsAddingTrip(false);
              setEditingTrip(null);
              setClonedTripData(null);
            }}
            isSubmitting={isSubmitting}
            trips={trips}
            initialData={clonedTripData || (editingTrip ? {
              id: editingTrip.id,
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
              fuel_rate_per_liter: editingTrip.fuel_rate_per_liter,
              fuel_cost: editingTrip.fuel_cost,
              total_fuel_cost: editingTrip.total_fuel_cost,
              unloading_expense: editingTrip.unloading_expense,
              driver_expense: editingTrip.driver_expense,
              road_rto_expense: editingTrip.road_rto_expense,
              toll_expense: editingTrip.toll_expense || editingTrip.breakdown_expense,
              breakdown_expense: editingTrip.breakdown_expense, // Keep for backward compatibility
              miscellaneous_expense: editingTrip.miscellaneous_expense,
              total_road_expenses: editingTrip.total_road_expenses,
              remarks: editingTrip.remarks,
              material_type_ids: editingTrip.material_type_ids,
              trip_serial_number: editingTrip.trip_serial_number,
              manual_trip_id: editingTrip.manual_trip_id,
              is_return_trip: editingTrip.is_return_trip,
              station: editingTrip.station
            } : undefined)}
            allVehicles={vehicles}
            allDrivers={drivers}
            allDestinations={destinations}
            allWarehouses={warehouses}
            allMaterialTypes={materialTypes}
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
          
          {/* Comprehensive Filters */}
          <ComprehensiveFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            vehicles={vehicles}
            drivers={drivers}
            warehouses={warehouses}
            materialTypes={materialTypes}
            statistics={statistics}
            isSearching={isSearching}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          
          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading trips...</span>
            </div>
          ) : (
            <>
              {/* Render different views based on viewMode */}
              {viewMode === 'table' ? (
                <TripTable
                  trips={currentTrips}
                  vehicles={vehicles}
                  drivers={drivers}
                  onSelectTrip={handleTripSelect}
                  onPnlClick={handlePnlClick}
                  onEditTrip={handleEditTrip}
                />
              ) : viewMode === 'list' ? (
                <TripListView
                  trips={currentTrips}
                  vehicles={vehicles}
                  drivers={drivers}
                  onSelectTrip={handleTripSelect}
                  onPnlClick={handlePnlClick}
                  onEditTrip={handleEditTrip}
                />
              ) : (
                <TripList 
                  trips={currentTrips} 
                  vehicles={vehicles} 
                  drivers={drivers}
                  onSelectTrip={handleTripSelect}
                  onPnlClick={handlePnlClick}
                  onEditTrip={handleEditTrip}
                />
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Page Info */}
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} • {totalTrips} total trips
                    </div>
                    
                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        inputSize="sm"
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
                        inputSize="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        icon={<ChevronRight className="h-4 w-4" />}
                      >
                        Next
                      </Button>
                    </div>
                    
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Trips per page:</label>
                      <select
                        value={tripsPerPage}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
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