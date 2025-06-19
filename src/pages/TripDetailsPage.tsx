import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TripDetails from '../components/trips/TripDetails';
import TripForm from '../components/trips/TripForm';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '../types';
import { getTrip, getVehicle, getDriver, getDestination, updateTrip, deleteTrip, getWarehouse } from '../utils/storage';
import TripMap from '../components/maps/TripMap';
import { MapPin, X } from 'lucide-react';
import Button from '../components/ui/Button';

const TripDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | undefined>(undefined);
  const [driver, setDriver] = useState<Driver | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Load trip data
  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const tripData = await getTrip(id);
          if (tripData) {
            setTrip(tripData);
            
            // Load related vehicle and driver
            const [vehicleData, driverData] = await Promise.all([
              getVehicle(tripData.vehicle_id),
              getDriver(tripData.driver_id)
            ]);
            
            setVehicle(vehicleData || undefined);
            setDriver(driverData || undefined);
            
            // Load warehouse and destinations for map
            if (tripData.warehouse_id) {
              const warehouseData = await getWarehouse(tripData.warehouse_id);
              setWarehouse(warehouseData);
            }
            
            if (Array.isArray(tripData.destinations) && tripData.destinations.length > 0) {
              const destinationPromises = tripData.destinations.map(destId => getDestination(destId));
              const destinationResults = await Promise.all(destinationPromises);
              const validDestinations = destinationResults.filter((d): d is Destination => d !== null);
              setDestinations(validDestinations);
            }
          } else {
            // Trip not found, redirect back to trips page
            navigate('/trips');
          }
        } catch (error) {
          console.error('Error loading trip details:', error);
        } finally {
          setLoading(false);
        }
      }
      
      fetchData();
    }
  }, [id, navigate]);
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleBack = () => {
    navigate('/trips');
  };
  
  const handleDelete = () => {
    if (trip && window.confirm('Are you sure you want to delete this trip?')) {
      try {
        deleteTrip(trip.id);
        navigate('/trips');
      } catch (error) {
        console.error('Error deleting trip:', error);
      }
    }
  };
  
  const handleUpdate = async (data: TripFormData) => {
    if (!trip) return;
    
    // Extract destination IDs from the destination objects
    const destinationIds = data.destinations;
    
    setIsSubmitting(true);
    
    try {
      // Handle file upload (in a real app, this would upload to a server)
      let fuel_bill_url = trip.fuel_bill_url;
      if (data.fuel_bill_file) {
        // Create a fake URL for demo purposes
        fuel_bill_url = URL.createObjectURL(data.fuel_bill_file);
      }
      
      // Update trip without the file object (replaced with URL)
      const { fuel_bill_file, ...tripData } = data;

      const updatedTrip = await updateTrip(trip.id, {
        ...tripData,
        fuel_bill_url,
        // Preserve original trip ID and serial number
        trip_serial_number: trip.trip_serial_number,
        id: trip.id
      });
      
      if (updatedTrip) {
        setTrip(updatedTrip);
        
        // Update related vehicle and driver if they changed
        if (updatedTrip.vehicle_id !== trip.vehicle_id) {
          const updatedVehicle = await getVehicle(updatedTrip.vehicle_id);
          setVehicle(updatedVehicle);
        }
        
        if (updatedTrip.driver_id !== trip.driver_id) {
          const updatedDriver = await getDriver(updatedTrip.driver_id);
          setDriver(updatedDriver);
        }
        
        // Update warehouse and destinations if they changed
        if (updatedTrip.warehouse_id !== trip.warehouse_id) {
          const updatedWarehouse = await getWarehouse(updatedTrip.warehouse_id);
          setWarehouse(updatedWarehouse);
        }
        
        if (JSON.stringify(updatedTrip.destinations) !== JSON.stringify(trip.destinations)) {
          const destinationPromises = updatedTrip.destinations.map(destId => getDestination(destId));
          const destinationResults = await Promise.all(destinationPromises);
          const validDestinations = destinationResults.filter((d): d is Destination => d !== null);
          setDestinations(validDestinations);
        }
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating trip:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout title="Trip Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">The requested trip could not be found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/trips')}
          >
            Back to Trips
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout
      title={`Trip ${trip.trip_serial_number}`}
      subtitle={`Created on ${new Date(trip.created_at).toLocaleDateString()}`}
    >
      {isEditing ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Trip</h2>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
          
          <TripForm
            initialData={{
              vehicle_id: trip.vehicle_id,
              driver_id: trip.driver_id,
              warehouse_id: trip.warehouse_id,
              destinations: trip.destinations,
              trip_start_date: trip.trip_start_date,
              trip_end_date: trip.trip_end_date,
              start_km: trip.start_km,
              end_km: trip.end_km,
              gross_weight: trip.gross_weight,
              station: trip.station,
              refueling_done: trip.refueling_done,
              fuel_quantity: trip.fuel_quantity,
              fuel_cost: trip.fuel_cost,
              unloading_expense: trip.unloading_expense,
              driver_expense: trip.driver_expense,
              road_rto_expense: trip.road_rto_expense,
              is_return_trip: trip.is_return_trip,
              remarks: trip.remarks,
              trip_serial_number: trip.trip_serial_number, // Pass the original serial number
              estimated_toll_cost: trip.estimated_toll_cost
            }}
            onSubmit={handleUpdate}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        <>
          <TripDetails
            trip={trip}
            vehicle={vehicle}
            driver={driver}
            onBack={handleBack}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          
          {/* Route Overview Section */}
          {warehouse && destinations.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                <MapPin className="h-5 w-5 mr-2 text-primary-500" />
                Route Overview
              </h3>
              
              <TripMap
                warehouse={warehouse}
                destinations={destinations}
                className="h-[300px] rounded-lg overflow-hidden"
              />
              
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMapModal(true)}
                >
                  Expand Full Map
                </Button>
              </div>
            </div>
          )}
          
          {/* Full Map Modal */}
          {showMapModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Route Map</h3>
                  <button
                    onClick={() => setShowMapModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <TripMap
                    warehouse={warehouse}
                    destinations={destinations}
                    className="h-[70vh] rounded-lg overflow-hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default TripDetailsPage;