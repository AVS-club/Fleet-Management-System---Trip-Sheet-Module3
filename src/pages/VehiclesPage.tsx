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

import { getVehicles, getVehicleStats, createVehicle, getTrips } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import { Truck, Calendar, PenTool as PenToolIcon, PlusCircle, FileText, AlertTriangle, FileCheck, TrendingUp } from 'lucide-react';
import Button from '../components/ui/Button';
import VehicleForm from '../components/vehicles/VehicleForm';
import { toast } from 'react-toastify';
import StatCard from '../components/dashboard/StatCard';
import RemindersButton from '../components/common/RemindersButton';

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  // Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [vehiclesZeroTrips, setVehiclesZeroTrips] = useState(0);
  const [avgOdometer, setAvgOdometer] = useState(0);
  const [docsPendingVehicles, setDocsPendingVehicles] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setStatsLoading(true);
      try {
        const [vehiclesData, tripsData] = await Promise.all([
          getVehicles(),
          getTrips()
        ]);
        
        const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
        
        // Fetch stats for each vehicle
        const vehiclesWithStats = await Promise.all(
          vehiclesArray.map(async (vehicle) => {
            const stats = await getVehicleStats(vehicle.id);
            return { ...vehicle, stats, selected: false };
          })
        );
        
        setVehicles(vehiclesWithStats);
        
        // Calculate statistics
        const activeVehicles = vehiclesArray.filter(v => v.status !== 'archived');
        setTotalVehicles(activeVehicles.length);
        
        // Calculate vehicles with zero trips
        const vehiclesWithTrips = new Set();
        if (Array.isArray(tripsData)) {
          tripsData.forEach(trip => {
            if (trip.vehicle_id) {
              vehiclesWithTrips.add(trip.vehicle_id);
            }
          });
        }
        
        const zeroTripsCount = activeVehicles.filter(vehicle => !vehiclesWithTrips.has(vehicle.id)).length;
        setVehiclesZeroTrips(zeroTripsCount);
        
        // Calculate average odometer reading (for active vehicles)
        const totalOdometer = activeVehicles.reduce((sum, vehicle) => sum + (vehicle.current_odometer || 0), 0);
        setAvgOdometer(activeVehicles.length > 0 ? Math.round(totalOdometer / activeVehicles.length) : 0);
        
        // Calculate vehicles with documents pending
        const docsPendingCount = activeVehicles.filter(vehicle => {
          const docsCount = [
            vehicle.rc_copy,
            vehicle.insurance_document,
            vehicle.fitness_document,
            vehicle.tax_receipt_document,
            vehicle.permit_document,
            vehicle.puc_document
          ].filter(Boolean).length;
          
          return docsCount < 6;
        }).length;
        
        setDocsPendingVehicles(docsPendingCount);
        
        setStatsLoading(false);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Failed to load vehicles');
        setStatsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        setTotalVehicles(prev => prev + 1);
        setIsAddingVehicle(false);
        toast.success('Vehicle added successfully');
      } else {
        toast.error('Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Error adding vehicle: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  // Filter vehicles based on archived status
  const filteredVehicles = vehicles.filter(v => showArchived ? v.status === 'archived' : v.status !== 'archived');

  return (
    <Layout
      title="Vehicles"
      subtitle="Manage your fleet vehicles"
      actions={
        !isAddingVehicle && (
          <div className="flex space-x-3">
            <RemindersButton module="vehicles" />
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Show Active Vehicles' : 'Show Archived Vehicles'}
            </Button>
            <Button
              onClick={() => setIsAddingVehicle(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              Add New Vehicle
            </Button>
          </div>
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
            onCancel={() => setIsAddingVehicle(false)}
          />
        </div>
      ) : (
        <>
          {/* Vehicle Stats Section */}
          {!showArchived && (
            <>
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 w-16 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Total Vehicles"
                    value={totalVehicles}
                    icon={<Truck className="h-5 w-5 text-primary-600" />}
                  />
                  
                  <StatCard
                    title="Vehicles with 0 Trips"
                    value={vehiclesZeroTrips}
                    icon={<Calendar className="h-5 w-5 text-warning-600" />}
                    warning={vehiclesZeroTrips > 0}
                  />
                  
                  <StatCard
                    title="Average Odometer"
                    value={avgOdometer.toLocaleString()}
                    subtitle="km"
                    icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
                  />
                  
                  <StatCard
                    title="Documents Pending"
                    value={docsPendingVehicles}
                    icon={<FileCheck className="h-5 w-5 text-error-600" />}
                    warning={docsPendingVehicles > 0}
                  />
                </div>
              )}
            </>
          )}
          
          {showArchived && (
            <div className="bg-gray-100 border-l-4 border-warning-500 p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-6 w-6 text-warning-500 mr-2" />
                <div>
                  <h3 className="text-warning-800 font-medium">Viewing Archived Vehicles</h3>
                  <p className="text-warning-700">You are currently viewing archived vehicles. These vehicles are hidden from other parts of the system.</p>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 text-gray-600">Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">
                {showArchived ? 'No archived vehicles found.' : 'No vehicles found. Add your first vehicle to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map(vehicle => {
                // Count documents
                const { uploaded, total } = countDocuments(vehicle);
                
                return (
                  <div
                    key={vehicle.id}
                    className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow ${
                      vehicle.status === 'archived' ? 'opacity-75' : ''
                    }`}
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
                          : vehicle.status === 'archived'
                          ? 'bg-gray-100 text-gray-600'
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
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default VehiclesPage;