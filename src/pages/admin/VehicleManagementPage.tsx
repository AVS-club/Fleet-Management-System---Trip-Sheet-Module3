import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/layout/Layout"; 
import {
  getVehicles,
  getVehicleStats,
  getDrivers,
  updateVehicle,
  bulkUpdateVehicles,
  bulkArchiveVehicles,
  bulkUnarchiveVehicles,
  deleteVehicle,
  exportVehicleData,
} from "../../utils/storage";
import { hardDeleteVehicle } from "../../utils/storage";
import {
  Truck,
  ChevronLeft,
  Trash2,
  Archive,
  ArchiveRestore,
  Download,
  UserPlus,
  UserX,
  CheckSquare,
  Square,
  Search,
  Filter,
  Eye,
  Activity,
  BarChart2,
  Edit,
  X,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { Vehicle, Driver } from "../../types";
import ConfirmationModal from "../../components/admin/ConfirmationModal";
import VehicleActivityLogTable from "../../components/admin/VehicleActivityLogTable";
import VehicleForm from "../../components/vehicles/VehicleForm";
import { toast } from "react-toastify";
import { saveAs } from "file-saver";
import { X } from "lucide-react";

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
  const [user, setUser] = useState<any>();
  // State for vehicle filtering
  const [filters, setFilters] = useState({
    search: "",
    status: "active", // Default to 'active' to hide archived vehicles by default
    type: "all",
  });

  // State for bulk selection
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);

  // State for editing vehicle
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // State for confirmation modals
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    vehicleId?: string;
    vehicleReg?: string;
  }>({
    isOpen: false,
  });
  const [permanentDeleteModal, setPermanentDeleteModal] = useState<{
    isOpen: boolean;
    vehicleId?: string;
    vehicleReg?: string;
    relatedData?: {
      tripsCount: number;
      maintenanceCount: number;
      driversAssigned: number;
      activityLogs: number;
    };
  }>({
    isOpen: false,
  });
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    vehicleId?: string;
    vehicleReg?: string;
  }>({
    isOpen: false,
  });
  const [unarchiveModal, setUnarchiveModal] = useState<{
    isOpen: boolean;
    vehicleId?: string;
    vehicleReg?: string;
  }>({
    isOpen: false,
  });
  const [bulkArchiveModal, setbulkArchiveModal] = useState<{
    isOpen: boolean;
    count: number;
  }>({
    isOpen: false,
    count: 0,
  });
  const [bulkUnarchiveModal, setbulkUnarchiveModal] = useState<{
    isOpen: boolean;
    count: number;
  }>({
    isOpen: false,
    count: 0,
  });

  // State for driver assignment
  const [driverAssignModal, setDriverAssignModal] = useState<{
    isOpen: boolean;
    vehicleId?: string;
    vehicleReg?: string;
    driverId?: string;
  }>({
    isOpen: false,
  });

  // State for operation loading
  const [operationLoading, setOperationLoading] = useState(false);

  // Fetch vehicles and drivers data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userdetails = localStorage.getItem("user");
        if (!userdetails) throw new Error("Cannot get user details");
        const user = JSON.parse(userdetails);
        if (user) setUser(user);
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
        console.error("Error fetching data:", error);
        toast.error("Failed to load vehicle data");
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
      const filteredVehicleIds = filteredVehicles.map((v) => v.id);
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
      filteredVehicles.every((v) => newSelected.has(v.id)) &&
        filteredVehicles.length > 0
    );
  };

  // Handle archiving a single vehicle
  const handleArchiveVehicle = async () => {
    if (!archiveModal.vehicleId) return;

    setOperationLoading(true);
    try {
      const result = await updateVehicle(
        archiveModal.vehicleId,
        {
          status: "archived",
        },
        user.id
      );

      if (result) {
        toast.success(
          `Vehicle ${archiveModal.vehicleReg} archived successfully`
        );
        // Update in state
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (v.id === archiveModal.vehicleId) {
              return { ...v, status: "archived" };
            }
            return v;
          })
        );
        // Close modal
        setArchiveModal({ isOpen: false });
        // Refresh activity logs
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(`Failed to archive vehicle ${archiveModal.vehicleReg}`);
      }
    } catch (error) {
      console.error("Error archiving vehicle:", error);
      toast.error(
        `Error archiving vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle unarchiving a single vehicle
  const handleUnarchiveVehicle = async () => {
    if (!unarchiveModal.vehicleId) return;

    setOperationLoading(true);
    try {
      const result = await updateVehicle(unarchiveModal.vehicleId, {
        status: "active",
      });

      if (result) {
        toast.success(
          `Vehicle ${unarchiveModal.vehicleReg} unarchived successfully`
        );
        // Update in state
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (v.id === unarchiveModal.vehicleId) {
              return { ...v, status: "active" };
            }
            return v;
          })
        );
        // Close modal
        setUnarchiveModal({ isOpen: false });
        // Refresh activity logs
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(`Failed to unarchive vehicle ${unarchiveModal.vehicleReg}`);
      }
    } catch (error) {
      console.error("Error unarchiving vehicle:", error);
      toast.error(
        `Error unarchiving vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle deleting a single vehicle (now redirected to archive)
  const handleDeleteVehicle = async () => {
    if (!deleteModal.vehicleId) return;

    setOperationLoading(true);
    try {
      const success = await archiveVehicle(deleteModal.vehicleId, user?.id);

      if (success) {
        toast.success(
          `Vehicle ${deleteModal.vehicleReg} archived successfully`
        );
        // Update in state
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (v.id === deleteModal.vehicleId) {
              return { ...v, status: "archived" };
            }
            return v;
          })
        );
        // Close modal
        setDeleteModal({ isOpen: false });
        // Refresh activity logs
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(`Failed to archive vehicle ${deleteModal.vehicleReg}`);
      }
    } catch (error) {
      console.error("Error archiving vehicle:", error);
      toast.error(
        `Error archiving vehicle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle permanent deletion of a vehicle
  const handlePermanentDeleteVehicle = async () => {
    if (!permanentDeleteModal.vehicleId) return;

    setOperationLoading(true);
    try {
      const result = await hardDeleteVehicle(permanentDeleteModal.vehicleId, user?.id || 'unknown');

      if (result.success) {
        toast.success(`Vehicle ${permanentDeleteModal.vehicleReg} permanently deleted`);
        
        // Remove the vehicle from state completely
        setVehicles(prevVehicles => 
          prevVehicles.filter(v => v.id !== permanentDeleteModal.vehicleId)
        );
        
        // Update counts
        setTotalVehicles(prev => prev - 1);
        
        // Close modal
        setPermanentDeleteModal({ isOpen: false });
        
        // Refresh activity logs
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(`Failed to permanently delete vehicle: ${result.error}`);
      }
    } catch (error) {
      console.error('Error permanently deleting vehicle:', error);
      toast.error(`Error permanently deleting vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle opening permanent delete confirmation
  const handleOpenPermanentDelete = async (vehicleId: string, vehicleReg: string) => {
    try {
      // Get related data count before showing the modal
      const { data: dependencies } = await supabase
        .rpc('count_vehicle_dependencies', { vehicle_uuid: vehicleId });
      
      const relatedData = dependencies?.[0] ? {
        tripsCount: Number(dependencies[0].trips_count),
        maintenanceCount: Number(dependencies[0].maintenance_count),
        driversAssigned: Number(dependencies[0].drivers_assigned),
        activityLogs: Number(dependencies[0].activity_logs)
      } : {
        tripsCount: 0,
        maintenanceCount: 0,
        driversAssigned: 0,
        activityLogs: 0
      };

      setPermanentDeleteModal({
        isOpen: true,
        vehicleId,
        vehicleReg,
        relatedData
      });
    } catch (error) {
      console.error('Error fetching vehicle dependencies:', error);
      toast.error('Failed to check vehicle dependencies');
    }
  };

  // Handle bulk archive vehicles
  const handleBulkArchiveVehicles = async () => {
    if (selectedVehicles.size === 0) return;

    setOperationLoading(true);
    try {
      const result = await bulkArchiveVehicles(Array.from(selectedVehicles));

      if (result.success > 0) {
        toast.success(`Successfully archived ${result.success} vehicles`);
        // Update archived vehicles in state
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (selectedVehicles.has(v.id)) {
              return { ...v, status: "archived" };
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
        setRefreshTrigger((prev) => prev + 1);
      }

      if (result.failed > 0) {
        toast.warning(`Failed to archive ${result.failed} vehicles`);
      }
    } catch (error) {
      console.error("Error archiving vehicles:", error);
      toast.error(
        `Error archiving vehicles: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle bulk unarchive vehicles
  const handleBulkUnarchiveVehicles = async () => {
    if (selectedVehicles.size === 0) return;

    setOperationLoading(true);
    try {
      const result = await bulkUnarchiveVehicles(Array.from(selectedVehicles));

      if (result.success > 0) {
        toast.success(`Successfully unarchived ${result.success} vehicles`);
        // Update unarchived vehicles in state
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (selectedVehicles.has(v.id)) {
              return { ...v, status: "active" };
            }
            return v;
          })
        );
        // Clear selection
        setSelectedVehicles(new Set());
        setSelectAll(false);
        // Close modal
        setbulkUnarchiveModal({ isOpen: false, count: 0 });
        // Refresh activity logs
        setRefreshTrigger((prev) => prev + 1);
      }

      if (result.failed > 0) {
        toast.warning(`Failed to unarchive ${result.failed} vehicles`);
      }
    } catch (error) {
      console.error("Error unarchiving vehicles:", error);
      toast.error(
        `Error unarchiving vehicles: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
        primary_driver_id: driverAssignModal.driverId || null,
      });

      if (result) {
        const action = driverAssignModal.driverId
          ? "assigned to"
          : "unassigned from";
        toast.success(
          `Driver successfully ${action} vehicle ${driverAssignModal.vehicleReg}`
        );

        // Update vehicle in state
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (v.id === driverAssignModal.vehicleId) {
              return {
                ...v,
                primary_driver_id: driverAssignModal.driverId || null,
              };
            }
            return v;
          })
        );

        // Close modal
        setDriverAssignModal({ isOpen: false });
        // Refresh activity logs
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const action = driverAssignModal.driverId ? "assign" : "unassign";
        toast.error(
          `Failed to ${action} driver to vehicle ${driverAssignModal.vehicleReg}`
        );
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error(
        `Error assigning driver: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle exporting vehicle data to CSV
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // Get vehicles to export (either selected or all filtered)
      const vehiclesToExport =
        selectedVehicles.size > 0
          ? vehicles.filter((v) => selectedVehicles.has(v.id))
          : filteredVehicles;

      // Export the vehicle data
      const csvContent = await exportVehicleData(vehiclesToExport);

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(
        blob,
        `vehicle_data_${new Date().toISOString().split("T")[0]}.csv`
      );

      toast.success(
        `Successfully exported ${vehiclesToExport.length} vehicles`
      );
      // Refresh activity logs
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error exporting vehicle data:", error);
      toast.error(
        `Error exporting data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setExportLoading(false);
    }
  };

  // Handle editing a vehicle
  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
  };

  // Handle updating a vehicle
  const handleUpdateVehicle = async (data: Omit<Vehicle, "id">) => {
    if (!editingVehicle) return;

    setIsEditSubmitting(true);
    try {
      const updatedVehicle = await updateVehicle(editingVehicle.id, data, user?.id || 'unknown');
      
      if (updatedVehicle) {
        // Update the vehicle in the local state
        setVehicles(prevVehicles =>
          prevVehicles.map(v => 
            v.id === editingVehicle.id 
              ? { ...updatedVehicle, stats: v.stats } // Preserve stats
              : v
          )
        );
        
        setEditingVehicle(null);
        toast.success(`Vehicle ${updatedVehicle.registration_number} updated successfully`);
        
        // Refresh activity logs
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error('Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error(`Error updating vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Filter vehicles based on current filters
  const filteredVehicles = vehicles.filter((vehicle) => {
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchFields = [
        vehicle.registration_number,
        vehicle.make,
        vehicle.model,
        vehicle.chassis_number,
        vehicle.engine_number,
      ].map((field) => field?.toLowerCase());

      if (!searchFields.some((field) => field?.includes(searchTerm))) {
        return false;
      }
    }

    // Filter by status
    if (filters.status !== "all" && vehicle.status !== filters.status) {
      return false;
    }

    // Filter by type
    if (filters.type !== "all" && vehicle.type !== filters.type) {
      return false;
    }

    return true;
  });

  // Get count of selected vehicles from filtered vehicles
  const selectedCount = filteredVehicles.reduce(
    (count, vehicle) => (selectedVehicles.has(vehicle.id) ? count + 1 : count),
    0
  );

  // Find driver name by id
  const getDriverName = (driverId?: string) => {
    if (!driverId) return "None";
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : "Unknown";
  };

  // Check if a driver is actually assigned to this vehicle
  const isDriverAssigned = (vehicle: Vehicle) => {
    return vehicle.primary_driver_id && vehicle.primary_driver_id.trim() !== '';
  };

  // Calculate stats for archived vs. active vehicles
  const archivedCount = vehicles.filter((v) => v.status === "archived").length;
  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const totalCount = vehicles.length;
  const archivedPercentage =
    totalCount > 0 ? Math.round((archivedCount / totalCount) * 100) : 0;

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Truck className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Vehicle Management</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Manage your vehicle fleet</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/admin")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Admin
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Vehicles</p>
                <p className="text-xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <Truck className="h-8 w-8 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Vehicles</p>
                <p className="text-xl font-bold text-green-600">
                  {activeCount}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Archived Vehicles</p>
                <p className="text-xl font-bold text-gray-600">
                  {archivedCount}
                </p>
              </div>
              <Archive className="h-8 w-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Archive Ratio</p>
                <p className="text-xl font-bold text-primary-600">
                  {archivedPercentage}%
                </p>
              </div>
              <BarChart2 className="h-8 w-8 text-primary-500" />
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-4 justify-between border-l-2 border-blue-500 pl-2">
            <div className="flex flex-wrap flex-1 gap-4">
              <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                <Input
                  placeholder="Search vehicles..."
                  icon={<Search className="h-4 w-4" />}
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>

              <div className="w-40">
                <Select
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "active", label: "Active" },
                    { value: "maintenance", label: "Maintenance" },
                    { value: "inactive", label: "Inactive" },
                    { value: "stood", label: "Stood" },
                    { value: "archived", label: "Archived" },
                  ]}
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                />
              </div>

              <div className="w-40">
                <Select
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "truck", label: "Truck" },
                    { value: "tempo", label: "Tempo" },
                    { value: "trailer", label: "Trailer" },
                    { value: "pickup", label: "Pickup" },
                    { value: "van", label: "Van" },
                  ]}
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
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
                  {filters.status === "archived" ? (
                    <Button
                      variant="primary"
                      onClick={() =>
                        setbulkUnarchiveModal({
                          isOpen: true,
                          count: selectedVehicles.size,
                        })
                      }
                      icon={<ArchiveRestore className="h-4 w-4" />}
                    >
                      Unarchive Selected
                    </Button>
                  ) : (
                    <Button
                      variant="warning"
                      onClick={() =>
                        setbulkArchiveModal({
                          isOpen: true,
                          count: selectedVehicles.size,
                        })
                      }
                      icon={<Archive className="h-4 w-4" />}
                    >
                      Archive Selected
                    </Button>
                  )}
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
              <p className="text-lg font-medium text-gray-900">
                No vehicles found
              </p>
              <p className="text-gray-500 mt-1">
                Try adjusting your filters or add new vehicles
              </p>
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
                        aria-label={
                          selectAll
                            ? "Deselect all vehicles"
                            : "Select all vehicles"
                        }
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
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className={`hover:bg-gray-50 ${
                      selectedVehicles.has(vehicle.id) ? "bg-primary-50" : ""
                    } ${vehicle.status === "archived" ? "text-gray-400" : ""}`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        className="flex items-center"
                        onClick={() => handleSelectVehicle(vehicle.id)}
                        aria-label={
                          selectedVehicles.has(vehicle.id)
                            ? "Deselect vehicle"
                            : "Select vehicle"
                        }
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
                        <span
                          className={`font-medium hover:underline cursor-pointer ${
                            vehicle.status === "archived"
                              ? "text-gray-500"
                              : "text-primary-600"
                          }`}
                          onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                        >
                          {vehicle.registration_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div
                          className={`font-medium ${
                            vehicle.status === "archived"
                              ? "text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {vehicle.make}
                        </div>
                        <div
                          className={`${
                            vehicle.status === "archived"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {vehicle.model}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm capitalize ${
                          vehicle.status === "archived"
                            ? "text-gray-500"
                            : "text-gray-900"
                        }`}
                      >
                        {vehicle.type}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full capitalize ${
                          vehicle.status === "active"
                            ? "bg-success-100 text-success-800"
                            : vehicle.status === "maintenance"
                            ? "bg-warning-100 text-warning-800"
                            : vehicle.status === "archived"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={
                          vehicle.status === "archived" ? "text-gray-500" : ""
                        }
                      >
                        {vehicle.current_odometer?.toLocaleString()} km
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        className={`flex items-center text-sm ${
                          vehicle.status === "archived"
                            ? "text-gray-500"
                            : "text-gray-900 hover:text-primary-600"
                        }`}
                        onClick={() =>
                          setDriverAssignModal({
                            isOpen: true,
                            vehicleId: vehicle.id,
                            vehicleReg: vehicle.registration_number,
                            driverId: vehicle.primary_driver_id,
                          })
                        }
                        disabled={vehicle.status === "archived"}
                      >
                        {isDriverAssigned(vehicle) ? (
                          <>
                            <span>
                              {getDriverName(vehicle.primary_driver_id)}
                            </span>
                            {vehicle.status !== "archived" && (
                              <UserX className="h-4 w-4 ml-1 text-gray-400 hover:text-error-500" />
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400">Unassigned</span>
                            {vehicle.status !== "archived" && (
                              <UserPlus className="h-4 w-4 ml-1 text-gray-400 hover:text-primary-500" />
                            )}
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={
                          vehicle.status === "archived" ? "text-gray-500" : ""
                        }
                      >
                        {vehicle.stats?.totalTrips || 0}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                          aria-label={`View vehicle ${vehicle.registration_number}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`Edit vehicle ${vehicle.registration_number}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {vehicle.status === "archived" ? (
                          <button
                            onClick={() =>
                              setUnarchiveModal({
                                isOpen: true,
                                vehicleId: vehicle.id,
                                vehicleReg: vehicle.registration_number,
                              })
                            }
                            className="text-success-600 hover:text-success-900"
                            aria-label={`Unarchive vehicle ${vehicle.registration_number}`}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setArchiveModal({
                                isOpen: true,
                                vehicleId: vehicle.id,
                                vehicleReg: vehicle.registration_number,
                              })
                            }
                            className="text-warning-600 hover:text-warning-900"
                            aria-label={`Archive vehicle ${vehicle.registration_number}`}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenPermanentDelete(vehicle.id, vehicle.registration_number)}
                          className="text-error-600 hover:text-error-900"
                          aria-label={`Permanently delete vehicle ${vehicle.registration_number}`}
                          title="Permanently delete (irreversible)"
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

        {/* Vehicle Edit Modal */}
        {editingVehicle && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Vehicle: {editingVehicle.registration_number}
                </h2>
                <button
                  onClick={() => setEditingVehicle(null)}
                  className="text-gray-400 hover:text-gray-500"
                  disabled={isEditSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <VehicleForm
                  initialData={editingVehicle}
                  onSubmit={handleUpdateVehicle}
                  onCancel={() => setEditingVehicle(null)}
                  isSubmitting={isEditSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modals */} 
        <ConfirmationModal
          isOpen={deleteModal.isOpen}
          title="Archive Vehicle"
          message={`Are you sure you want to archive vehicle ${deleteModal.vehicleReg}? The vehicle will be hidden from regular views but can be restored later.`}
          confirmText="Archive"
          cancelText="Cancel"
          onConfirm={handleDeleteVehicle}
          onCancel={() => setDeleteModal({ isOpen: false })}
          type="archive"
          isLoading={operationLoading}
        />

        {/* Permanent Delete Confirmation Modal */}
        <div className={`fixed z-50 inset-0 overflow-y-auto ${permanentDeleteModal.isOpen ? 'block' : 'hidden'}`}>
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setPermanentDeleteModal({ isOpen: false })}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-error-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-error-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Permanently Delete Vehicle
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-3">
                        <strong className="text-error-600">WARNING:</strong> This action cannot be undone. 
                        Vehicle <strong>{permanentDeleteModal.vehicleReg}</strong> and all related data will be permanently removed.
                      </p>
                      
                      {permanentDeleteModal.relatedData && (
                        <div className="bg-error-50 border border-error-200 rounded-md p-3 mb-3">
                          <h4 className="text-sm font-medium text-error-800 mb-2">Data that will be permanently deleted:</h4>
                          <ul className="text-xs text-error-700 space-y-1">
                            <li>• <strong>{permanentDeleteModal.relatedData.tripsCount}</strong> trip records</li>
                            <li>• <strong>{permanentDeleteModal.relatedData.maintenanceCount}</strong> maintenance tasks</li>
                            <li>• <strong>{permanentDeleteModal.relatedData.activityLogs}</strong> activity log entries</li>
                            {permanentDeleteModal.relatedData.driversAssigned > 0 && (
                              <li>• <strong>{permanentDeleteModal.relatedData.driversAssigned}</strong> drivers will be unassigned</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500">
                        Consider archiving instead if you might need this data later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={handlePermanentDeleteVehicle}
                  className="w-full sm:w-auto sm:ml-3"
                  variant="danger"
                  isLoading={operationLoading}
                >
                  Permanently Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPermanentDeleteModal({ isOpen: false })}
                  className="mt-3 sm:mt-0 w-full sm:w-auto"
                  disabled={operationLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
        <ConfirmationModal
          isOpen={archiveModal.isOpen}
          title="Archive Vehicle"
          message={`Are you sure you want to archive vehicle ${archiveModal.vehicleReg}? The vehicle will be hidden from regular views but can be restored later.`}
          confirmText="Archive"
          cancelText="Cancel"
          onConfirm={handleArchiveVehicle}
          onCancel={() => setArchiveModal({ isOpen: false })}
          type="archive"
          isLoading={operationLoading}
        />

        <ConfirmationModal
          isOpen={unarchiveModal.isOpen}
          title="Unarchive Vehicle"
          message={`Are you sure you want to unarchive vehicle ${unarchiveModal.vehicleReg}? The vehicle will be restored to active status and visible in regular views.`}
          confirmText="Unarchive"
          cancelText="Cancel"
          onConfirm={handleUnarchiveVehicle}
          onCancel={() => setUnarchiveModal({ isOpen: false })}
          type="info"
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

        <ConfirmationModal
          isOpen={bulkUnarchiveModal.isOpen}
          title="Unarchive Selected Vehicles"
          message={`Are you sure you want to unarchive ${bulkUnarchiveModal.count} selected vehicles? These vehicles will be set to active status and visible in regular views.`}
          confirmText="Unarchive All"
          cancelText="Cancel"
          onConfirm={handleBulkUnarchiveVehicles}
          onCancel={() => setbulkUnarchiveModal({ isOpen: false, count: 0 })}
          type="info"
          isLoading={operationLoading}
        />

        {/* Driver Assignment Modal */}
        <div
          className={`fixed z-50 inset-0 overflow-y-auto ${
            driverAssignModal.isOpen ? "block" : "hidden"
          }`}
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
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
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900"
                      id="modal-title"
                    >
                      {driverAssignModal.driverId ? "Change" : "Assign"} Driver
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
                            { value: "", label: "Unassign Driver" },
                            ...drivers
                              .filter((d) => d.status === "active")
                              .map((d) => ({
                                value: d.id,
                                label: d.name,
                              })),
                          ]}
                          value={driverAssignModal.driverId || ""}
                          onChange={(e) =>
                            setDriverAssignModal({
                              ...driverAssignModal,
                              driverId: e.target.value || undefined,
                            })
                          }
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
                  {driverAssignModal.driverId
                    ? "Update Driver"
                    : "Assign Driver"}
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
