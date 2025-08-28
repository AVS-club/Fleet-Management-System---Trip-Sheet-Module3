import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Layout from '../components/layout/Layout';
import TripDetails from '../components/trips/TripDetails';
import TripForm from '../components/trips/TripForm';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '../types';
import { getTrip, getVehicle, getDriver, getDestination, updateTrip, deleteTrip, getWarehouse, getTrips, getVehicles, getDrivers, getDestinations, getWarehouses } from '../utils/storage';
import { getDestinationByAnyId } from '../utils/storage';
import { getMaterialTypes, MaterialType } from '../utils/materialTypes';
import { getAIAlerts, AIAlert } from '../utils/aiAnalytics';
import TripMap from '../components/maps/TripMap';
import { MapPin, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { uploadFilesAndGetPublicUrls } from '../utils/supabaseStorage';

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
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [aiAlerts, setAiAlerts] = useState<AIAlert[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([]);
  const [allMaterialTypes, setAllMaterialTypes] = useState<MaterialType[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  
  // Load trip data
  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const tripData = await getTrip(id);
          if (tripData) {
            // Get current user for RLS queries
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              console.error('No authenticated user found');
              navigate('/login');
              return;
            }
            
            setTrip(tripData);
            
            // Load related data and all lookup data needed for editing
            const [
              vehicleData, 
              driverData, 
              materialTypesData, 
              aiAlertsData, 
              tripsData,
              allVehiclesData,
              allDriversData,
              allDestinationsData,
              allWarehousesData
            ] = await Promise.all([
              getVehicle(tripData.vehicle_id),
              getDriver(tripData.driver_id),
              getMaterialTypes(),
              getAIAlerts(),
              getTrips(),
              getVehicles(),
              getDrivers(),
              getDestinations(),
              getWarehouses()
            ]);
            
            setVehicle(vehicleData || undefined);
            setDriver(driverData || undefined);
            setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
            setAllVehicles(Array.isArray(allVehiclesData) ? allVehiclesData : []);
            setAllDrivers(Array.isArray(allDriversData) ? allDriversData : []);
            setAllDestinations(Array.isArray(allDestinationsData) ? allDestinationsData : []);
            setAllWarehouses(Array.isArray(allWarehousesData) ? allWarehousesData : []);
            setAllMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
            
            // Filter AI alerts for this specific trip
            const tripAlerts = Array.isArray(aiAlertsData) 
              ? aiAlertsData.filter(alert => 
                  alert.metadata?.trip_id === tripData.id ||
                  (alert.affected_entity?.type === 'vehicle' && alert.affected_entity?.id === tripData.vehicle_id)
                )
              : [];
            setAiAlerts(tripAlerts);
            setTrips(Array.isArray(tripsData) ? tripsData : []);
            
            // Load warehouse and destinations for map
            if (tripData.warehouse_id) {
              const warehouseData = await getWarehouse(tripData.warehouse_id);
              setWarehouse(warehouseData);
            }
            
            if (Array.isArray(tripData.destinations) && tripData.destinations.length > 0) {
              try {
                // Query destinations table using place_id field for Google Place IDs, include place_name
                const { data: destinationData, error: destError } = await supabase
                  .from('destinations')
                  .select('id, name, place_name, latitude, longitude, type, state, active, place_id, formatted_address')
                  .in('place_id', tripData.destinations)
                  .eq('created_by', user.id);

                if (!destError && destinationData) {
                  setDestinations(destinationData);
                } else {
                  // Fallback: try querying by UUID in case destinations are stored as UUIDs
                  const destinationPromises = tripData.destinations.map(destId => getDestinationByAnyId(destId));
                  const destinationResults = await Promise.all(destinationPromises);
                  const validDestinations = destinationResults.filter((d): d is Destination => d !== null);
                  setDestinations(validDestinations);
                }
              } catch (error) {
                console.error('Error fetching destinations:', error);
                setDestinations([]);
              }
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
    
    setIsSubmitting(true);
    
    try {
      // Handle file upload using Supabase storage
      let fuel_bill_url = trip.fuel_bill_url;
      if (data.fuel_bill_file) {
        // Upload files to Supabase storage and get public URLs
        const fileArray = Array.isArray(data.fuel_bill_file) ? data.fuel_bill_file : [data.fuel_bill_file];
        const uploadedUrls = await uploadFilesAndGetPublicUrls(fileArray, 'fuel_bills');
        fuel_bill_url = uploadedUrls.length > 0 ? uploadedUrls[0] : trip.fuel_bill_url;
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
      subtitle={`Created on ${new Date(trip.created_at || '').toLocaleDateString()}`}
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
              refueling_done: trip.refueling_done,
              fuel_quantity: trip.fuel_quantity,
              fuel_cost: trip.fuel_cost,
              total_fuel_cost: trip.total_fuel_cost,
              fuel_rate_per_liter: trip.fuel_rate_per_liter,
              unloading_expense: trip.unloading_expense,
              driver_expense: trip.driver_expense,
              road_rto_expense: trip.road_rto_expense,
              breakdown_expense: trip.breakdown_expense,
              miscellaneous_expense: trip.miscellaneous_expense,
              total_road_expenses: trip.total_road_expenses,
              is_return_trip: trip.is_return_trip,
              remarks: trip.remarks,
              material_type_ids: trip.material_type_ids,
              trip_serial_number: trip.trip_serial_number,
              station: trip.station
            }}
            allVehicles={allVehicles}
            allDrivers={allDrivers}
            allDestinations={allDestinations}
            allWarehouses={allWarehouses}
            allMaterialTypes={allMaterialTypes}
            onSubmit={handleUpdate}
            isSubmitting={isSubmitting}
            trips={trips}
          />
        </div>
      ) : (
        <>
          <TripDetails
            trip={trip}
            vehicle={vehicle}
            driver={driver}
            warehouse={warehouse}
            destinations={destinations}
            materialTypes={materialTypes}
            aiAlerts={aiAlerts}
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