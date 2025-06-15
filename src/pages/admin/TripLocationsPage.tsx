import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { MapPin, Building2, ChevronLeft, Plus, Package, Settings } from 'lucide-react';
import Button from '../../components/ui/Button';
import WarehouseForm from '../../components/admin/WarehouseForm';
import DestinationForm from '../../components/admin/DestinationForm';
import { toast } from 'react-toastify';
import MaterialTypeManager from '../../components/admin/MaterialTypeManager';
import { getWarehouses, getDestinations, createWarehouse, createDestination } from '../../utils/storage';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { Warehouse, Destination } from '../../types';
import { useTranslation } from '../../utils/translationUtils';

const TripLocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'warehouses' | 'destinations'>('warehouses');
  const [isAddingWarehouse, setIsAddingWarehouse] = useState(false);
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [isManagingMaterialTypes, setIsManagingMaterialTypes] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);

  // Translate UI text
  const title = useTranslation('Trip Locations');
  const subtitle = useTranslation('Manage warehouses and delivery destinations');
  const backToAdminText = useTranslation('Back to Admin');
  const warehousesTabText = useTranslation('Warehouses');
  const destinationsTabText = useTranslation('Destinations');
  const manageMaterialTypesText = useTranslation('Manage Material Types');
  const originWarehousesText = useTranslation('Origin Warehouses');
  const manageWarehouseText = useTranslation('Manage warehouse locations');
  const addWarehouseText = useTranslation('Add Warehouse');
  const noWarehousesText = useTranslation('No warehouses found. Add your first warehouse to get started.');
  const deliveryDestinationsText = useTranslation('Delivery Destinations');
  const manageDeliveryText = useTranslation('Manage delivery points');
  const addDestinationText = useTranslation('Add Destination');
  const noDestinationsText = useTranslation('No destinations found. Add your first destination to get started.');
  const loadingWarehousesText = useTranslation('Loading warehouses...');
  const loadingDestinationsText = useTranslation('Loading destinations...');
  const coordinatesText = useTranslation('Coordinates');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [warehousesData, destinationsData, materialTypesData] = await Promise.all([
          getWarehouses(),
          getDestinations(),
          getMaterialTypes()
        ]);
        
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setDestinations(Array.isArray(destinationsData) ? destinationsData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
      } catch (error) {
        console.error('Error fetching location data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddWarehouse = async (data: any) => {
    try {
      // The createWarehouse function in storage.ts will handle converting keys to snake_case
      const newWarehouse = await createWarehouse(data);
      if (newWarehouse === null) {
        throw new Error('Failed to create warehouse');
      }
      
      // Fetch updated warehouse list to ensure UI is in sync with DB
      const updatedWarehouses = await getWarehouses();
      setWarehouses(Array.isArray(updatedWarehouses) ? updatedWarehouses : []);
      setIsAddingWarehouse(false);
      toast.success(useTranslation('Warehouse added successfully'));
    } catch (error) {
      console.error('Error adding warehouse:', error);
      toast.error(useTranslation('Failed to add warehouse. Please try again.'));
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
      toast.success(useTranslation('Destination added successfully'));
    } catch (error) {
      console.error('Error adding destination:', error);
      toast.error(useTranslation('Failed to add destination. Please try again.'));
    }
  };

  return (
    <Layout
      title={title}
      subtitle={subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          {backToAdminText}
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
                <span>{warehousesTabText}</span>
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
                <span>{destinationsTabText}</span>
              </button>
            </div>
            <div className="p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManagingMaterialTypes(true)}
                icon={<Settings className="h-4 w-4" />}
              >
                {manageMaterialTypesText}
              </Button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'warehouses' ? (
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="ml-3 text-gray-600">{loadingWarehousesText}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">{originWarehousesText}</h2>
                        <p className="text-sm text-gray-500">{manageWarehouseText}</p>
                      </div>
                      <Button
                        onClick={() => setIsAddingWarehouse(true)}
                        icon={<Plus className="h-4 w-4" />}
                      >
                        {addWarehouseText}
                      </Button>
                    </div>

                    {isAddingWarehouse ? (
                      <WarehouseForm
                        onSubmit={handleAddWarehouse}
                        onCancel={() => setIsAddingWarehouse(false)}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {warehouses.length === 0 ? (
                          <div className="col-span-3 text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            {noWarehousesText}
                          </div>
                        ) : (
                          warehouses.map(warehouse => (
                            <div
                              key={warehouse.id}
                              className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5 text-gray-400" />
                                <div>
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
                                  {coordinatesText}: {warehouse.latitude.toFixed(6)}, {warehouse.longitude.toFixed(6)}
                                </div>
                              ) : warehouse.latitude !== undefined && warehouse.longitude !== undefined && (
                                <div className="mt-3 text-sm text-gray-500">
                                  {coordinatesText}: {warehouse.latitude}, {warehouse.longitude} ({useTranslation('Invalid')})
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
                    <p className="ml-3 text-gray-600">{loadingDestinationsText}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">{deliveryDestinationsText}</h2>
                        <p className="text-sm text-gray-500">{manageDeliveryText}</p>
                      </div>
                      <Button
                        onClick={() => setIsAddingDestination(true)}
                        icon={<Plus className="h-4 w-4" />}
                      >
                        {addDestinationText}
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
                            {noDestinationsText}
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
                                  {coordinatesText}: {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
                                </div>
                              ) : destination.latitude !== undefined && destination.longitude !== undefined && (
                                <div className="mt-3 text-sm text-gray-500">
                                  {coordinatesText}: {destination.latitude}, {destination.longitude} ({useTranslation('Invalid')})
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
        
        {isManagingMaterialTypes && (
          <MaterialTypeManager onClose={() => setIsManagingMaterialTypes(false)} />
        )}
      </div>
    </Layout>
  );
};

export default TripLocationsPage;