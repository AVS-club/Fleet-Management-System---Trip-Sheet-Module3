import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../utils/storage';
import { uploadVehicleDocument } from '../utils/supabaseStorage';
import { Vehicle } from '../types';
import { Truck, PlusCircle, Edit2, Trash2, FileText, Calendar, Fuel, MapPin } from 'lucide-react';
import Button from '../components/ui/Button';
import VehicleForm from '../components/vehicles/VehicleForm';
import { toast } from 'react-toastify';

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for openAddForm state on mount
  useEffect(() => {
    if (location.state?.openAddForm) {
      setIsAddingVehicle(true);
      // Clear the location state to prevent form from reopening
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const vehiclesData = await getVehicles();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleSaveVehicle = async (data: Omit<Vehicle, 'id'>) => {
    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        const updatedVehicle = await updateVehicle(editingVehicle.id, data);
        if (updatedVehicle) {
          setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
          setEditingVehicle(null);
          toast.success('Vehicle updated successfully');
        }
      } else {
        const newVehicle = await createVehicle(data);
        if (newVehicle) {
          setVehicles(prev => [newVehicle, ...prev]);
          setIsAddingVehicle(false);
          toast.success('Vehicle added successfully');
        }
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(`Failed to ${editingVehicle ? 'update' : 'add'} vehicle`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsAddingVehicle(false);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const success = await deleteVehicle(vehicleId);
        if (success) {
          setVehicles(prev => prev.filter(v => v.id !== vehicleId));
          toast.success('Vehicle deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        toast.error('Failed to delete vehicle');
      }
    }
  };

  const handleCancelForm = () => {
    setIsAddingVehicle(false);
    setEditingVehicle(null);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Truck className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Vehicles</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Manage your fleet vehicles</p>
        {!isAddingVehicle && !editingVehicle && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => setIsAddingVehicle(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              Add Vehicle
            </Button>
          </div>
        )}
      </div>

      {isAddingVehicle || editingVehicle ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-primary-500" />
              {editingVehicle ? 'Edit Vehicle' : 'New Vehicle'}
            </h2>
            <Button variant="outline" onClick={handleCancelForm}>
              Cancel
            </Button>
          </div>

          <VehicleForm
            initialData={editingVehicle || {}}
            onSubmit={handleSaveVehicle}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 text-gray-600">Loading vehicles...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No vehicles found</h3>
              <p className="text-gray-500 mt-1">Add your first vehicle to get started</p>
              <Button
                onClick={() => setIsAddingVehicle(true)}
                icon={<PlusCircle className="h-4 w-4" />}
                className="mt-4"
              >
                Add Vehicle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow relative cursor-pointer"
                  onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                >
                  {/* Edit Button */}
                  <button
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditVehicle(vehicle);
                    }}
                    title="Edit Vehicle"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Truck className="h-6 w-6 text-primary-600" />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 pr-8">
                        {vehicle.registration_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {vehicle.make} {vehicle.model} ({vehicle.year})
                      </p>

                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          vehicle.status === 'active' 
                            ? 'bg-success-100 text-success-800'
                            : vehicle.status === 'maintenance'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.status}
                        </span>
                        
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                          <Fuel className="h-3 w-3 mr-1" />
                          {vehicle.fuel_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Stats */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <FileText className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500 block">Type</span>
                        <p className="font-medium capitalize">{vehicle.type}</p>
                      </div>
                      <div className="text-center">
                        <MapPin className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500 block">Odometer</span>
                        <p className="font-medium">{vehicle.current_odometer?.toLocaleString()} km</p>
                      </div>
                      <div className="text-center">
                        <Calendar className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-500 block">Year</span>
                        <p className="font-medium">{vehicle.year}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vehicles/${vehicle.id}`);
                      }}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVehicle(vehicle.id);
                      }}
                      className="text-error-600 hover:text-error-800 text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default VehiclesPage;