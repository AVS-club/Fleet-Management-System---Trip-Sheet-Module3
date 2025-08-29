import React, { useState, useEffect } from 'react';
import { getVehicles } from '../../utils/storage';
import { getAllVehicleActivityLogs, VehicleActivityLog } from '../../utils/vehicleActivity';
import { Clock, UserCircle, Truck, Filter, Search, RefreshCw } from 'lucide-react';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { format, isValid } from 'date-fns';

interface VehicleActivityLogTableProps {
  limit?: number;
  vehicleId?: string;
  refreshTrigger?: number;
}

interface VehicleActivityLogWithVehicle extends VehicleActivityLog {
  vehicles: {
    registration_number: string;
  };
}

const VehicleActivityLogTable: React.FC<VehicleActivityLogTableProps> = ({ 
  limit,
  vehicleId,
  refreshTrigger = 0
}) => {
  const [logs, setLogs] = useState<VehicleActivityLogWithVehicle[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; registration_number: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    actionType: '',
    vehicleFilter: vehicleId || '',
    search: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let fetchedLogs;
      if (vehicleId) {
        // If vehicleId is provided, only fetch logs for that vehicle
        const vehicleLogs = await getAllVehicleActivityLogs();
        fetchedLogs = vehicleLogs.filter(log => log.vehicle_id === vehicleId) as VehicleActivityLogWithVehicle[];
        
        // Add vehicle registration info
        const vehicle = await getVehicles();
        const vehicleMap = new Map(vehicle.map(v => [v.id, v]));
        
        fetchedLogs = fetchedLogs.map(log => ({
          ...log,
          vehicles: {
            registration_number: vehicleMap.get(log.vehicle_id)?.registration_number || 'Unknown'
          }
        }));
      } else {
        // Otherwise fetch all logs with vehicle info
        fetchedLogs = await getAllVehicleActivityLogs(limit) as VehicleActivityLogWithVehicle[];
      }
      
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching vehicle activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const vehiclesData = await getVehicles();
      setVehicles(
        vehiclesData.map(vehicle => ({
          id: vehicle.id,
          registration_number: vehicle.registration_number
        }))
      );
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!vehicleId) {
      fetchVehicles();
    }
  }, [vehicleId, limit, refreshTrigger]);

  const handleRefresh = () => {
    fetchLogs();
  };

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    if (filters.actionType && log.action_type !== filters.actionType) {
      return false;
    }
    
    if (filters.vehicleFilter && log.vehicle_id !== filters.vehicleFilter) {
      return false;
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        log.action_by?.toLowerCase().includes(searchTerm) ||
        log.notes?.toLowerCase().includes(searchTerm) ||
        log.action_type.toLowerCase().includes(searchTerm) ||
        log.vehicles?.registration_number.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'Invalid Date';
      
      return format(date, 'dd MMM yyyy, HH:mm');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'deleted':
      case 'permanently_deleted':
        return 'bg-error-100 text-error-800';
      case 'archived':
        return 'bg-warning-100 text-warning-800';
      case 'assigned_driver':
        return 'bg-success-100 text-success-800';
      case 'unassigned_driver':
        return 'bg-blue-100 text-blue-800';
      case 'exported':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Vehicle Activity Log</h3>
        <p className="mt-1 text-sm text-gray-500">
          Track all changes to vehicles including deletions, archiving, and driver assignments
        </p>
      </div>

      <div className="p-4 border-b border-gray-200 space-y-4">
        <div className="flex flex-wrap gap-3">
          {!vehicleId && (
            <div className="w-60">
              <Select
                label="Vehicle"
                options={[
                  { value: '', label: 'All Vehicles' },
                  ...vehicles.map(v => ({ 
                    value: v.id, 
                    label: v.registration_number 
                  }))
                ]}
                value={filters.vehicleFilter}
                onChange={e => setFilters({ ...filters, vehicleFilter: e.target.value })}
              />
            </div>
          )}
          
          <div className="w-60">
            <Select
              label="Action Type"
              options={[
                { value: '', label: 'All Actions' },
                { value: 'deleted', label: 'Deleted' },
                { value: 'archived', label: 'Archived' },
                { value: 'assigned_driver', label: 'Driver Assigned' },
                { value: 'unassigned_driver', label: 'Driver Unassigned' },
                { value: 'updated', label: 'Updated' },
                { value: 'exported', label: 'Exported' },
                { value: 'permanently_deleted', label: 'Permanently Deleted' }
              ]}
              value={filters.actionType}
              onChange={e => setFilters({ ...filters, actionType: e.target.value })}
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Search"
              placeholder="Search by user or notes..."
              icon={<Search className="h-4 w-4" />}
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              icon={<RefreshCw className="h-4 w-4" />}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scroll-indicator">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {!vehicleId && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={vehicleId ? 4 : 5} className="px-6 py-4 whitespace-nowrap">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={vehicleId ? 4 : 5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  No activity logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  {!vehicleId && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {log.vehicles?.registration_number || 'Unknown'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getActionTypeColor(log.action_type)}`}>
                      {formatActionType(log.action_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserCircle className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">{log.action_by}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    <p className="text-sm text-gray-500 max-w-sm">{log.notes || '-'}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {limit && filteredLogs.length >= limit && (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {limit} most recent logs. There may be more records available.
          </p>
        </div>
      )}
    </div>
  );
};

export default VehicleActivityLogTable;