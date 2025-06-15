import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getDrivers, getTrips, createDriver, updateDriver, uploadDriverPhoto } from '../utils/storage';
import { User, Truck, MapPin, PlusCircle, Edit2 } from 'lucide-react';
import Button from '../components/ui/Button';
import DriverForm from '../components/drivers/DriverForm';
import { Driver, Trip } from '../types';
import { toast } from 'react-toastify';

const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
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
        toast.error('Failed to load drivers');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveDriver = async (data: Omit<Driver, 'id'>) => {
    setIsSubmitting(true);
    try {
      let photoUrl = editingDriver?.driver_photo_url;
      
      // Handle photo upload if a new photo is provided
      if (data.photo && data.photo instanceof File) {
        try {
          // For new drivers, we'll use a temporary ID until we get the real one
          const tempId = editingDriver?.id || `temp-${Date.now()}`;
          photoUrl = await uploadDriverPhoto(data.photo, tempId);
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error('Failed to upload photo, but continuing with driver save');
        }
      }
      
      // Prepare driver data with photo URL
      const driverData = {
        ...data,
        driver_photo_url: photoUrl
      };
      
      // Remove the File object as it can't be stored in the database
      delete driverData.photo;
      
      if (editingDriver) {
        // Update existing driver
        const updatedDriver = await updateDriver(editingDriver.id, driverData);
        if (updatedDriver) {
          // Map experience_years back to experience for frontend consistency
          const mappedDriver = {
            ...updatedDriver,
            experience: updatedDriver.experience_years || updatedDriver.experience
          };
          
          // Update the drivers list
          setDrivers(prevDrivers => 
            prevDrivers.map(d => d.id === mappedDriver.id ? mappedDriver : d)
          );
          setEditingDriver(null);
          toast.success('Driver updated successfully');
        } else {
          toast.error('Failed to update driver');
        }
      } else {
        // Create new driver
        const newDriver = await createDriver(driverData);
        if (newDriver) {
          // If we used a temporary ID for the photo, we need to update it
          if (photoUrl && photoUrl.includes('temp-')) {
            try {
              // Re-upload with the correct ID
              const finalPhotoUrl = await uploadDriverPhoto(data.photo as File, newDriver.id);
              await updateDriver(newDriver.id, { driver_photo_url: finalPhotoUrl });
              newDriver.driver_photo_url = finalPhotoUrl;
            } catch (error) {
              console.error('Error updating photo with final ID:', error);
            }
          }
          
          // Map experience_years back to experience for frontend consistency
          const mappedDriver = {
            ...newDriver,
            experience: newDriver.experience_years || newDriver.experience
          };
          
          setDrivers(prevDrivers => [mappedDriver, ...prevDrivers]);
          setIsAddingDriver(false);
          toast.success('Driver added successfully');
        } else {
          toast.error('Failed to add driver');
        }
      }
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error(`Failed to ${editingDriver ? 'update' : 'add'} driver`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDriver = (driver: Driver) => {
    // Map experience_years to experience for form compatibility
    const mappedDriver = {
      ...driver,
      experience: driver.experience_years || driver.experience
    };
    setEditingDriver(mappedDriver);
    setIsAddingDriver(false); // Ensure we're in edit mode, not add mode
  };

  const handleCancelForm = () => {
    setIsAddingDriver(false);
    setEditingDriver(null);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return '-';
    }
  };

  // Check if license is expired or expiring soon
  const getLicenseStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: 'unknown', label: 'Unknown' };
    
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      if (expiry < now) {
        return { status: 'expired', label: 'Expired' };
      } else if (expiry < thirtyDaysFromNow) {
        return { status: 'expiring', label: 'Expiring Soon' };
      } else {
        return { status: 'valid', label: 'Valid' };
      }
    } catch (error) {
      return { status: 'unknown', label: 'Unknown' };
    }
  };

  return (
    <Layout
      title="Drivers"
      subtitle="Manage your fleet drivers"
      actions={
        !isAddingDriver && !editingDriver && (
          <Button
            onClick={() => setIsAddingDriver(true)}
            icon={<PlusCircle className="h-4 w-4" />}
          >
            Add Driver
          </Button>
        )
      }
    >
      {isAddingDriver || editingDriver ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary-500" />
              {editingDriver ? 'Edit Driver' : 'New Driver'}
            </h2>
            
            <Button
              variant="outline"
              onClick={handleCancelForm}
            >
              Cancel
            </Button>
          </div>
          
          <DriverForm 
            initialData={editingDriver || undefined}
            onSubmit={handleSaveDriver}
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
              const licenseStatus = getLicenseStatus(driver.license_expiry_date);
              
              // Use experience_years if available, fallback to experience
              const experience = driver.experience_years || driver.experience || 0;

              return (
                <div
                  key={driver.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow relative"
                >
                  {/* Edit Button */}
                  <button
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDriver(driver);
                    }}
                    title="Edit Driver"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  
                  <div className="flex items-start space-x-4 mb-4">
                    {/* Driver Photo */}
                    <div className="flex-shrink-0">
                      {driver.driver_photo_url ? (
                        <img 
                          src={driver.driver_photo_url} 
                          alt={driver.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{driver.name}</h3>
                      <p className="text-sm text-gray-500">
                        {driver.license_number || 'License: Not available'}
                      </p>
                      
                      {/* License Status Badge */}
                      {driver.license_expiry_date && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            licenseStatus.status === 'expired' 
                              ? 'bg-error-100 text-error-800'
                              : licenseStatus.status === 'expiring' 
                              ? 'bg-warning-100 text-warning-800'
                              : 'bg-success-100 text-success-800'
                          }`}>
                            {licenseStatus.label} {driver.license_expiry_date && `(${formatDate(driver.license_expiry_date)})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500 block">Experience</span>
                      <p className="font-medium">{experience} years</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Join Date</span>
                      <p className="font-medium">{formatDate(driver.join_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Contact</span>
                      <p className="font-medium">{driver.contact_number}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Email</span>
                      <p className="font-medium truncate">{driver.email || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <User className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500 block">Trips</span>
                        <p className="font-medium">{driverTrips.length}</p>
                      </div>
                      <div className="text-center">
                        <MapPin className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500 block">Distance</span>
                        <p className="font-medium">{totalDistance.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <Truck className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500 block">Vehicle</span>
                        <p className="font-medium">{driver.primary_vehicle_id ? 'Assigned' : '-'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* View Details Link */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => navigate(`/drivers/${driver.id}`)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </Layout>
  );
};

export default DriversPage;