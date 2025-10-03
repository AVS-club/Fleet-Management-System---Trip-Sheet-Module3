import React from 'react';
import { ReportHeader } from '../common/ReportHeader';
import { StatCard } from '../common/StatCard';
import { ReportTable } from '../common/ReportTable';
import { ProgressBar } from '../common/ProgressBar';
import { Car, Clock, MapPin, Fuel, TrendingUp, TrendingDown } from 'lucide-react';

interface VehicleUtilizationData {
  period: string;
  highUtilization: number;
  mediumUtilization: number;
  lowUtilization: number;
  vehicles: Array<{
    id: string;
    number: string;
    model: string;
    utilization: number;
    totalTrips: number;
    totalDistance: number;
    activeHours: number;
    idleTime: number;
    fuelEfficiency: number;
    avgSpeed: number;
    lastTripDate: string;
  }>;
  utilizationTrends: {
    weekly: Array<{
      week: number;
      avgUtilization: number;
    }>;
    monthly: Array<{
      month: string;
      avgUtilization: number;
    }>;
  };
  performanceMetrics: {
    totalFleetUtilization: number;
    avgFuelEfficiency: number;
    totalActiveHours: number;
    totalIdleHours: number;
  };
}

interface VehicleUtilizationReportProps {
  data: VehicleUtilizationData;
}

export const VehicleUtilizationReport: React.FC<VehicleUtilizationReportProps> = ({ data }) => {
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'green';
    if (utilization >= 60) return 'yellow';
    return 'red';
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 80) return 'High';
    if (utilization >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <div className="report-container max-w-7xl mx-auto p-6 bg-white">
      <ReportHeader
        title="Vehicle Utilization Report"
        subtitle={data.period}
        additionalInfo={
          <div className="mt-2">
            <p className="text-xs text-gray-500">Fleet Utilization</p>
            <p className="text-2xl font-bold text-green-600">{data.performanceMetrics.totalFleetUtilization}%</p>
          </div>
        }
      />

      {/* Utilization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-6">
        <div className="overview-card bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Utilization</p>
              <p className="text-2xl font-bold text-green-700">{data.highUtilization}</p>
              <p className="text-xs text-gray-500">Above 80% usage</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="overview-card bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium Utilization</p>
              <p className="text-2xl font-bold text-yellow-700">{data.mediumUtilization}</p>
              <p className="text-xs text-gray-500">50-80% usage</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="overview-card bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Utilization</p>
              <p className="text-2xl font-bold text-red-700">{data.lowUtilization}</p>
              <p className="text-xs text-gray-500">Below 50% usage</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Active Hours"
          value={`${data.performanceMetrics.totalActiveHours.toLocaleString()} hrs`}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Total Idle Hours"
          value={`${data.performanceMetrics.totalIdleHours.toLocaleString()} hrs`}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Avg Fuel Efficiency"
          value={`${data.performanceMetrics.avgFuelEfficiency} km/L`}
          icon={<Fuel className="w-6 h-6" />}
        />
        <StatCard
          title="Fleet Size"
          value={data.vehicles.length}
          icon={<Car className="w-6 h-6" />}
        />
      </div>

      {/* Vehicle Details */}
      <div className="vehicle-details mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Vehicle-wise Utilization</h2>
        <div className="space-y-4">
          {data.vehicles.map((vehicle) => (
            <div key={vehicle.id} className="vehicle-card p-4 border rounded-lg bg-white shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{vehicle.number}</h3>
                  <p className="text-sm text-gray-500">{vehicle.model}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{vehicle.utilization}%</p>
                  <p className="text-sm text-gray-500">Utilization Rate</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <ProgressBar
                value={vehicle.utilization}
                label={`${getUtilizationStatus(vehicle.utilization)} Utilization`}
                color={getUtilizationColor(vehicle.utilization)}
                className="mb-3"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total Trips</p>
                  <p className="font-medium">{vehicle.totalTrips}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-medium">{vehicle.totalDistance.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active Hours</p>
                  <p className="font-medium">{vehicle.activeHours} hrs</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Idle Time</p>
                  <p className="font-medium">{vehicle.idleTime} hrs</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-500">Fuel Efficiency</p>
                  <p className="font-medium">{vehicle.fuelEfficiency} km/L</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Speed</p>
                  <p className="font-medium">{vehicle.avgSpeed} km/h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Trip</p>
                  <p className="font-medium">{new Date(vehicle.lastTripDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Utilization Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Weekly Utilization Trend</h3>
          <div className="space-y-2">
            {data.utilizationTrends.weekly.map((week) => (
              <div key={week.week} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Week {week.week}</span>
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={week.avgUtilization}
                    max={100}
                    showPercentage={false}
                    color={getUtilizationColor(week.avgUtilization)}
                    className="w-24"
                  />
                  <span className="text-sm font-medium w-12 text-right">{week.avgUtilization}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Monthly Utilization Trend</h3>
          <div className="space-y-2">
            {data.utilizationTrends.monthly.map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{month.month}</span>
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={month.avgUtilization}
                    max={100}
                    showPercentage={false}
                    color={getUtilizationColor(month.avgUtilization)}
                    className="w-24"
                  />
                  <span className="text-sm font-medium w-12 text-right">{month.avgUtilization}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Optimization Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">High Performers</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.vehicles
                .filter(v => v.utilization >= 80)
                .map(vehicle => (
                  <li key={vehicle.id}>• {vehicle.number} - {vehicle.utilization}% utilization</li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Underutilized Vehicles</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.vehicles
                .filter(v => v.utilization < 50)
                .map(vehicle => (
                  <li key={vehicle.id}>• {vehicle.number} - {vehicle.utilization}% utilization</li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
