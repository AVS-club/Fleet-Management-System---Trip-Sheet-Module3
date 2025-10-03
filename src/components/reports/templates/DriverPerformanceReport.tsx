import React from 'react';
import { ReportHeader } from '../common/ReportHeader';
import { StatCard } from '../common/StatCard';
import { ReportTable } from '../common/ReportTable';
import { User, Star, Shield, Fuel, Clock, Award } from 'lucide-react';

interface DriverPerformanceData {
  reportPeriod: string;
  topPerformers: Array<{
    id: string;
    name: string;
    rating: number;
    totalTrips: number;
    safetyScore: number;
    fuelEfficiency: number;
  }>;
  drivers: Array<{
    id: string;
    name: string;
    safetyScore: number;
    fuelEfficiency: number;
    punctuality: number;
    rating: number;
    trips: number;
    totalDistance: number;
    avgSpeed: number;
    violations: number;
    lastTripDate: string;
  }>;
  performanceMetrics: {
    totalDrivers: number;
    avgRating: number;
    avgSafetyScore: number;
    avgFuelEfficiency: number;
    totalTrips: number;
  };
  safetyMetrics: {
    totalViolations: number;
    accidents: number;
    nearMisses: number;
    safetyTrainingCompleted: number;
  };
}

interface DriverPerformanceReportProps {
  data: DriverPerformanceData;
}

export const DriverPerformanceReport: React.FC<DriverPerformanceReportProps> = ({ data }) => {
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-800';
    if (rating >= 3.5) return 'bg-blue-100 text-blue-800';
    if (rating >= 2.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRatingIcon = (rating: number) => {
    if (rating >= 4.5) return '⭐';
    if (rating >= 3.5) return '🟢';
    if (rating >= 2.5) return '🟡';
    return '🔴';
  };

  const getSafetyColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="report-container max-w-7xl mx-auto p-6 bg-white">
      <ReportHeader
        title="Driver Performance Report"
        subtitle={data.reportPeriod}
        additionalInfo={
          <div className="mt-2">
            <p className="text-xs text-gray-500">Total Drivers</p>
            <p className="text-2xl font-bold text-green-600">{data.performanceMetrics.totalDrivers}</p>
          </div>
        }
      />

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-6">
        <StatCard
          title="Average Rating"
          value={`${data.performanceMetrics.avgRating}/5.0`}
          icon={<Star className="w-6 h-6" />}
        />
        <StatCard
          title="Average Safety Score"
          value={`${data.performanceMetrics.avgSafetyScore}/10`}
          icon={<Shield className="w-6 h-6" />}
        />
        <StatCard
          title="Avg Fuel Efficiency"
          value={`${data.performanceMetrics.avgFuelEfficiency} km/L`}
          icon={<Fuel className="w-6 h-6" />}
        />
        <StatCard
          title="Total Trips"
          value={data.performanceMetrics.totalTrips.toLocaleString()}
          icon={<Clock className="w-6 h-6" />}
        />
      </div>

      {/* Safety Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Violations</p>
              <p className="text-2xl font-bold text-red-700">{data.safetyMetrics.totalViolations}</p>
            </div>
            <Shield className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accidents</p>
              <p className="text-2xl font-bold text-orange-700">{data.safetyMetrics.accidents}</p>
            </div>
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Near Misses</p>
              <p className="text-2xl font-bold text-yellow-700">{data.safetyMetrics.nearMisses}</p>
            </div>
            <Shield className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Training Completed</p>
              <p className="text-2xl font-bold text-green-700">{data.safetyMetrics.safetyTrainingCompleted}</p>
            </div>
            <Award className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="top-performers mb-8 bg-green-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Top 3 Performers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.topPerformers.map((driver, index) => (
            <div key={driver.id} className="performer-card bg-white p-4 rounded-lg text-center shadow-sm">
              <div className="text-4xl mb-2">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
              <p className="text-2xl font-bold text-green-600 mb-2">{driver.rating}/5.0</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{driver.totalTrips} trips</p>
                <p>Safety: {driver.safetyScore}/10</p>
                <p>Efficiency: {driver.fuelEfficiency} km/L</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Legend */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-2 text-gray-900">Performance Rating Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <span>Excellent (4.5+)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lg">🟢</span>
            <span>Good (3.5-4.5)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lg">🟡</span>
            <span>Average (2.5-3.5)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lg">🔴</span>
            <span>Poor (&lt;2.5)</span>
          </span>
        </div>
      </div>

      {/* Driver Performance Table */}
      <ReportTable
        title="Driver Performance Details"
        columns={[
          {
            key: 'name',
            label: 'Driver Name',
            align: 'left'
          },
          {
            key: 'safetyScore',
            label: 'Safety Score',
            align: 'center',
            render: (value: number) => (
              <span className={`font-medium ${getSafetyColor(value)}`}>
                {value}/10
              </span>
            )
          },
          {
            key: 'fuelEfficiency',
            label: 'Fuel Efficiency',
            align: 'center',
            render: (value: number) => `${value} km/L`
          },
          {
            key: 'punctuality',
            label: 'Punctuality',
            align: 'center',
            render: (value: number) => `${value}%`
          },
          {
            key: 'rating',
            label: 'Overall Rating',
            align: 'center',
            render: (value: number) => (
              <span className={`px-2 py-1 rounded text-sm font-medium ${getRatingColor(value)}`}>
                {getRatingIcon(value)} {value}
              </span>
            )
          },
          {
            key: 'trips',
            label: 'Total Trips',
            align: 'center'
          },
          {
            key: 'totalDistance',
            label: 'Distance (km)',
            align: 'right',
            render: (value: number) => value.toLocaleString()
          },
          {
            key: 'violations',
            label: 'Violations',
            align: 'center',
            render: (value: number) => (
              <span className={`px-2 py-1 rounded text-xs ${
                value === 0 ? 'bg-green-100 text-green-800' :
                value <= 2 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {value}
              </span>
            )
          }
        ]}
        data={data.drivers}
        className="mb-8"
      />

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Performance Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Excellent Drivers</span>
              <span className="font-medium text-green-600">
                {data.drivers.filter(d => d.rating >= 4.5).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Good Drivers</span>
              <span className="font-medium text-blue-600">
                {data.drivers.filter(d => d.rating >= 3.5 && d.rating < 4.5).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Drivers</span>
              <span className="font-medium text-yellow-600">
                {data.drivers.filter(d => d.rating >= 2.5 && d.rating < 3.5).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Poor Performers</span>
              <span className="font-medium text-red-600">
                {data.drivers.filter(d => d.rating < 2.5).length}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Safety Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Zero Violations</span>
              <span className="font-medium text-green-600">
                {data.drivers.filter(d => d.violations === 0).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">High Safety Score (8+)</span>
              <span className="font-medium text-green-600">
                {data.drivers.filter(d => d.safetyScore >= 8).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Need Training</span>
              <span className="font-medium text-red-600">
                {data.drivers.filter(d => d.safetyScore < 6).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Punctuality</span>
              <span className="font-medium">
                {Math.round(data.drivers.reduce((sum, d) => sum + d.punctuality, 0) / data.drivers.length)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Recognition Needed</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.drivers
                .filter(d => d.rating >= 4.5)
                .slice(0, 3)
                .map(driver => (
                  <li key={driver.id}>• {driver.name} - {driver.rating}/5.0 rating</li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Training Required</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.drivers
                .filter(d => d.rating < 2.5 || d.safetyScore < 6)
                .slice(0, 3)
                .map(driver => (
                  <li key={driver.id}>• {driver.name} - Rating: {driver.rating}, Safety: {driver.safetyScore}</li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
