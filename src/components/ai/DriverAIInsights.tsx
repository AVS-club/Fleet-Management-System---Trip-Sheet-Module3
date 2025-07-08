import React, { useMemo } from 'react';
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
import { TrendingUp, AlertTriangle, IndianRupee, PenTool } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';

interface DriverAIInsightsProps {
  driver: Driver;
  allDrivers: Driver[];
  trips: Trip[];
  vehicles: Vehicle[];
  maintenanceTasks: MaintenanceTask[];
  dateRange?: { start: Date; end: Date };
}

const DriverAIInsights: React.FC<DriverAIInsightsProps> = ({
  driver,
  allDrivers,
  trips,
  vehicles,
  maintenanceTasks,
  dateRange
}) => {
  const range = useMemo(() => {
    if (dateRange) return dateRange;
    const end = new Date();
    return { start: new Date('2020-01-01'), end };
  }, [dateRange]);

  const insights = useMemo(() => {
    if (!driver) return [] as DriverInsight[];

    const metrics = getDriverPerformanceMetrics(
      allDrivers,
      trips,
      vehicles,
      maintenanceTasks,
      range
    );
    const driverMetric = metrics.find(m => m.driverId === driver.id);
    const fleetAvgCostPerKm = getFleetAverageCostPerKm(metrics);

    const fleetAvgMaintenanceCost = maintenanceTasks.length > 0
      ? maintenanceTasks.reduce(
          (sum, t) => sum + (t.actual_cost || t.estimated_cost || 0),
          0
        ) / maintenanceTasks.length
      : 0;

    const list: DriverInsight[] = [];

    list.push(
      getCostComparisonInsight(
        driver.id || '',
        driverMetric?.costPerKm || 0,
        fleetAvgCostPerKm
      )
    );

    const mileage = getMileageDropInsight(driver.id || '', trips, range);
    if (mileage) list.push(mileage);

    const breakdown = getBreakdownInsight(
      driver.id || '',
      maintenanceTasks,
      range
    );
    if (breakdown) list.push(breakdown);

    const maintenance = getMaintenanceCostInsight(
      driver.id || '',
      maintenanceTasks,
      range,
      fleetAvgMaintenanceCost
    );
    if (maintenance) list.push(maintenance);

    return list;
  }, [driver, allDrivers, trips, vehicles, maintenanceTasks, range]);

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

  if (insights.length === 0) return null;

  return (
    <CollapsibleSection
      title="Driver AI Insights"
      icon={<TrendingUp className="h-5 w-5" />}
      iconColor="text-primary-600"
      defaultExpanded={false}
    >
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start text-sm">
            <span className={`mr-2 mt-0.5 ${severityColor(insight.severity)}`}>{
              getIcon(insight.type)
            }</span>
            <span>{insight.message}</span>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
};

export default DriverAIInsights;