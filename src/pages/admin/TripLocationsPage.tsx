import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout'; 
import { MapPin, Building2, ChevronLeft, Plus, Package, Settings, Loader, Edit, Trash2 } from 'lucide-react';
import { Archive, ArchiveRestore } from 'lucide-react';
import Button from '../../components/ui/Button';
import WarehouseForm from '../../components/admin/WarehouseForm';
import DestinationForm from '../../components/admin/DestinationForm';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import { toast } from 'react-toastify';
import MaterialTypeManager from '../../components/admin/MaterialTypeManager';
import { getDestinations, createDestination, hardDeleteDestination } from '../../utils/storage';
import { listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, hardDeleteWarehouse, archiveWarehouse, restoreWarehouse } from '../../utils/warehouseService';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes'; // Added MaterialType import
import { Warehouse, Destination } from '@/types'; // Added Warehouse and Destination imports
import Checkbox from '../../components/ui/Checkbox'; // Import Checkbox

const TripLocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'warehouses' | 'destinations'>('warehouses');
  const [isAddingWarehouse, setIsAddingWarehouse] = useState(false);
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null); // Used for archive confirmation
  const [hardDeletingWarehouse, setHardDeletingWarehouse] = useState<Warehouse | null>(null); // New state for hard delete confirmation
  const [deletingDestination, setDeletingDestination] = useState<Destination | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManagingMaterialTypes, setIsManagingMaterialTypes] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false); // New state for showing inactive warehouses

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [warehousesData, destinationsData, materialTypesData] = await Promise.all([
          listWarehouses({ includeInactive: showInactive }), // Use showInactive filter
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
  }, [showInactive]); // Add showInactive to dependencies

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

  // New function for soft-delete (archive)
  const handleArchiveWarehouse = async () => {
    if (!deletingWarehouse) return;
    setIsSubmitting(true);
    try {
      await archiveWarehouse(deletingWarehouse.id);
      setWarehouses(prev => prev.map(w => w.id === deletingWarehouse.id ? { ...w, is_active: false } : w));
      setDeletingWarehouse(null);
      toast.success('Warehouse archived successfully');
    } catch (error) {
      console.error('Error archiving warehouse:', error);
      toast.error('Failed to archive warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // New function for restoring soft-deleted
  const handleRestoreWarehouse = async (warehouseId: string) => {
    setIsSubmitting(true);
    try {
      await restoreWarehouse(warehouseId);
      setWarehouses(prev => prev.map(w => w.id === warehouseId ? { ...w, is_active: true } : w));
      toast.success('Warehouse restored successfully');
    } catch (error) {
      console.error('Error restoring warehouse:', error);
      toast.error('Failed to restore warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // New function for hard delete (admin maintenance only)
  const handleHardDeleteWarehouse = async () => {
    if (!hardDeletingWarehouse) return;
    setIsSubmitting(true);
    try {
      await hardDeleteWarehouse(hardDeletingWarehouse.id);
      setWarehouses(prev => prev.filter(w => w.id !== hardDeletingWarehouse.id));
      setHardDeletingWarehouse(null);
      toast.success('Warehouse permanently deleted');
    } catch (error) {
      console.error('Error hard deleting warehouse:', error);
      const errorMessage = (error as any)?.message || '';
      if (errorMessage.includes('23503') || errorMessage.includes('foreign key constraint')) {
        toast.error('Cannot delete warehouse: It is linked to existing trips. Consider archiving instead.');
      } else {
        toast.error('Failed to permanently delete warehouse');
      }
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
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <MapPin className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Trip Locations</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Manage warehouses and delivery destinations</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Admin
          </Button>
        </div>
      </div>

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
                inputSize="sm"
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
                      <div className="border-l-2 border-blue-500 pl-2">
                        <h2 className="text-lg font-medium text-gray-900">Origin Warehouses</h2>
                        <p className="text-sm text-gray-500">Manage warehouse locations</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          label="Show Inactive"
                          checked={showInactive}
                          onChange={(e) => setShowInactive(e.target.checked)}
                        />
                        {!editingWarehouse && (
                          <Button
                            onClick={() => setIsAddingWarehouse(true)}
                            icon={<Plus className="h-4 w-4" />}
                          >
                            Add Warehouse
                          </Button>
                        )}
                      </div>
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
                              className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow relative ${warehouse.is_active ? '' : 'opacity-50'}`}
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
                                {warehouse.is_active ? (
                                  <button
                                    onClick={() => setDeletingWarehouse(warehouse)} // Use setDeletingWarehouse for archive
                                    className="p-1 text-gray-400 hover:text-warning-600 rounded"
                                    title="Archive warehouse"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRestoreWarehouse(warehouse.id)} // Direct call for restore
                                    className="p-1 text-gray-400 hover:text-success-600 rounded"
                                    title="Restore warehouse"
                                  >
                                    <ArchiveRestore className="h-4 w-4" />
                                  </button>
                                )}
                                {/* Hard delete option */}
                                <button
                                  onClick={() => setHardDeletingWarehouse(warehouse)} // New state for hard delete
                                  className="p-1 text-gray-400 hover:text-error-600 rounded"
                                  title="Permanently delete warehouse (admin only)"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Inactive badge */}
                              {!warehouse.is_active && (
                                <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                  Inactive
                                </span>
                              )}
                              
                              <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5 text-gray-400" />
                                <div>
                                  <h3 className="font-medium text-gray-900">{warehouse.name}</h3>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm text-gray-500">{warehouse.pincode}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {warehouse.material_type_ids.map(typeId => (
                                      <span key={typeId} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                                        {materialTypes.find(t => t.id === typeId)?.name || 'Unknown'}
                                      </span>
                                    ))}
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
                      <div className="border-l-2 border-blue-500 pl-2">
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
                              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow relative"
                            >
                              {/* Action buttons */}
                              <div className="absolute top-2 right-2 flex space-x-1">
                                <button
                                  onClick={() => setDeletingDestination(destination)}
                                  className="p-1 text-gray-400 hover:text-error-600 rounded"
                                  title="Delete destination"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              
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
        
        {/* Destination Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deletingDestination}
          title="Delete Destination"
          message={`Are you sure you want to delete "${deletingDestination?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="delete"
          isLoading={isSubmitting}
          onCancel={() => setDeletingDestination(null)}
          onConfirm={async () => {
            if (!deletingDestination) return;
            setIsSubmitting(true);
            try {
              await hardDeleteDestination(deletingDestination.id);
              setDestinations(prev => prev.filter(d => d.id !== deletingDestination.id));
              toast.success('Destination deleted successfully');
              setDeletingDestination(null);
            } catch (err: any) {
              const msg = String(err?.message || '');
              if (msg.includes('23503') || msg.toLowerCase().includes('foreign key')) {
                toast.error('Cannot delete destination: it is linked to existing trips.');
              } else {
                toast.error('Failed to delete destination.');
              }
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
        
        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deletingWarehouse}
          title={deletingWarehouse?.is_active ? "Archive Warehouse" : "Restore Warehouse"}
          message={deletingWarehouse?.is_active ?
            `Are you sure you want to archive warehouse "${deletingWarehouse?.name}"? It will be hidden from most views but can be restored later.` :
            `Are you sure you want to restore warehouse "${deletingWarehouse?.name}"? It will become active again.`
          }
          confirmText={deletingWarehouse?.is_active ? "Archive" : "Restore"}
          cancelText="Cancel"
          onConfirm={deletingWarehouse?.is_active ? handleArchiveWarehouse : () => handleRestoreWarehouse(deletingWarehouse!.id)}
          onCancel={() => setDeletingWarehouse(null)}
          type={deletingWarehouse?.is_active ? "archive" : "info"}
          isLoading={isSubmitting}
        />
        
        {/* Hard Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!hardDeletingWarehouse}
          title="Permanently Delete Warehouse"
          message={`WARNING: Are you sure you want to permanently delete warehouse "${hardDeletingWarehouse?.name}"? This action cannot be undone and may break existing trip records if this warehouse is referenced.`}
          confirmText="Delete Permanently"
          cancelText="Cancel"
          onConfirm={handleHardDeleteWarehouse}
          onCancel={() => setHardDeletingWarehouse(null)}
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