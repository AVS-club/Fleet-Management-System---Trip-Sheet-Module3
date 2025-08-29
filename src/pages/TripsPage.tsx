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
import { Trip, TripFormData, Vehicle, Driver } from '../types';
import { getTrips, getVehicles, getDrivers, createTrip } from '../utils/storage';
import { validateTripSerialUniqueness } from '../utils/tripSerialGenerator';
import { uploadFilesAndGetPublicUrls } from '../utils/supabaseStorage';
import { PlusCircle, FileText, BarChart2, Route, Search, Filter, ChevronLeft, ChevronRight, SortAsc } from 'lucide-react';
import { toast } from 'react-toastify';

const TripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTripForPnl, setSelectedTripForPnl] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  // Filter and sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterRefueling, setFilterRefueling] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'distance' | 'mileage' | 'profit' | 'vehicle' | 'driver';
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 12 trips per page for good mobile experience
  
  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsData, vehiclesData, driversData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers()
        ]);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };
    
    fetchData();
  }, []);
  
  // Create lookup maps for efficient filtering
  const vehiclesMap = React.useMemo(() => {
    return new Map(vehicles.map(v => [v.id, v]));
  }, [vehicles]);

  const driversMap = React.useMemo(() => {
    return new Map(drivers.map(d => [d.id, d]));
  }, [drivers]);

  // Filter and sort trips
  const filteredAndSortedTrips = React.useMemo(() => {
    let filtered = Array.isArray(trips) ? trips.filter(trip => {
      // Search by trip serial, vehicle registration or driver name
      if (searchTerm) {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        const driver = driversMap.get(trip.driver_id);
        
        const searchLower = searchTerm.toLowerCase();
        const serialMatch = trip.trip_serial_number?.toLowerCase().includes(searchLower);
        const vehicleMatch = vehicle?.registration_number?.toLowerCase().includes(searchLower);
        const driverMatch = driver?.name?.toLowerCase().includes(searchLower);
        if (!(serialMatch || vehicleMatch || driverMatch)) {
          return false;
        }
      }
      
      // Filter by vehicle
      if (filterVehicle && trip.vehicle_id !== filterVehicle) {
        return false;
      }
      
      // Filter by driver
      if (filterDriver && trip.driver_id !== filterDriver) {
        return false;
      }
      
      // Filter by refueling status
      if (filterRefueling === 'refueling' && !trip.refueling_done) {
        return false;
      } else if (filterRefueling === 'no-refueling' && trip.refueling_done) {
        return false;
      }
      
      return true;
    }) : [];

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.trip_start_date || 0).getTime();
          bValue = new Date(b.trip_start_date || 0).getTime();
          break;
        case 'distance':
          aValue = (a.end_km || 0) - (a.start_km || 0);
          bValue = (b.end_km || 0) - (b.start_km || 0);
          break;
        case 'mileage':
          aValue = a.calculated_kmpl || 0;
          bValue = b.calculated_kmpl || 0;
          break;
        case 'profit':
          aValue = a.net_profit || 0;
          bValue = b.net_profit || 0;
          break;
        case 'vehicle':
          const vehicleA = vehiclesMap.get(a.vehicle_id);
          const vehicleB = vehiclesMap.get(b.vehicle_id);
          aValue = vehicleA?.registration_number || '';
          bValue = vehicleB?.registration_number || '';
          break;
        case 'driver':
          const driverA = driversMap.get(a.driver_id);
          const driverB = driversMap.get(b.driver_id);
          aValue = driverA?.name || '';
          bValue = driverB?.name || '';
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [trips, searchTerm, filterVehicle, filterDriver, filterRefueling, sortConfig, vehiclesMap, driversMap]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedTrips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrips = filteredAndSortedTrips.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterVehicle, filterDriver, filterRefueling, sortConfig]);

  // Handle page navigation
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [key, direction] = value.split('-') as [typeof sortConfig.key, 'asc' | 'desc'];
    setSortConfig({ key, direction });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterVehicle('');
    setFilterDriver('');
    setFilterRefueling('');
    setSortConfig({ key: 'date', direction: 'desc' });
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
          
          {/* Filters and Sorting */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col space-y-4">
              {/* Top row: Search, Sort, Filter toggle */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search trips by serial, vehicle or driver"
                    icon={<Search className="h-4 w-4" />}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <div className="w-48">
                    <Select
                      options={[
                        { value: 'date-desc', label: 'Date (Newest)' },
                        { value: 'date-asc', label: 'Date (Oldest)' },
                        { value: 'distance-desc', label: 'Distance (High to Low)' },
                        { value: 'distance-asc', label: 'Distance (Low to High)' },
                        { value: 'mileage-desc', label: 'Mileage (High to Low)' },
                        { value: 'mileage-asc', label: 'Mileage (Low to High)' },
                        { value: 'profit-desc', label: 'Profit (High to Low)' },
                        { value: 'profit-asc', label: 'Profit (Low to High)' },
                        { value: 'vehicle-asc', label: 'Vehicle (A-Z)' },
                        { value: 'driver-asc', label: 'Driver (A-Z)' }
                      ]}
                      value={`${sortConfig.key}-${sortConfig.direction}`}
                      onChange={(e) => handleSortChange(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    icon={<Filter className="h-4 w-4" />}
                  >
                    Filters
                  </Button>
                </div>
              </div>
              
              {/* Expandable filters row */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                  <Select
                    label="Vehicle"
                    options={[
                      { value: '', label: 'All Vehicles' },
                      ...vehicles.map(vehicle => ({
                        value: vehicle.id,
                        label: vehicle.registration_number
                      }))
                    ]}
                    value={filterVehicle}
                    onChange={e => setFilterVehicle(e.target.value)}
                  />
                  
                  <Select
                    label="Driver"
                    options={[
                      { value: '', label: 'All Drivers' },
                      ...drivers.map(driver => ({
                        value: driver.id,
                        label: driver.name
                      }))
                    ]}
                    value={filterDriver}
                    onChange={e => setFilterDriver(e.target.value)}
                  />
                  
                  <Select
                    label="Refueling Status"
                    options={[
                      { value: '', label: 'All Trips' },
                      { value: 'refueling', label: 'Refueling Trips' },
                      { value: 'no-refueling', label: 'No Refueling' }
                    ]}
                    value={filterRefueling}
                    onChange={e => setFilterRefueling(e.target.value)}
                  />
                  
                  <div className="sm:col-span-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Results summary */}
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedTrips.length)} of {filteredAndSortedTrips.length} trips
                </span>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            </div>
          </div>
          
          <TripList 
            trips={paginatedTrips} 
            vehicles={vehicles} 
            drivers={drivers}
            onSelectTrip={handleTripSelect}
            onPnlClick={handlePnlClick}
            onEditTrip={handleEditTrip}
          />
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                
                {/* Page numbers - show max 5 pages */}
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    
                    // Adjust page numbers based on current page
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
                        className={`px-3 py-1 text-sm rounded-md ${
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
              
              {/* Mobile page indicator */}
              <div className="sm:hidden text-sm text-gray-500">
                {currentPage} / {totalPages}
              </div>
              
              {/* Jump to page input for large datasets */}
              {totalPages > 10 && (
                <div className="hidden md:flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Go to page:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        handlePageChange(page);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>
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