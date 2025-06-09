import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getVehicle, getVehicleStats, getTrips } from '../utils/storage';
import { Truck, Calendar, PenTool as Tool, AlertTriangle, ChevronLeft, Fuel, FileText, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import MileageChart from '../components/dashboard/MileageChart';
import VehicleForm from '../components/vehicles/VehicleForm';

const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalTrips: number; totalDistance: number; averageKmpl?: number }>({
    totalTrips: 0,
    totalDistance: 0
  });
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const [vehicleData, tripsData, vehicleStats] = await Promise.all([
          getVehicle(id),
          getTrips(),
          getVehicleStats(id)
        ]);
        
        setVehicle(vehicleData);
        setTrips(Array.isArray(tripsData) ? tripsData.filter(trip => trip.vehicle_id === id) : []);
        setStats(vehicleStats || { totalTrips: 0, totalDistance: 0 });
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (!vehicle) {
    return (
      <Layout title="Vehicle Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">The requested vehicle could not be found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/vehicles')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Vehicles
          </Button>
        </div>
      </Layout>
    );
  }

  if (isEditing) {
    return (
      <Layout
        title="Edit Vehicle"
        subtitle={vehicle.registration_number}
        actions={
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          <VehicleForm
            initialData={vehicle}
            onSubmit={(data) => {
              // Handle update
              setIsEditing(false);
            }}
          />
        </div>
      </Layout>
    );
  }

  // Calculate document status
  const hasExpiredDocs = vehicle.insurance_end_date && new Date(vehicle.insurance_end_date) < new Date() ||
    vehicle.fitness_expiry_date && new Date(vehicle.fitness_expiry_date) < new Date() ||
    vehicle.permit_expiry_date && new Date(vehicle.permit_expiry_date) < new Date() ||
    vehicle.puc_expiry_date && new Date(vehicle.puc_expiry_date) < new Date();

  return (
    <Layout
      title={`Vehicle: ${vehicle.registration_number}`}
      subtitle={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      actions={
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/vehicles')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Vehicles
          </Button>
          <Button
            onClick={() => setIsEditing(true)}
            icon={<Tool className="h-4 w-4" />}
          >
            Edit Vehicle
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
                <p className="text-sm text-gray-500">{vehicle.type?.toUpperCase() || 'N/A'}</p>
              </div>
              <Truck className="h-8 w-8 text-primary-500" />
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <span className="text-sm text-gray-500">Registration:</span>
                <p className="font-medium">{vehicle.registration_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Chassis Number:</span>
                <p className="font-medium">{vehicle.chassis_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Engine Number:</span>
                <p className="font-medium">{vehicle.engine_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Owner:</span>
                <p className="font-medium">{vehicle.owner_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Current Odometer:</span>
                <p className="font-medium">{vehicle.current_odometer.toLocaleString()} km</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  vehicle.status === 'active' 
                    ? 'bg-success-100 text-success-800'
                    : vehicle.status === 'maintenance'
                    ? 'bg-warning-100 text-warning-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {vehicle.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Document Status</h3>
                <p className="text-sm text-gray-500">Compliance Information</p>
              </div>
              <Shield className="h-8 w-8 text-primary-500" />
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Insurance Status:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    vehicle.insurance_end_date && new Date(vehicle.insurance_end_date) > new Date()
                      ? 'bg-success-100 text-success-700'
                      : 'bg-error-100 text-error-700'
                  }`}>
                    {vehicle.insurance_end_date 
                      ? new Date(vehicle.insurance_end_date) > new Date()
                        ? 'Valid'
                        : 'Expired'
                      : 'Not Added'}
                  </span>
                </div>
                {vehicle.insurance_end_date && (
                  <p className="text-sm mt-1">Expires: {new Date(vehicle.insurance_end_date).toLocaleDateString()}</p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Documents Verified:</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  vehicle.documents_verified
                    ? 'bg-success-100 text-success-700'
                    : 'bg-warning-100 text-warning-700'
                }`}>
                  {vehicle.documents_verified ? 'Verified' : 'Pending'}
                </span>
              </div>

              {vehicle.rc_copy && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">RC Copy</span>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              )}
              {vehicle.insurance_document && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">Insurance Document</span>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              )}
              {vehicle.fitness_document && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">Fitness Certificate</span>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              )}
              {vehicle.permit_document && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">Permit Document</span>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Performance Stats</h3>
                <p className="text-sm text-gray-500">Overall Statistics</p>
              </div>
              <Calendar className="h-8 w-8 text-primary-500" />
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-sm text-gray-500">Total Trips:</span>
                <p className="text-2xl font-semibold">{stats?.totalTrips || 0}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Total Distance:</span>
                <p className="text-2xl font-semibold">{stats?.totalDistance?.toLocaleString() || 0} km</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Average Mileage:</span>
                <p className="text-2xl font-semibold text-success-600">
                  {stats?.averageKmpl?.toFixed(2) || '-'} km/L
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Mileage Trends</h3>
          <div className="h-64">
            <MileageChart trips={trips} />
          </div>
        </div>

        {hasExpiredDocs && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-error-800 font-medium">Document Expiry Alert</h3>
                <p className="text-error-700 text-sm mt-1">
                  One or more documents have expired. Please update them to maintain compliance.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicle.rc_copy && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-700">RC Copy</span>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            )}
            {vehicle.insurance_document && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-700">Insurance Document</span>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            )}
            {vehicle.fitness_document && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-700">Fitness Certificate</span>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            )}
            {vehicle.permit_document && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-700">Permit Document</span>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </Layout>
  );
};

export default VehiclePage;