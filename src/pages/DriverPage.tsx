import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getDriver, getVehicle, getTrips } from '../utils/storage';
import { User, Calendar, Truck, ChevronLeft, MapPin, Star, AlertTriangle, FileText, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import DriverMetrics from '../components/drivers/DriverMetrics';
import { getAIAlerts } from '../utils/aiAnalytics';

const DriverPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
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
        setTrips(Array.isArray(tripsData) ? tripsData.filter(trip => trip.driver_id === id) : []);
        
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (!driver) {
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

  const hasExpiredLicense = driver.license_expiry_date && new Date(driver.license_expiry_date) < new Date();
  const licenseExpiringIn30Days = driver.license_expiry_date && 
    (new Date(driver.license_expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30;

  return (
    <Layout
      title={`Driver: ${driver.name}`}
      subtitle={`License: ${driver.licenseNumber}`}
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/drivers')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Drivers
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">Loading driver data...</p>
        </div>
      ) : (
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
                    : 'Driver\'s license will expire in less than 30 days. Please plan for renewal.'}
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
                <p className="font-medium">{driver.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">License Number:</span>
                <p className="font-medium">{driver.license_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contact:</span>
                <p className="font-medium">{driver.contact_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <p className="font-medium">{driver.email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Join Date:</span>
                <p className="font-medium">{new Date(driver.joinDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Experience:</span>
                <p className="font-medium">{driver.experience} years</p>
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
              {driver.driverStatusReason && (
                <div>
                  <span className="text-sm text-gray-500">Status Reason:</span>
                  <p className="text-sm text-error-600">{driver.driverStatusReason}</p>
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
                    Expires: {new Date(driver.licenseExpiryDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {driver.documentsVerified !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Documents Verified:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    driver.documentsVerified
                      ? 'bg-success-100 text-success-700'
                      : 'bg-warning-100 text-warning-700'
                  }`}>
                    {driver.documentsVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              )}

              {driver.license_document && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">License Document</span>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              )}
            </div>
          </div>

          {/* Primary Vehicle */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Primary Vehicle</h3>
                <p className="text-sm text-gray-500">Assigned Vehicle Details</p>
              </div>
              <Truck className="h-8 w-8 text-primary-500" />
            </div>
            {primaryVehicle ? (
              <div className="mt-4 space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Registration:</span>
                  <p className="font-medium">{primaryVehicle.registrationNumber}</p>
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
              <div className="mt-4 text-gray-500">
                No primary vehicle assigned
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <DriverMetrics driver={driver} trips={trips} />
      </div>
      )}
    </Layout>
  );
};

export default DriverPage;