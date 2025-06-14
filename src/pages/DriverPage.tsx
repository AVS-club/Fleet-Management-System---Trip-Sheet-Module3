import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getDriver, getVehicle, getTrips, updateDriver, getDriverStats } from '../utils/storage';
import { User, Calendar, Truck, ChevronLeft, MapPin, Star, AlertTriangle, FileText, Shield, Edit2, Phone, Mail, Clock, Download, Car as IdCard, Award } from 'lucide-react';
import Button from '../components/ui/Button';
import DriverMetrics from '../components/drivers/DriverMetrics';
import { getAIAlerts } from '../utils/aiAnalytics';
import { Driver, Trip, Vehicle, AIAlert } from '../types';
import { format, differenceInDays, isBefore } from 'date-fns';
import DriverForm from '../components/drivers/DriverForm';
import { toast } from 'react-toastify';

const DriverPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [driverStats, setDriverStats] = useState<{
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
    lastTripDate?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Fetch driver data
        const driverData = await getDriver(id);
        setDriver(driverData);
        
        // Fetch primary vehicle if available
        if (driverData?.primary_vehicle_id) {
          const vehicleData = await getVehicle(driverData.primary_vehicle_id);
          setPrimaryVehicle(vehicleData);
        }
        
        // Fetch trips
        const tripsData = await getTrips();
        const driverTrips = Array.isArray(tripsData) ? tripsData.filter(trip => trip.driver_id === id) : [];
        setTrips(driverTrips);
        
        // Fetch driver stats
        const stats = await getDriverStats(id);
        setDriverStats(stats);
        
        // Fetch alerts
        const alertsData = await getAIAlerts();
        setAlerts(
          Array.isArray(alertsData) 
            ? alertsData.filter(alert => 
                alert.affected_entity?.type === 'driver' && 
                alert.affected_entity?.id === id &&
                alert.status === 'pending'
              )
            : []
        );
      } catch (error) {
        console.error('Error fetching driver data:', error);
        toast.error('Failed to load driver data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const handleUpdateDriver = async (updatedData: Omit<Driver, 'id'>, documents: any) => {
    if (!driver || !id) return;
    
    setIsSubmitting(true);
    try {
      const updatedDriver = await updateDriver(id, updatedData, documents);
      
      if (updatedDriver) {
        setDriver(updatedDriver);
        
        // Update primary vehicle if changed
        if (updatedDriver.primary_vehicle_id !== driver.primary_vehicle_id) {
          if (updatedDriver.primary_vehicle_id) {
            const newVehicle = await getVehicle(updatedDriver.primary_vehicle_id);
            setPrimaryVehicle(newVehicle);
          } else {
            setPrimaryVehicle(null);
          }
        }
        
        setIsEditing(false);
        toast.success('Driver updated successfully');
      } else {
        toast.error('Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Error updating driver');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!driver && !loading) {
    return (
      <Layout title="Driver Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">The requested driver could not be found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/drivers')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Drivers
          </Button>
        </div>
      </Layout>
    );
  }
  
  if (isEditing && driver) {
    return (
      <Layout
        title="Edit Driver"
        subtitle={`ID: ${driver.license_number}`}
        actions={
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Cancel
          </Button>
        }
      >
        <div className="bg-white rounded-lg shadow-sm p-6">
          <DriverForm
            initialData={driver}
            onSubmit={handleUpdateDriver}
            isSubmitting={isSubmitting}
          />
        </div>
      </Layout>
    );
  }

  const hasExpiredLicense = driver?.license_expiry_date && isBefore(new Date(driver.license_expiry_date), new Date());
  const licenseExpiringIn30Days = driver?.license_expiry_date && 
    !hasExpiredLicense &&
    differenceInDays(new Date(driver.license_expiry_date), new Date()) <= 30;

  return (
    <Layout
      title={`Driver: ${driver?.name}`}
      subtitle={`License: ${driver?.license_number}`}
      actions={
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/drivers')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Drivers
          </Button>
          <Button
            onClick={() => setIsEditing(true)}
            icon={<Edit2 className="h-4 w-4" />}
          >
            Edit Driver
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">Loading driver data...</p>
        </div>
      ) : driver && (
        <div className="space-y-6">
        {/* AI Alerts */}
        {Array.isArray(alerts) && alerts.length > 0 && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
              <h3 className="text-warning-700 font-medium">Active Alerts</h3>
            </div>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-white p-3 rounded-md border border-warning-200">
                  <p className="font-medium text-warning-800">{alert.title}</p>
                  <p className="text-sm text-warning-600 mt-1">{alert.description}</p>
                  {alert.metadata?.recommendations && (
                    <ul className="mt-2 text-sm text-warning-700 list-disc list-inside">
                      {alert.metadata.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* License Status Warning */}
        {(hasExpiredLicense || licenseExpiringIn30Days) && (
          <div className={`p-4 rounded-lg ${
            hasExpiredLicense ? 'bg-error-50 border-error-200' : 'bg-warning-50 border-warning-200'
          } border`}>
            <div className="flex items-center">
              <AlertTriangle className={`h-5 w-5 mr-2 ${
                hasExpiredLicense ? 'text-error-500' : 'text-warning-500'
              }`} />
              <div>
                <h4 className={`font-medium ${
                  hasExpiredLicense ? 'text-error-700' : 'text-warning-700'
                }`}>
                  {hasExpiredLicense ? 'License Expired' : 'License Expiring Soon'}
                </h4>
                <p className={`text-sm mt-1 ${
                  hasExpiredLicense ? 'text-error-600' : 'text-warning-600'
                }`}>
                  {hasExpiredLicense
                    ? 'Driver\'s license has expired. Please renew immediately.'
                    : `Driver's license will expire in ${differenceInDays(new Date(driver.license_expiry_date || ''), new Date())} days. Please plan for renewal.`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Driver Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Driver Details</h3>
                <p className="text-sm text-gray-500">Personal Information</p>
              </div>
              <User className="h-8 w-8 text-primary-500" />
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <div className="flex items-center">
                  <User className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="font-medium">{driver.name}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">License Number:</span>
                <div className="flex items-center">
                  <IdCard className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="font-medium">{driver.license_number}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contact:</span>
                <div className="flex items-center">
                  <Phone className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="font-medium">{driver.contact_number}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <div className="flex items-center">
                  <Mail className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="font-medium">{driver.email || '-'}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Join Date:</span>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="font-medium">{format(new Date(driver.join_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Experience:</span>
                <div className="flex items-center">
                  <Award className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="font-medium">{driver.experience_years} years</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  driver.status === 'active' 
                    ? 'bg-success-100 text-success-800'
                    : driver.status === 'onLeave'
                    ? 'bg-warning-100 text-warning-800'
                    : driver.status === 'suspended' || driver.status === 'blacklisted'
                    ? 'bg-error-100 text-error-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {driver.status.replace('_', ' ')}
                </span>
              </div>
              {driver.driver_status_reason && (
                <div>
                  <span className="text-sm text-gray-500">Status Reason:</span>
                  <p className="text-sm text-error-600">{driver.driver_status_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Document Status</h3>
                <p className="text-sm text-gray-500">License Information</p>
              </div>
              <Shield className="h-8 w-8 text-primary-500" />
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">License Status:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    hasExpiredLicense
                      ? 'bg-error-100 text-error-700'
                      : licenseExpiringIn30Days
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-success-100 text-success-700'
                  }`}>
                    {hasExpiredLicense
                      ? 'Expired'
                      : licenseExpiringIn30Days
                      ? 'Expiring Soon'
                      : 'Valid'}
                  </span>
                </div>
                {driver.license_expiry_date && (
                  <p className="text-sm mt-1">
                    Expires: {format(new Date(driver.license_expiry_date), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>

              {driver.documents_verified !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Documents Verified:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    driver.documents_verified
                      ? 'bg-success-100 text-success-700'
                      : 'bg-warning-100 text-warning-700'
                  }`}>
                    {driver.documents_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900">Available Documents</h4>
                <div className="mt-2 space-y-2">
                  {driver.driver_photo_url && (
                    <a 
                      href={driver.driver_photo_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">Driver Photo</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-500" />
                    </a>
                  )}
                  
                  {driver.license_doc_url && (
                    <a 
                      href={driver.license_doc_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">License Document</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-500" />
                    </a>
                  )}
                  
                  {driver.aadhar_doc_url && (
                    <a 
                      href={driver.aadhar_doc_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <IdCard className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">Aadhar Card</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-500" />
                    </a>
                  )}
                  
                  {driver.police_doc_url && (
                    <a 
                      href={driver.police_doc_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">Police Verification</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-500" />
                    </a>
                  )}
                  
                  {driver.bank_doc_url && (
                    <a 
                      href={driver.bank_doc_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">Bank Document</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-500" />
                    </a>
                  )}
                  
                  {!driver.driver_photo_url && 
                   !driver.license_doc_url && 
                   !driver.aadhar_doc_url && 
                   !driver.police_doc_url && 
                   !driver.bank_doc_url && (
                    <div className="p-3 text-center text-gray-500 bg-gray-50 rounded">
                      No documents uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Primary Vehicle */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Assigned Vehicle</h3>
                <p className="text-sm text-gray-500">Vehicle Details</p>
              </div>
              <Truck className="h-8 w-8 text-primary-500" />
            </div>
            {primaryVehicle ? (
              <div className="mt-4 space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Registration:</span>
                  <p 
                    className="font-medium text-primary-600 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/vehicles/${primaryVehicle.id}`);
                    }}
                  >
                    {primaryVehicle.registration_number}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Make & Model:</span>
                  <p className="font-medium">{primaryVehicle.make} {primaryVehicle.model}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Type:</span>
                  <p className="font-medium capitalize">{primaryVehicle.type}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    primaryVehicle.status === 'active' 
                      ? 'bg-success-100 text-success-800'
                      : primaryVehicle.status === 'maintenance'
                      ? 'bg-warning-100 text-warning-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {primaryVehicle.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center h-32 bg-gray-50 rounded-lg border border-gray-200">
                <Truck className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-gray-500">No vehicle assigned</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Activity Summary</h3>
              <p className="text-sm text-gray-500">Driver performance metrics</p>
            </div>
            <Star className="h-6 w-6 text-primary-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Total Trips</span>
                <span className="text-xl font-semibold text-gray-900">
                  {driverStats?.totalTrips || 0}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Total Distance</span>
                <span className="text-xl font-semibold text-gray-900">
                  {driverStats?.totalDistance.toLocaleString() || 0} km
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Average Mileage</span>
                <span className="text-xl font-semibold text-gray-900">
                  {driverStats?.averageKmpl ? `${driverStats.averageKmpl.toFixed(2)} km/L` : '-'}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Last Trip</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-xl font-semibold text-gray-900">
                    {driverStats?.lastTripDate 
                      ? format(new Date(driverStats.lastTripDate), 'dd/MM/yyyy')
                      : 'No trips'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => navigate('/trips', { state: { filterDriver: driver.id }})}
              size="sm"
            >
              View All Trips
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        {driver && <DriverMetrics driver={driver} trips={trips} />}
      </div>
      )}
    </Layout>
  );
};

export default DriverPage;