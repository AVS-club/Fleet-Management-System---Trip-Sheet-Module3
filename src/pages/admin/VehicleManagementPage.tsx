import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { 
  getVehicles, 
  getVehicleStats,
  getDrivers,
  bulkUpdateVehicles,
  bulkDeleteVehicles,
  deleteVehicle,
  updateVehicle,
  exportVehicleData
} from '../../utils/storage';
import { 
  Truck, 
  ChevronLeft,
  Trash2,
  Archive,
  Download,
  UserPlus,
  UserX,
  CheckSquare,
  Square,
  Search,
  Filter
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Vehicle, Driver } from '../../types';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import VehicleActivityLogTable from '../../components/admin/VehicleActivityLogTable';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';

interface VehicleWithStats extends Vehicle {
  stats?: {
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  };
  selected?: boolean; // For checkbox selection
}

const VehicleManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // State for vehicle filtering
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all'
  });
  
  // State for bulk selection
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // State for confirmation modals
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; vehicleId?: string; vehicleReg?: string }>({ 
    isOpen: false 
  });
  const [bulkDeleteModal, setbulkDeleteModal] = useState<{ isOpen: boolean; count: number }>({ 
    isOpen: false, count: 0 
  });
  const [bulkArchiveModal, setbulkArchiveModal] = useState<{ isOpen: boolean; count: number }>({ 
    isOpen: false, count: 0 
  });
  
  // State for driver assignment
  const [driverAssignModal, setDriverAssignModal] = useState<{ 
    isOpen: boolean; 
    vehicleId?: string; 
    vehicleReg?: string;
    driverId?: string;
  }>({ 
    isOpen: false 
  });
  
  // State for operation loading
  const [operationLoading, setOperationLoading] = useState(false);

  // Fetch vehicles and drivers data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch vehicles with their stats
        const vehiclesData = await getVehicles();
        
        // Fetch stats for each vehicle
        const vehiclesWithStats = await Promise.all(
          vehiclesData.map(async (vehicle) => {
            const stats = await getVehicleStats(vehicle.id);
            return { ...vehicle, stats, selected: false };
          })
        );
        
        setVehicles(vehiclesWithStats);
        
        // Fetch drivers for assignment dropdown
        const driversData = await getDrivers();
        setDrivers(driversData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);

  // Handle selecting/deselecting all vehicles
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedVehicles(new Set());
    } else {
      // Select all filtered vehicles
      const filteredVehicleIds = filteredVehicles.map(v => v.id);
      setSelectedVehicles(new Set(filteredVehicleIds));
    }
    setSelectAll(!selectAll);
  };

  // Handle selecting/deselecting a single vehicle
  const handleSelectVehicle = (vehicleId: string) => {
    const newSelected = new Set(selectedVehicles);
    
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    
    setSelectedVehicles(newSelected);
    
    // Update selectAll state based on if all filtered vehicles are selected
    setSelectAll(
      filteredVehicles.every(v => newSelected.has(v.id)) && 
      filteredVehicles.length > 0
    );
  };

  // Handle deleting a single vehicle
  const handleDeleteVehicle = async () => {
    if (!deleteModal.vehicleId) return;
    
    setOperationLoading(true);
    try {
      const success = await deleteVehicle(deleteModal.vehicleId);
      
      if (success) {
        toast.success(`Vehicle ${deleteModal.vehicleReg} deleted successfully`);
        // Remove from state
        setVehicles(prevVehicles => prevVehicles.filter(v => v.id !== deleteModal.vehicleId));
        // Close modal
        setDeleteModal({ isOpen: false });
        // Refresh activity logs
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(`Failed to delete vehicle ${deleteModal.vehicleReg}`);
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error(`Error deleting vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle bulk delete vehicles
  const handleBulkDeleteVehicles = async () => {
    if (selectedVehicles.size === 0) return;
    
    setOperationLoading(true);
    try {
      const result = await bulkDeleteVehicles(Array.from(selectedVehicles));
      
      if (result.success > 0) {
        toast.success(`Successfully deleted ${result.success} vehicles`);
        // Remove deleted vehicles from state
        setVehicles(prevVehicles => 
          prevVehicles.filter(v => !selectedVehicles.has(v.id))
        );
        // Clear selection
        setSelectedVehicles(new Set());
        setSelectAll(false);
        // Close modal
        setbulkDeleteModal({ isOpen: false, count: 0 });
        // Refresh activity logs
        setRefreshTrigger(prev => prev + 1);
      }
      
      if (result.failed > 0) {
        toast.warning(`Failed to delete ${result.failed} vehicles`);
      }
    } catch (error) {
      console.error('Error bulk deleting vehicles:', error);
      toast.error(`Error deleting vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle bulk archive vehicles
  const handleBulkArchiveVehicles = async () => {
    if (selectedVehicles.size === 0) return;
    
    setOperationLoading(true);
    try {
      const result = await bulkUpdateVehicles(
        Array.from(selectedVehicles),
        { status: 'archived' }
      );
      
      if (result.success > 0) {
        toast.success(`Successfully archived ${result.success} vehicles`);
        // Update archived vehicles in state
        setVehicles(prevVehicles => 
          prevVehicles.map(v => {
            if (selectedVehicles.has(v.id)) {
              return { ...v, status: 'archived' };
            }
            return v;
          })
        );
        // Clear selection
        setSelectedVehicles(new Set());
        setSelectAll(false);
        // Close modal
        setbulkArchiveModal({ isOpen: false, count: 0 });
        // Refresh activity logs
        setRefreshTrigger(prev => prev + 1);
      }
      
      if (result.failed > 0) {
        toast.warning(`Failed to archive ${result.failed} vehicles`);
      }
    } catch (error) {
      console.error('Error archiving vehicles:', error);
      toast.error(`Error archiving vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle assigning/unassigning a driver to a vehicle
  const handleAssignDriver = async () => {
    if (!driverAssignModal.vehicleId) return;
    
    setOperationLoading(true);
    try {
      const result = await updateVehicle(driverAssignModal.vehicleId, {
        primary_driver_id: driverAssignModal.driverId || null
      });
      
      if (result) {
        const action = driverAssignModal.driverId ? 'assigned to' : 'unassigned from';
        toast.success(`Driver successfully ${action} vehicle ${driverAssignModal.vehicleReg}`);
        
        // Update vehicle in state
        setVehicles(prevVehicles => 
          prevVehicles.map(v => {
            if (v.id === driverAssignModal.vehicleId) {
              return { ...v, primary_driver_id: driverAssignModal.driverId || null };
            }
            return v;
          })
        );
        
        // Close modal
        setDriverAssignModal({ isOpen: false });
        // Refresh activity logs
        setRefreshTrigger(prev => prev + 1);
      } else {
        const action = driverAssignModal.driverId ? 'assign' : 'unassign';
        toast.error(`Failed to ${action} driver to vehicle ${driverAssignModal.vehicleReg}`);
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error(`Error assigning driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle exporting vehicle data to CSV
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // Get vehicles to export (either selected or all filtered)
      const vehiclesToExport = selectedVehicles.size > 0
        ? vehicles.filter(v => selectedVehicles.has(v.id))
        : filteredVehicles;
      
      // Export the vehicle data
      const csvContent = await exportVehicleData(vehiclesToExport);
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `vehicle_data_${new Date().toISOString().split('T')[0]}.csv`);
      
      toast.success(`Successfully exported ${vehiclesToExport.length} vehicles`);
      // Refresh activity logs
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error exporting vehicle data:', error);
      toast.error(`Error exporting data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Filter vehicles based on current filters
  const filteredVehicles = vehicles.filter(vehicle => {
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchFields = [
        vehicle.registration_number,
        vehicle.make,
        vehicle.model,
        vehicle.chassis_number,
        vehicle.engine_number
      ].map(field => field?.toLowerCase());
      
      if (!searchFields.some(field => field?.includes(searchTerm))) {
        return false;
      }
    }
    
    // Filter by status
    if (filters.status !== 'all' && vehicle.status !== filters.status) {
      return false;
    }
    
    // Filter by type
    if (filters.type !== 'all' && vehicle.type !== filters.type) {
      return false;
    }
    
    return true;
  });

  // Get count of selected vehicles from filtered vehicles
  const selectedCount = filteredVehicles.reduce(
    (count, vehicle) => selectedVehicles.has(vehicle.id) ? count + 1 : count, 
    0
  );
  
  // Find driver name by id
  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'None';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown';
  };

  return (
    <Layout
      title="Vehicle Management"
      subtitle="Manage your vehicle fleet"
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
        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-4 justify-between">
            <div className="flex flex-wrap flex-1 gap-4">
              <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                <Input
                  placeholder="Search vehicles..."
                  icon={<Search className="h-4 w-4" />}
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <div className="w-40">
                <Select
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'stood', label: 'Stood' },
                    { value: 'archived', label: 'Archived' }
                  ]}
                  value={filters.status}
                  onChange={e => setFilters({ ...filters, status: e.target.value })}
                />
              </div>
              
              <div className="w-40">
                <Select
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'truck', label: 'Truck' },
                    { value: 'tempo', label: 'Tempo' },
                    { value: 'trailer', label: 'Trailer' },
                    { value: 'pickup', label: 'Pickup' },
                    { value: 'van', label: 'Van' }
                  ]}
                  value={filters.type}
                  onChange={e => setFilters({ ...filters, type: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportData}
                icon={<Download className="h-4 w-4" />}
                isLoading={exportLoading}
              >
                Export
              </Button>
              
              {selectedVehicles.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setbulkArchiveModal({ isOpen: true, count: selectedVehicles.size })}
                    icon={<Archive className="h-4 w-4" />}
                  >
                    Archive Selected
                  </Button>
                  
                  <Button
                    variant="danger"
                    onClick={() => setbulkDeleteModal({ isOpen: true, count: selectedVehicles.size })}
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Delete Selected
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Selected count */}
          {selectedCount > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              {selectedCount} of {filteredVehicles.length} vehicles selected
            </div>
          )}
        </div>

        {/* Vehicles Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 text-gray-600">Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">No vehicles found</p>
              <p className="text-gray-500 mt-1">Try adjusting your filters or add new vehicles</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <button
                        className="flex items-center"
                        onClick={handleSelectAll}
                        aria-label={selectAll ? "Deselect all vehicles" : "Select all vehicles"}
                      >
                        {selectAll ? (
                          <CheckSquare className="h-4 w-4 text-primary-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Make / Model
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odometer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Driver
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trips
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map(vehicle => (
                  <tr 
                    key={vehicle.id}
                    className={`hover:bg-gray-50 ${selectedVehicles.has(vehicle.id) ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        className="flex items-center"
                        onClick={() => handleSelectVehicle(vehicle.id)}
                        aria-label={selectedVehicles.has(vehicle.id) ? "Deselect vehicle" : "Select vehicle"}
                      >
                        {selectedVehicles.has(vehicle.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium text-primary-600 hover:underline cursor-pointer" 
                          onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
                          {vehicle.registration_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{vehicle.make}</div>
                        <div className="text-gray-500">{vehicle.model}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{vehicle.type}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full capitalize ${
                        vehicle.status === 'active' 
                          ? 'bg-success-100 text-success-800' 
                          : vehicle.status === 'maintenance'
                          ? 'bg-warning-100 text-warning-800'
                          : vehicle.status === 'archived'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.current_odometer?.toLocaleString()} km
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button 
                        className="flex items-center text-sm text-gray-900 hover:text-primary-600"
                        onClick={() => setDriverAssignModal({ 
                          isOpen: true,
                          vehicleId: vehicle.id,
                          vehicleReg: vehicle.registration_number,
                          driverId: vehicle.primary_driver_id
                        })}
                      >
                        {vehicle.primary_driver_id ? (
                          <>
                            <span>{getDriverName(vehicle.primary_driver_id)}</span>
                            <UserX className="h-4 w-4 ml-1 text-gray-400 hover:text-error-500" />
                          </>
                        ) : (
                          <>
                            <span>Assign</span>
                            <UserPlus className="h-4 w-4 ml-1 text-gray-400 hover:text-primary-500" />
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.stats?.totalTrips || 0}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setDeleteModal({ 
                            isOpen: true,
                            vehicleId: vehicle.id,
                            vehicleReg: vehicle.registration_number
                          })}
                          className="text-error-600 hover:text-error-900"
                          aria-label={`Delete vehicle ${vehicle.registration_number}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Vehicle Activity Log */}
        <VehicleActivityLogTable limit={10} refreshTrigger={refreshTrigger} />

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={deleteModal.isOpen}
          title="Delete Vehicle"
          message={`Are you sure you want to delete vehicle ${deleteModal.vehicleReg}? This action cannot be undone and will permanently remove the vehicle from the system.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteVehicle}
          onCancel={() => setDeleteModal({ isOpen: false })}
          type="delete"
          isLoading={operationLoading}
        />

        <ConfirmationModal
          isOpen={bulkDeleteModal.isOpen}
          title="Delete Selected Vehicles"
          message={`Are you sure you want to delete ${bulkDeleteModal.count} selected vehicles? This action cannot be undone and will permanently remove these vehicles from the system.`}
          confirmText="Delete All"
          cancelText="Cancel"
          onConfirm={handleBulkDeleteVehicles}
          onCancel={() => setbulkDeleteModal({ isOpen: false, count: 0 })}
          type="delete"
          isLoading={operationLoading}
        />

        <ConfirmationModal
          isOpen={bulkArchiveModal.isOpen}
          title="Archive Selected Vehicles"
          message={`Are you sure you want to archive ${bulkArchiveModal.count} selected vehicles? Archived vehicles will be hidden from regular views but can be restored later.`}
          confirmText="Archive All"
          cancelText="Cancel"
          onConfirm={handleBulkArchiveVehicles}
          onCancel={() => setbulkArchiveModal({ isOpen: false, count: 0 })}
          type="archive"
          isLoading={operationLoading}
        />
        
        {/* Driver Assignment Modal */}
        <div className={`fixed z-50 inset-0 overflow-y-auto ${driverAssignModal.isOpen ? 'block' : 'hidden'}`} aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={() => setDriverAssignModal({ isOpen: false })}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
                    <UserPlus className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {driverAssignModal.driverId ? 'Change' : 'Assign'} Driver
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {driverAssignModal.driverId
                          ? `Select a new driver for vehicle ${driverAssignModal.vehicleReg} or unassign the current one.`
                          : `Assign a driver to vehicle ${driverAssignModal.vehicleReg}.`}
                      </p>
                      
                      <div className="mt-4">
                        <Select
                          label="Driver"
                          options={[
                            { value: '', label: 'Unassign Driver' },
                            ...drivers
                              .filter(d => d.status === 'active')
                              .map(d => ({
                                value: d.id,
                                label: d.name
                              }))
                          ]}
                          value={driverAssignModal.driverId || ''}
                          onChange={e => setDriverAssignModal({
                            ...driverAssignModal,
                            driverId: e.target.value || undefined
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={handleAssignDriver}
                  className="sm:ml-3"
                  isLoading={operationLoading}
                >
                  {driverAssignModal.driverId ? 'Update Driver' : 'Assign Driver'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDriverAssignModal({ isOpen: false })}
                  className="mt-3 sm:mt-0"
                  disabled={operationLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VehicleManagementPage;