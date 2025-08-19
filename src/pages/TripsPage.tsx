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
import { uploadFilesAndGetPublicUrls } from '../utils/supabaseStorage';
import { PlusCircle, FileText, BarChart2 } from 'lucide-react';
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
    
    // Validate vehicle_id is present
    if (!data.vehicle_id) {
      console.error("vehicle_id is missing at trip submission.");
      toast.error("Vehicle selection is required");
      setIsSubmitting(false);
      return;
    }
    
    // Extract destination IDs
    const destinationIds = data.destinations;
    
    try {
      // Handle file upload to Supabase Storage
      let fuelBillUrl: string | undefined = undefined;
      if (data.fuel_bill_file && Array.isArray(data.fuel_bill_file) && data.fuel_bill_file.length > 0) {
        try {
          const uploadedUrls = await uploadFilesAndGetPublicUrls(
            'trip-docs',
            `trip_${Date.now()}/fuel_bill`,
            data.fuel_bill_file
          );
          fuelBillUrl = uploadedUrls[0]; // Take the first uploaded file URL
        } catch (uploadError) {
          console.error('Error uploading fuel bill:', uploadError);
          toast.error('Failed to upload fuel bill');
          setIsSubmitting(false);
          return;
        }
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
        
        // Redirect to the trip details page
        navigate(`/trips/${newTrip.id}`);
        toast.success('Trip added successfully');
      } else {
        toast.error('Failed to add trip');
      }
    } catch (error) {
      console.error('Error adding trip:', error);
      toast.error('Error adding trip');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTripSelect = (trip: Trip) => {
    navigate(`/trips/${trip.id}`);
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
    <Layout
      title="Trip Management"
      subtitle="Log and track all vehicle trips"
      actions={
        !isAddingTrip ? (
          <div className="flex flex-wrap gap-3">
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
          <Button
            variant="outline"
            onClick={() => setIsAddingTrip(false)}
          >
            Cancel
          </Button>
        )
      }
    >
      {isAddingTrip ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-500" />
              New Trip Sheet
            </h2>
            
            <Button
              variant="outline"
              onClick={() => setIsAddingTrip(false)}
            >
              Cancel
            </Button>
          </div>
          
          <TripForm
            onSubmit={handleAddTrip}
            isSubmitting={isSubmitting}
            trips={trips}
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