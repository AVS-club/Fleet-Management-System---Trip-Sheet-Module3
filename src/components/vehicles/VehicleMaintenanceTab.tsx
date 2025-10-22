import React, { useState, useEffect } from 'react';
import { PenTool as Tool, AlertTriangle, TrendingUp, Award, Clock } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { createLogger } from '../../utils/logger';

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

  useEffect(() => {
    loadMaintenanceData();
  }, [vehicleId]);

  const loadMaintenanceData = async () => {
    try {
      // Simulate loading maintenance data
      // In a real app, this would fetch from your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockData: MaintenanceRecord[] = [
        {
          id: '1',
          maintenance_type: 'Oil Change',
          description: 'Regular engine oil change',
          maintenance_date: '2024-01-15',
          cost: 2500,
          vendor_name: 'Auto Service Center'
        },
        {
          id: '2',
          maintenance_type: 'Tyre Rotation',
          description: 'Front and rear tyre rotation',
          maintenance_date: '2024-01-01',
          cost: 800,
          vendor_name: 'Tyre Shop'
        },
        {
          id: '3',
          maintenance_type: 'Brake Inspection',
          description: 'Complete brake system check',
          maintenance_date: '2023-12-20',
          cost: 1500,
          vendor_name: 'Brake Specialists'
        }
      ];
      
      setMaintenance(mockData);
      
      // Calculate totals
      const totalCost = mockData.reduce((sum, m) => sum + (m.cost || 0), 0);
      setTotals({
        totalCost,
        totalRecords: mockData.length,
        avgCostPerMonth: totalCost / 12 // Simple average
      });
    } catch (error) {
      logger.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading maintenance data...</div>;
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
