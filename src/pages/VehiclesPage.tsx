import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Vehicle } from '../types'; // Import the Vehicle interface

interface VehicleWithStats extends Vehicle {
  stats: {
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  };
}

import { getVehicles, getVehicleStats, createVehicle } from '../utils/storage';
import { Truck, Calendar, PenTool as PenToolIcon, PlusCircle, FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import VehicleForm from '../components/vehicles/VehicleForm';

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!loading) return;
      setLoading(true);
      try {
        const data = await getVehicles();
        if (!Array.isArray(data)) return;
        
        const vehiclesWithStatsPromises = data.map(async (vehicle) => {
          const rawStats = await getVehicleStats(vehicle.id);
          const conformingStats = {
            totalTrips: rawStats && typeof rawStats.totalTrips === 'number' ? rawStats.totalTrips : 0,
            totalDistance: rawStats && typeof rawStats.totalDistance === 'number' ? rawStats.totalDistance : 0,
            averageKmpl: rawStats && typeof rawStats.averageKmpl === 'number' ? rawStats.averageKmpl : undefined,
          };
          return {
            ...vehicle,
            stats: conformingStats,
          };
        });
        const vehiclesWithStats = await Promise.all(vehiclesWithStatsPromises);
        setVehicles(vehiclesWithStats);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleAddVehicle = async (data: Omit<Vehicle, 'id'>) => {
    setIsSubmitting(true);
    try {
      const newVehicle = await createVehicle(data);
      if (newVehicle) {
        const rawStats = await getVehicleStats(newVehicle.id);
        const conformingStats = {
          totalTrips: rawStats && typeof rawStats.totalTrips === 'number' ? rawStats.totalTrips : 0,
          totalDistance: rawStats && typeof rawStats.totalDistance === 'number' ? rawStats.totalDistance : 0,
          averageKmpl: rawStats && typeof rawStats.averageKmpl === 'number' ? rawStats.averageKmpl : undefined,
        };
        const vehicleWithStats: VehicleWithStats = { 
          ...newVehicle, 
          stats: conformingStats 
        };
        setVehicles(prev => 
          Array.isArray(prev) 
            ? [...prev, vehicleWithStats] 
            : [vehicleWithStats]
        );
        setIsAddingVehicle(false);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to count uploaded documents
  const countDocuments = (vehicle: Vehicle): { uploaded: number, total: number } => {
    let uploaded = 0;
    const total = 6; // RC, Insurance, Fitness, Tax, Permit, PUC
    
    if (vehicle.rc_copy) uploaded++;
    if (vehicle.insurance_document) uploaded++;
    if (vehicle.fitness_document) uploaded++;
    if (vehicle.tax_receipt_document) uploaded++;
    if (vehicle.permit_document) uploaded++;
    if (vehicle.puc_document) uploaded++;
    
    return { uploaded, total };
  };

  return (
    <Layout
      title="Vehicles"
      subtitle="Manage your fleet vehicles"
      actions={
        !isAddingVehicle && (
          <Button
            onClick={() => setIsAddingVehicle(true)}
            icon={<PlusCircle className="h-4 w-4" />}
          >
            Add New Vehicle
          </Button>
        )
      }
    >
      {isAddingVehicle ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-primary-500" />
              New Vehicle
            </h2>
            
            <Button
              variant="outline"
              onClick={() => setIsAddingVehicle(false)}
            >
              Cancel
            </Button>
          </div>
          
          <VehicleForm 
            onSubmit={handleAddVehicle}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3 text-gray-600">Loading vehicles...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No vehicles found. Add your first vehicle to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map(vehicle => {
            // Count documents
            const { uploaded, total } = countDocuments(vehicle);
            
            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {/* Vehicle Photo (circular) */}
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 mr-3 flex-shrink-0">
                      {vehicle.photo_url ? (
                        <img 
                          src={vehicle.photo_url} 
                          alt={vehicle.registration_number}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        <Truck className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{vehicle.registration_number}</h3>
                      <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    vehicle.status === 'active'
                      ? 'bg-success-100 text-success-800'
                      : vehicle.status === 'maintenance'
                      ? 'bg-warning-100 text-warning-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {vehicle.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Type</span>
                    <p className="font-medium capitalize">{vehicle.type}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Year</span>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Odometer</span>
                    <p className="font-medium">
                      {typeof vehicle.current_odometer === 'number'
                        ? vehicle.current_odometer.toLocaleString()
                        : 'N/A'}{' '}
                      km
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Fuel Type</span>
                    <p className="font-medium capitalize">{vehicle.fuel_type}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <Truck className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Trips</span>
                      <p className="font-medium">{vehicle.stats.totalTrips}</p>
                    </div>
                    <div className="text-center">
                      <Calendar className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Distance</span>
                      <p className="font-medium">
                        {typeof vehicle.stats.totalDistance === 'number'
                          ? vehicle.stats.totalDistance.toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <PenToolIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm text-gray-500">Avg KMPL</span>
                      <p className="font-medium">{vehicle.stats.averageKmpl?.toFixed(1) || '-'}</p>
                    </div>
                  </div>
                  
                  {/* Document Status */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-500">Docs:</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        uploaded === total 
                          ? 'bg-success-100 text-success-800' 
                          : uploaded === 0 
                          ? 'bg-error-100 text-error-800'
                          : 'bg-warning-100 text-warning-800'
                      }`}>
                        {uploaded}/{total}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>)
      )}
    </Layout>
  );
};

export default VehiclesPage;