import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getDrivers, getTrips, createDriver } from '../utils/storage'; // Removed getVehicle as it's not used
import { User, Truck, MapPin, PlusCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import DriverForm from '../components/drivers/DriverForm';
import { Driver, Trip } from '../types'; // Added import for Driver and Trip types

const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [driversData, tripsData] = await Promise.all([
          getDrivers(),
          getTrips()
        ]);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
      } catch (error) {
        console.error('Error fetching drivers data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddDriver = async (data: Omit<Driver, 'id'>) => {
    setIsSubmitting(true);
    try {
      // Handle file uploads here in a real app (e.g., to Supabase Storage)
      // For 'photo' and 'licenseDocument', if they are File objects,
      // they would need to be uploaded and their URLs stored in the 'data' object
      // before calling createDriver.
      // This example assumes 'photo' and 'licenseDocument' in 'data' are already URLs or string paths.

      const newDriver = await createDriver(data);
      if (newDriver) {
        // Add the new driver to the local state for immediate UI update
        setDrivers((prevDrivers: Driver[]) => [newDriver, ...prevDrivers]);
        setIsAddingDriver(false);
        // Optionally, show a success message
        navigate(`/drivers/${newDriver.id}`); // Navigate to the new driver's detail page
      } else {
        // Handle case where driver creation failed (e.g., show an error message to the user)
        console.error('Failed to create driver: createDriver returned null or undefined.');
        // alert('Failed to add driver. Please try again.'); // Example user feedback
      }
    } catch (error) {
      console.error('Error adding driver:', error);
      // alert(`An error occurred: ${error.message}`); // Example user feedback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout
      title="Drivers"
      subtitle="Manage your fleet drivers"
      actions={
        !isAddingDriver && (
          <Button
            onClick={() => setIsAddingDriver(true)}
            icon={<PlusCircle className="h-4 w-4" />}
          >
            Add Driver
          </Button>
        )
      }
    >
      {isAddingDriver ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary-500" />
              New Driver
            </h2>
            
            <Button
              variant="outline"
              onClick={() => setIsAddingDriver(false)}
            >
              Cancel
            </Button>
          </div>
          
          <DriverForm 
            onSubmit={handleAddDriver}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3 text-gray-600">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No drivers found. Add your first driver to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver: Driver) => {
            const driverTrips = Array.isArray(trips) ? trips.filter(trip => trip.driver_id === driver.id) : [];
            const totalDistance = driverTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
            // Note: This would need to be async in a real app

            return (
              <div
                key={driver.id}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/drivers/${driver.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{driver.name}</h3>
                    <p className="text-sm text-gray-500">{driver.license_number}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    driver.status === 'active'
                      ? 'bg-success-100 text-success-800'
                      : driver.status === 'onLeave'
                      ? 'bg-warning-100 text-warning-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {driver.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Experience</span>
                    <p className="font-medium">{driver.experience} years</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Join Date</span>
                    <p className="font-medium">{new Date(driver.join_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Contact</span>
                    <p className="font-medium">{driver.contact_number}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email</span>
                    <p className="font-medium">{driver.email || '-'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <User className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Trips</span>
                      <p className="font-medium">{driverTrips.length}</p>
                    </div>
                    <div className="text-center">
                      <MapPin className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Distance</span>
                      <p className="font-medium">{totalDistance.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <Truck className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Vehicle</span>
                      <p className="font-medium">{'-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Layout>
  );
};

export default DriversPage;
