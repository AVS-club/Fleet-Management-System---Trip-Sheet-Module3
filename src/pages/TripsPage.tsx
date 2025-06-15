import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripList from '../components/trips/TripList';
import TripDashboard from '../components/trips/TripDashboard';
import TripForm from '../components/trips/TripForm';
import Button from '../components/ui/Button';
import { Trip, TripFormData, Vehicle, Driver, Destination } from '../types';
import { getTrips, getVehicles, getDrivers, createTrip, deleteTrip } from '../utils/storage';
import { PlusCircle, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from '../utils/translationUtils';

const TripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  
  // Translate UI text
  const title = useTranslation('Trip Management');
  const subtitle = useTranslation('Log and track all vehicle trips');
  const hideDashboardText = useTranslation('Hide Dashboard');
  const showDashboardText = useTranslation('Show Dashboard');
  const addNewTripText = useTranslation('Add New Trip');
  const cancelText = useTranslation('Cancel');
  const newTripSheetText = useTranslation('New Trip Sheet');
  
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
      // Handle file upload (in a real app, this would upload to a server)
      let fuelBillUrl: string | undefined = undefined;
      if (data.fuel_bill_file) {
        // Create a fake URL for demo purposes
        fuelBillUrl = URL.createObjectURL(data.fuel_bill_file);
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
        toast.success(useTranslation('Trip added successfully'));
      } else {
        toast.error(useTranslation('Failed to add trip'));
      }
    } catch (error) {
      console.error('Error adding trip:', error);
      toast.error(useTranslation('Error adding trip'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTripSelect = (trip: Trip) => {
    navigate(`/trips/${trip.id}`);
  };
  
  return (
    <Layout
      title={title}
      subtitle={subtitle}
      actions={
        !isAddingTrip ? (
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDashboard(!showDashboard)}
            >
              {showDashboard ? hideDashboardText : showDashboardText}
            </Button>
            <Button
              onClick={() => setIsAddingTrip(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              {addNewTripText}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAddingTrip(false)}
          >
            {cancelText}
          </Button>
        )
      }
    >
      {isAddingTrip ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-500" />
              {newTripSheetText}
            </h2>
            
            <Button
              variant="outline"
              onClick={() => setIsAddingTrip(false)}
            >
              {cancelText}
            </Button>
          </div>
          
          <TripForm 
            onSubmit={handleAddTrip} 
            isSubmitting={isSubmitting}
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
          />
        </div>
      )}
    </Layout>
  );
};

export default TripsPage;