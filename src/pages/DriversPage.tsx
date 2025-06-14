import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getDrivers, getTrips, createDriver, getVehicle, getDriverStats } from '../utils/storage';
import { User, Truck, MapPin, PlusCircle, Phone, Mail, IdCard, Calendar, Edit2, FileText, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import DriverForm from '../components/drivers/DriverForm';
import { Driver, Trip, Vehicle } from '../types';
import { format, isBefore, differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';

interface DriverWithStats extends Driver {
  stats: {
    totalTrips: number;
    totalDistance: number;
    lastTripDate?: string;
    averageMileage?: number;
  };
  assignedVehicle?: {
    id: string;
    registrationNumber: string;
  };
}

const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverWithStats[]>([]);
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
        
        // Fetch stats for each driver
        const driversWithStatsPromises = Array.isArray(driversData) ? driversData.map(async (driver) => {
          // Get driver stats
          const stats = await getDriverStats(driver.id);
          
          // Get assigned vehicle if any
          let assignedVehicle;
          if (driver.primary_vehicle_id) {
            const vehicle = await getVehicle(driver.primary_vehicle_id);
            if (vehicle) {
              assignedVehicle = {
                id: vehicle.id,
                registrationNumber: vehicle.registration_number
              };
            }
          }
          
          return {
            ...driver,
            stats: stats || { 
              totalTrips: 0, 
              totalDistance: 0 
            },
            assignedVehicle
          };
        }) : [];
        
        const driversWithStats = await Promise.all(driversWithStatsPromises);
        setDrivers(driversWithStats);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
      } catch (error) {
        console.error('Error fetching drivers data:', error);
        toast.error('Failed to load drivers data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddDriver = async (driverData: Omit<Driver, 'id'>, documents: any) => {
    setIsSubmitting(true);
    try {
      const newDriver = await createDriver(driverData, documents);
      
      if (newDriver) {
        // Add new driver to state with default stats
        const driverWithStats: DriverWithStats = {
          ...newDriver,
          stats: {
            totalTrips: 0,
            totalDistance: 0
          }
        };
        
        // If a vehicle was assigned, fetch it
        if (newDriver.primary_vehicle_id) {
          const vehicle = await getVehicle(newDriver.primary_vehicle_id);
          if (vehicle) {
            driverWithStats.assignedVehicle = {
              id: vehicle.id,
              registrationNumber: vehicle.registration_number
            };
          }
        }
        
        setDrivers(prev => [driverWithStats, ...prev]);
        setIsAddingDriver(false);
        toast.success('Driver added successfully');
      } else {
        toast.error('Failed to add driver');
      }
    } catch (error) {
      console.error('Error adding driver:', error);
      toast.error('Error adding driver');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to check if license is expired
  const isLicenseExpired = (expiryDate: string | undefined) => {
    if (!expiryDate) return false;
    return isBefore(new Date(expiryDate), new Date());
  };
  
  // Helper function to check if license is expiring soon
  const isLicenseExpiringSoon = (expiryDate: string | undefined) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
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
          {drivers.map((driver: DriverWithStats) => {
            const licenseExpired = isLicenseExpired(driver.license_expiry_date);
            const licenseExpiringSoon = isLicenseExpiringSoon(driver.license_expiry_date);
            
            return (
              <div
                key={driver.id}
                className="bg-white rounded-lg shadow-sm p-6 relative cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/drivers/${driver.id}`)}
              >
                {/* Edit button (shows on hover) */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/drivers/${driver.id}`);
                    }}
                  >
                    Edit
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{driver.name}</h3>
                    <div className="flex items-center space-x-2">
                      <IdCard className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-500">{driver.license_number}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      driver.status === 'active'
                        ? 'bg-success-100 text-success-800'
                        : driver.status === 'onLeave'
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {driver.status.replace('_', ' ')}
                    </span>
                    
                    {licenseExpired && (
                      <span className="mt-2 px-2 py-1 text-xs font-medium rounded-full bg-error-100 text-error-800 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        License Expired
                      </span>
                    )}
                    
                    {!licenseExpired && licenseExpiringSoon && (
                      <span className="mt-2 px-2 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-800 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        License Expiring Soon
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Experience</span>
                    <p className="font-medium">{driver.experience_years} years</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Join Date</span>
                    <p className="font-medium">{format(new Date(driver.join_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Contact</span>
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 text-gray-400 mr-1" />
                      <p className="font-medium">{driver.contact_number}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email</span>
                    <div className="flex items-center">
                      <Mail className="h-3 w-3 text-gray-400 mr-1" />
                      <p className="font-medium">{driver.email || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <User className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Trips</span>
                      <p className="font-medium">{driver.stats.totalTrips}</p>
                    </div>
                    <div className="text-center">
                      <MapPin className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Distance</span>
                      <p className="font-medium">{driver.stats.totalDistance.toLocaleString()} km</p>
                    </div>
                    <div className="text-center">
                      <Truck className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Vehicle</span>
                      <p className="font-medium">{driver.assignedVehicle ? driver.assignedVehicle.registrationNumber : '-'}</p>
                    </div>
                  </div>
                </div>
                
                {driver.driver_photo_url && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-500 opacity-50"></div>
                )}
                
                {driver.license_doc_url && (
                  <div className="absolute top-0 left-6 -mt-1">
                    <FileText className="h-4 w-4 text-primary-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>)
      )}
    </Layout>
  );
};

export default DriversPage;