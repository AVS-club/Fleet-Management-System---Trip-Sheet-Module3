import React, { useMemo, useState } from 'react';
import { Driver, Trip, Vehicle } from '../../types';
import { MaintenanceTask } from '../../types/maintenance';
import {
  getDriverPerformanceMetrics,
  getFleetAverageCostPerKm,
  getMileageDropInsight,
  getBreakdownInsight,
  getCostComparisonInsight,
  getMaintenanceCostInsight,
  DriverInsight
} from '../../utils/driverAnalytics';
import { TrendingUp, AlertTriangle, IndianRupee, PenTool, User } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

interface DriverAIInsightsProps {
  allDrivers: Driver[];
  trips: Trip[];
  vehicles: Vehicle[];
  maintenanceTasks: MaintenanceTask[];
  dateRange?: { start: Date; end: Date };
  selectedDriverId?: string;
}

const DriverAIInsights: React.FC<DriverAIInsightsProps> = ({
  allDrivers,
  trips,
  vehicles,
  maintenanceTasks,
  dateRange,
  selectedDriverId
}) => {
  const [selectedDriver, setSelectedDriver] = useState<string>(selectedDriverId || '');
  
  const range = useMemo(() => {
    if (dateRange) return dateRange;
    const end = new Date();
    return { start: new Date('2020-01-01'), end };
  }, [dateRange]);

  const insights = useMemo(() => {
    const driverId = selectedDriver || (allDrivers.length > 0 ? allDrivers[0].id : '');
    const driver = allDrivers.find(d => d.id === driverId);
    
    if (!driver || !driverId) return [] as DriverInsight[];

    const metrics = getDriverPerformanceMetrics(
      allDrivers,
      trips,
      vehicles,
      maintenanceTasks,
      range
    );
    const driverMetric = metrics.find(m => m.driverId === driver.id);
    
    if (!driverMetric || driverMetric.totalTrips === 0) {
      return [] as DriverInsight[];
    }
    
    const fleetAvgCostPerKm = getFleetAverageCostPerKm(metrics);

    const fleetAvgMaintenanceCost = maintenanceTasks.length > 0
      ? maintenanceTasks.reduce(
          (sum, t) => sum + (t.actual_cost || t.estimated_cost || 0),
          0
        ) / maintenanceTasks.length
      : 0;

    const list: DriverInsight[] = [];

    // Only add cost comparison if both values are meaningful
    if (driverMetric.costPerKm > 0 && fleetAvgCostPerKm > 0) {
      list.push(
        getCostComparisonInsight(
          driver.id || '',
          driverMetric.costPerKm,
          fleetAvgCostPerKm
        )
      );
    }

    const mileage = getMileageDropInsight(driverId, trips, range);
    if (mileage) list.push(mileage);

    const breakdown = getBreakdownInsight(
      driverId,
      maintenanceTasks,
      range
    );
    if (breakdown) list.push(breakdown);

    const maintenance = getMaintenanceCostInsight(
      driverId,
      maintenanceTasks,
      range,
      fleetAvgMaintenanceCost
    );
    if (maintenance) list.push(maintenance);

    return list;
  }, [selectedDriver, allDrivers, trips, vehicles, maintenanceTasks, range]);

  const getIcon = (type: DriverInsight['type']) => {
    switch (type) {
      case 'mileage_drop':
        return <TrendingUp className="h-4 w-4" />;
      case 'breakdown_frequency':
        return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance_cost':
        return <PenTool className="h-4 w-4" />;
      default:
        return <IndianRupee className="h-4 w-4" />;
    }
  };

  const severityColor = (severity: DriverInsight['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-error-600';
      case 'medium':
        return 'text-warning-600';
      default:
        return 'text-gray-600';
    }
  };

  if (allDrivers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>No drivers available for insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Driver Selection */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Driver for AI Insights
        </label>
        <select
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          {allDrivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
      </div>

      {/* Insights Display */}
      {insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div key={idx} className={`p-4 rounded-lg border ${
              insight.severity === 'high' ? 'bg-error-50 border-error-200' :
              insight.severity === 'medium' ? 'bg-warning-50 border-warning-200' :
              'bg-success-50 border-success-200'
            }`}>
              <div className="flex items-start">
                <span className={`mr-3 mt-0.5 ${severityColor(insight.severity)}`}>
                  {getIcon(insight.type)}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{insight.message}</p>
                  <p className="text-xs text-gray-600 mt-1 capitalize">
                    {insight.type.replace('_', ' ')} • {insight.severity} priority
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No insights available for the selected driver</p>
          <p className="text-xs text-gray-400 mt-1">
            Insights will appear after sufficient trip and performance data is collected
          </p>
        </div>
      )}
    </div>
  );
};

export default DriverAIInsights;