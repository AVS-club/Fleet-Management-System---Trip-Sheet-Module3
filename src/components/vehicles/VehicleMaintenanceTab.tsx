import React, { useState, useEffect } from 'react';
import { PenTool as Tool, AlertTriangle, TrendingUp, Award, Clock } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { createLogger } from '../../utils/logger';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-toastify';
import { getVendors } from '../../utils/vendorStorage';

const logger = createLogger('VehicleMaintenanceTab');

interface VehicleMaintenanceTabProps {
  vehicleId: string;
}

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  description: string;
  maintenance_date: string;
  cost: number;
  vendor_name: string;
}

const VehicleMaintenanceTab: React.FC<VehicleMaintenanceTabProps> = ({
  vehicleId
}) => {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [totals, setTotals] = useState({
    totalCost: 0,
    totalRecords: 0,
    avgCostPerMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleId) {
      loadMaintenanceData();
    }
  }, [vehicleId]);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch maintenance tasks for this vehicle
      const { data: tasks, error: tasksError } = await supabase
        .from('maintenance_tasks')
        .select('*, service_groups:maintenance_service_tasks(*)')
        .eq('vehicle_id', vehicleId)
        .order('start_date', { ascending: false });

      if (tasksError) {
        throw new Error(`Failed to fetch maintenance tasks: ${tasksError.message}`);
      }

      if (!tasks || tasks.length === 0) {
        setMaintenance([]);
        setTotals({ totalCost: 0, totalRecords: 0, avgCostPerMonth: 0 });
        return;
      }

      // Fetch vendors to get vendor names
      const vendors = await getVendors();
      const vendorsMap = new Map(vendors.map(v => [v.id, v.vendor_name]));

      // Transform tasks to MaintenanceRecord format
      const records: MaintenanceRecord[] = [];

      for (const task of tasks) {
        const serviceGroups = task.service_groups || [];
        
        // If task has service groups, create a record for each group
        if (serviceGroups.length > 0) {
          for (const group of serviceGroups) {
            const vendorName = group.vendor_id 
              ? (vendorsMap.get(group.vendor_id) || 'Unknown Vendor')
              : 'No Vendor';
            
            const taskTitle = Array.isArray(task.title) 
              ? task.title.join(', ') 
              : (task.title || task.task_type || 'Maintenance');
            
            records.push({
              id: `${task.id}-${group.id || Date.now()}`,
              maintenance_type: taskTitle,
              description: task.description || group.notes || 'No description',
              maintenance_date: task.start_date || task.created_at,
              cost: group.service_cost || group.cost || task.total_cost || 0,
              vendor_name: vendorName
            });
          }
        } else {
          // If no service groups, create a single record from the task
          const taskTitle = Array.isArray(task.title) 
            ? task.title.join(', ') 
            : (task.title || task.task_type || 'Maintenance');
          
          records.push({
            id: task.id,
            maintenance_type: taskTitle,
            description: task.description || 'No description',
            maintenance_date: task.start_date || task.created_at,
            cost: task.total_cost || task.estimated_cost || 0,
            vendor_name: task.vendor_id ? (vendorsMap.get(task.vendor_id) || 'Unknown Vendor') : 'No Vendor'
          });
        }
      }

      setMaintenance(records);

      // Calculate totals
      const totalCost = records.reduce((sum, m) => sum + (m.cost || 0), 0);
      const totalRecords = records.length;
      
      // Calculate average per month based on date range
      if (records.length > 0) {
        const dates = records.map(r => new Date(r.maintenance_date)).sort((a, b) => a.getTime() - b.getTime());
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const monthsDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const avgCostPerMonth = totalCost / monthsDiff;
        
        setTotals({
          totalCost,
          totalRecords,
          avgCostPerMonth
        });
      } else {
        setTotals({ totalCost: 0, totalRecords: 0, avgCostPerMonth: 0 });
      }
    } catch (error) {
      logger.error('Error loading maintenance data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load maintenance data');
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading maintenance data...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadMaintenanceData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Totals Card */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-lg font-bold text-gray-900">₹{totals.totalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Services</p>
            <p className="text-lg font-bold text-gray-900">{totals.totalRecords}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg/Month</p>
            <p className="text-lg font-bold text-gray-900">₹{Math.round(totals.avgCostPerMonth).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Latest Maintenance Records */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Latest Maintenance</h3>
        
        <div className="space-y-3">
          {maintenance.map((record) => (
            <div key={record.id} className="border rounded-lg p-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{record.maintenance_type}</p>
                  <p className="text-sm text-gray-600">{record.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(record.maintenance_date)} • {record.vendor_name}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  ₹{record.cost?.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {maintenance.length === 0 && (
          <p className="text-center text-gray-500 py-8">No maintenance records found</p>
        )}
      </div>
    </div>
  );
};

export default VehicleMaintenanceTab;
