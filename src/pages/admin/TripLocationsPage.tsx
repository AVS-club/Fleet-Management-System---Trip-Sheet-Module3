import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { MapPin, Building2, ChevronLeft, Plus, Package, Settings, Loader, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import WarehouseForm from '../../components/admin/WarehouseForm';
import DestinationForm from '../../components/admin/DestinationForm';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import { toast } from 'react-toastify';
import MaterialTypeManager from '../../components/admin/MaterialTypeManager';
import { getDestinations, createDestination } from '../../utils/storage';
import { listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../utils/warehouseService';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes'; // Added MaterialType import
import { Warehouse, Destination } from '../../types'; // Added Warehouse and Destination imports

const TripLocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'warehouses' | 'destinations'>('warehouses');
  const [isAddingWarehouse, setIsAddingWarehouse] = useState(false);
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManagingMaterialTypes, setIsManagingMaterialTypes] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [warehousesData, destinationsData, materialTypesData] = await Promise.all([
          listWarehouses(),
          getDestinations(),
          getMaterialTypes()
        ]);
        
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setDestinations(Array.isArray(destinationsData) ? destinationsData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
      } catch (error) {
        console.error('Error fetching location data:', error);
        toast.error('Failed to load location data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddWarehouse = async (data: any) => {
    setIsSubmitting(true);
    try {
      const newWarehouse = await createWarehouse(data);
      
      setWarehouses(prev => [...prev, newWarehouse]);
      setIsAddingWarehouse(false);
      toast.success('Warehouse added successfully');
    } catch (error) {
      console.error('Error adding warehouse:', error);
      toast.error('Failed to add warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWarehouse = async (data: any) => {
    if (!editingWarehouse) return;
    
    setIsSubmitting(true);
    try {
      const updatedWarehouse = await updateWarehouse(editingWarehouse.id, data);
      
      setWarehouses(prev => 
        prev.map(w => w.id === editingWarehouse.id ? updatedWarehouse : w)
      );
      setEditingWarehouse(null);
      toast.success('Warehouse updated successfully');
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast.error('Failed to update warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deletingWarehouse) return;
    
    setIsSubmitting(true);
    try {
      await deleteWarehouse(deletingWarehouse.id);
      
      setWarehouses(prev => prev.filter(w => w.id !== deletingWarehouse.id));
      setDeletingWarehouse(null);
      toast.success('Warehouse deleted successfully');
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error('Failed to delete warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDestination = async (data: any) => {
    try {
      const destinationDataForSupabase = {
        ...data,
        historical_deviation: data.historical_deviation === undefined ? 0 : data.historical_deviation,
        active: data.active === undefined ? true : data.active,
      };
      const newDestination = await createDestination(destinationDataForSupabase);
      if (!newDestination) {
        throw new Error('Failed to create destination');
      }
      
      // Fetch updated destination list to ensure UI is in sync with DB
      const updatedDestinations = await getDestinations();
      setDestinations(Array.isArray(updatedDestinations) ? updatedDestinations : []);
      setIsAddingDestination(false);
      toast.success('Destination added successfully');
    } catch (error) {
      console.error('Error adding destination:', error);
      toast.error('Failed to add destination. Please try again.');
    }
  };

  return (
    <Layout
      title="Trip Locations"
      subtitle="Manage warehouses and delivery destinations"
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Admin
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 flex justify-between items-center">
            <div className="flex space-x-4 p-4">
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'warehouses'
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('warehouses')}
              >
                <Building2 className="h-5 w-5" />
                <span>Warehouses</span>
              </button>
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'destinations'
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('destinations')}
              >
                <MapPin className="h-5 w-5" />
                <span>Destinations</span>
              </button>
            </div>
            <div className="p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManagingMaterialTypes(true)}
                icon={<Settings className="h-4 w-4" />}
              >
                Manage Material Types
              </Button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'warehouses' ? (
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="ml-3 text-gray-600">Loading warehouses...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">Origin Warehouses</h2>
                        <p className="text-sm text-gray-500">Manage warehouse locations</p>
                      </div>
                      {!editingWarehouse && (
                        <Button
                          onClick={() => setIsAddingWarehouse(true)}
                          icon={<Plus className="h-4 w-4" />}
                        >
                          Add Warehouse
                        </Button>
                      )}
                    </div>

                    {(isAddingWarehouse || editingWarehouse) ? (
                      <WarehouseForm
                        initialData={editingWarehouse || undefined}
                        onSubmit={editingWarehouse ? handleUpdateWarehouse : handleAddWarehouse}
                        onCancel={() => {
                          setIsAddingWarehouse(false);
                          setEditingWarehouse(null);
                        }}
                        isSubmitting={isSubmitting}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {warehouses.length === 0 ? (
                          <div className="col-span-3 text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            No warehouses found. Add your first warehouse to get started.
                          </div>
                        ) : (
                          warehouses.map(warehouse => (
                            <div
                              key={warehouse.id}
                              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow relative"
                            >
                              {/* Action buttons */}
                              <div className="absolute top-2 right-2 flex space-x-1">
                                <button
                                  onClick={() => setEditingWarehouse(warehouse)}
                                  className="p-1 text-gray-400 hover:text-primary-600 rounded"
                                  title="Edit warehouse"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingWarehouse(warehouse)}
                                  className="p-1 text-gray-400 hover:text-error-600 rounded"
                                  title="Delete warehouse"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5 text-gray-400" />
                                <div className="pr-16">
                                  <h3 className="font-medium text-gray-900">{warehouse.name}</h3>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm text-gray-500">{warehouse.pincode}</p>
                                    {warehouse.material_type_ids && warehouse.material_type_ids.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {warehouse.material_type_ids.map(typeId => (
                                          <span key={typeId} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                                            {materialTypes.find(t => t.id === typeId)?.name || 'Unknown'}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {typeof warehouse.latitude === 'number' && typeof warehouse.longitude === 'number' ? (
                                <div className="mt-3 text-sm text-gray-500">
                                  Coordinates: {warehouse.latitude.toFixed(6)}, {warehouse.longitude.toFixed(6)}
                                </div>
                              ) : warehouse.latitude !== undefined && warehouse.longitude !== undefined && (
                                <div className="mt-3 text-sm text-gray-500">
                                  Coordinates: {warehouse.latitude}, {warehouse.longitude} (Invalid)
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="ml-3 text-gray-600">Loading destinations...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">Delivery Destinations</h2>
                        <p className="text-sm text-gray-500">Manage delivery points</p>
                      </div>
                      <Button
                        onClick={() => setIsAddingDestination(true)}
                        icon={<Plus className="h-4 w-4" />}
                      >
                        Add Destination
                      </Button>
                    </div>

                    {isAddingDestination ? (
                      <DestinationForm
                        onSubmit={handleAddDestination}
                        onCancel={() => setIsAddingDestination(false)}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {destinations.length === 0 ? (
                          <div className="col-span-3 text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            No destinations found. Add your first destination to get started.
                          </div>
                        ) : (
                          destinations.map(destination => (
                            <div
                              key={destination.id}
                              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center space-x-3">
                                <MapPin className="h-5 w-5 text-gray-400" />
                                <div>
                                  <h3 className="font-medium text-gray-900">{destination.name}</h3>
                                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                                    <span>{destination.standard_distance} km</span>
                                    <span>·</span>
                                    <span>{destination.estimated_time}</span>
                                  </div>
                                </div>
                              </div>
                              {typeof destination.latitude === 'number' && typeof destination.longitude === 'number' ? (
                                <div className="mt-3 text-sm text-gray-500">
                                  Coordinates: {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
                                </div>
                              ) : destination.latitude !== undefined && destination.longitude !== undefined && (
                                <div className="mt-3 text-sm text-gray-500">
                                  Coordinates: {destination.latitude}, {destination.longitude} (Invalid)
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deletingWarehouse}
          title="Delete Warehouse"
          message={`Are you sure you want to delete warehouse "${deletingWarehouse?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteWarehouse}
          onCancel={() => setDeletingWarehouse(null)}
          type="delete"
          isLoading={isSubmitting}
        />
        
        {isManagingMaterialTypes && (
          <MaterialTypeManager onClose={() => setIsManagingMaterialTypes(false)} />
        )}
      </div>
    </Layout>
  );
};

export default TripLocationsPage;