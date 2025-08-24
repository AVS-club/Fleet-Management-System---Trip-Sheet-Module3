import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripList from '../components/trips/TripList';
import TripDashboard from '../components/trips/TripDashboard';
import TripForm from '../components/trips/TripForm';
import TripPnlModal from '../components/trips/TripPnlModal';
import Button from '../components/ui/Button';
import { Trip, TripFormData, Vehicle, Driver, Destination } from '../types';
import { getTrips, getVehicles, getDrivers, createTrip, deleteTrip } from '../utils/storage';
import { validateTripSerialUniqueness } from '../utils/tripSerialGenerator';
import { uploadFilesAndGetPublicUrls } from '../utils/supabaseStorage';
import { PlusCircle, FileText, BarChart2, Route } from 'lucide-react';
import { toast } from 'react-toastify';

const TripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedTripForPnl, setSelectedTripForPnl] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
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
      
      // Extract destination IDs
      const destinationIds = data.destinations;
      
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
      const { fuel_bill_file, station, fuel_station_id, ...tripData } = data;

      // Handle fuel station ID - ensure it's properly set or null
      const fuelStationId = fuel_station_id && fuel_station_id.trim() !== '' ? fuel_station_id : null;

      // Add trip to storage
      const newTrip = await createTrip({
        ...tripData,
        fuel_station_id: fuelStationId,
        station: station || null,
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
              station: editingTrip.station,
              fuel_station_id: editingTrip.fuel_station_id,
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
          
          <TripList 
            trips={trips} 
            vehicles={vehicles} 
            drivers={drivers}
            onSelectTrip={handleTripSelect}
            onPnlClick={handlePnlClick}
            onEditTrip={handleEditTrip}
          />
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