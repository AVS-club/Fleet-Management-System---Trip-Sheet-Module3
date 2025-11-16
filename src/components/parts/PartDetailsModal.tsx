import React from 'react';
import { X, TrendingUp, IndianRupee, Calendar, Truck, BarChart3 } from 'lucide-react';
import { PartHealthMetrics } from '../../utils/partsAnalytics';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import Button from '../ui/Button';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PartDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: PartHealthMetrics | null;
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
}

const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'
];

const PartDetailsModal: React.FC<PartDetailsModalProps> = ({
  isOpen,
  onClose,
  part,
  tasks,
  vehicles
}) => {
  if (!isOpen || !part) return null;

  // Create vehicle lookup map
  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

  // Get replacement history for this part
  const getReplacementHistory = () => {
    const history: Array<{
      vehicle: string;
      date: string;
      brand?: string;
      cost: number;
      odometer: number;
    }> = [];

    tasks.forEach(task => {
      const vehicle = vehicleMap.get(task.vehicle_id);
      if (!vehicle) return;

      // Parts data is now handled through the unified parts_data field
      // Battery and tyre tracking via separate fields has been removed
      // All parts history is managed through the parts_replaced array
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const replacementHistory = getReplacementHistory();

  // Prepare brand comparison data
  const brandComparisonData = part.brandPerformance?.brands.map((brand, index) => ({
    name: brand.name,
    averageCost: brand.averageCost,
    averageLifeKm: brand.averageLifeKm,
    usageCount: brand.usageCount,
    color: CHART_COLORS[index % CHART_COLORS.length]
  })) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl mr-3" role="img" aria-label={part.partName}>
              {part.icon}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{part.partName}</h2>
              <p className="text-sm text-gray-500">{part.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Last Replaced
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {part.lastReplacedDate ? format(new Date(part.lastReplacedDate), 'dd MMM yyyy') : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Truck className="h-4 w-4 mr-1" />
                  Vehicles Affected
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {part.vehiclesAffected}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <IndianRupee className="h-4 w-4 mr-1" />
                  Average Cost
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  ₹{part.averageCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Life Remaining
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {part.lifeRemainingPercentage.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Brand Comparison Charts */}
            {brandComparisonData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Average Cost by Brand */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Average Cost by Brand
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brandComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `₹${value/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Avg Cost']} />
                        <Bar dataKey="averageCost" radius={[4, 4, 0, 0]}>
                          {brandComparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Usage Count by Brand */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Usage Count by Brand
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brandComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`${value}`, 'Usage Count']} />
                        <Bar dataKey="usageCount" radius={[4, 4, 0, 0]}>
                          {brandComparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Replacement History */}
            {replacementHistory.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Replacement History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Brand
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Odometer
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {replacementHistory.slice(0, 10).map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.vehicle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(record.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.brand || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{record.cost.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.odometer.toLocaleString()} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {replacementHistory.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing 10 most recent replacements of {replacementHistory.length} total
                  </p>
                )}
              </div>
            )}

            {/* Alerts */}
            {part.alerts.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-orange-800 mb-3">Active Alerts</h3>
                <div className="space-y-2">
                  {part.alerts.map((alert, index) => (
                    <div key={index} className="text-sm text-orange-700 bg-white p-2 rounded border border-orange-100">
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Data Message */}
            {replacementHistory.length === 0 && brandComparisonData.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Detailed Data Available</h3>
                <p className="text-gray-500">
                  Record maintenance tasks with {part.partName.toLowerCase()} replacements to see detailed analytics.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartDetailsModal;