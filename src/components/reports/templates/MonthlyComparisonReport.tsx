import React from 'react';
import { ReportHeader } from '../common/ReportHeader';
import { StatCard } from '../common/StatCard';
import { ReportTable } from '../common/ReportTable';
import { Car, Users, Fuel, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface MonthlyComparisonData {
  monthName: string;
  year: number;
  startDate: string;
  endDate: string;
  activeVehicles: number;
  totalTrips: number;
  totalDistance: number;
  totalFuelConsumed: number;
  avgFuelEfficiency: number;
  totalCost: number;
  weeklyBreakdown: Array<{
    week: number;
    trips: number;
    distance: number;
    fuel: number;
    cost: number;
  }>;
  vehicleMetrics: Array<{
    vehicleId: string;
    registrationNumber: string;
    model: string;
    trips: number;
    distance: number;
    fuelEfficiency: number;
    utilization: number;
  }>;
  previousMonthComparison: {
    trips: number;
    distance: number;
    fuel: number;
    cost: number;
  };
}

interface MonthlyComparisonReportProps {
  data: MonthlyComparisonData;
}

export const MonthlyComparisonReport: React.FC<MonthlyComparisonReportProps> = ({ data }) => {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="report-container max-w-6xl mx-auto p-6 bg-white">
      <ReportHeader
        title="Monthly Performance Report"
        subtitle={`${data.monthName} ${data.year}`}
        dateRange={{
          start: data.startDate,
          end: data.endDate
        }}
        additionalInfo={
          <div className="mt-2">
            <p className="text-xs text-gray-500">Total Trips</p>
            <p className="text-lg font-bold text-green-600">{data.totalTrips}</p>
          </div>
        }
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-6">
        <StatCard
          title="Active Vehicles"
          value={data.activeVehicles}
          icon={<Car className="w-6 h-6" />}
        />
        <StatCard
          title="Total Distance"
          value={`${data.totalDistance.toLocaleString()} km`}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title="Fuel Consumed"
          value={`${data.totalFuelConsumed} L`}
          icon={<Fuel className="w-6 h-6" />}
        />
        <StatCard
          title="Total Cost"
          value={`₹${data.totalCost.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>

      {/* Monthly Comparison */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Month-over-Month Comparison</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Trips</p>
            <p className="text-lg font-semibold">{data.totalTrips}</p>
            <p className={`text-sm ${data.previousMonthComparison.trips > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.previousMonthComparison.trips > 0 ? '↑' : '↓'} {Math.abs(data.previousMonthComparison.trips)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Distance</p>
            <p className="text-lg font-semibold">{data.totalDistance.toLocaleString()} km</p>
            <p className={`text-sm ${data.previousMonthComparison.distance > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.previousMonthComparison.distance > 0 ? '↑' : '↓'} {Math.abs(data.previousMonthComparison.distance)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Fuel</p>
            <p className="text-lg font-semibold">{data.totalFuelConsumed} L</p>
            <p className={`text-sm ${data.previousMonthComparison.fuel > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.previousMonthComparison.fuel > 0 ? '↑' : '↓'} {Math.abs(data.previousMonthComparison.fuel)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Cost</p>
            <p className="text-lg font-semibold">₹{data.totalCost.toLocaleString()}</p>
            <p className={`text-sm ${data.previousMonthComparison.cost > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.previousMonthComparison.cost > 0 ? '↑' : '↓'} {Math.abs(data.previousMonthComparison.cost)}%
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <ReportTable
        title="Weekly Breakdown"
        columns={[
          {
            key: 'week',
            label: 'Week',
            align: 'center',
            render: (value: number) => `Week ${value}`
          },
          {
            key: 'trips',
            label: 'Trips',
            align: 'right'
          },
          {
            key: 'distance',
            label: 'Distance (km)',
            align: 'right',
            render: (value: number) => value.toLocaleString()
          },
          {
            key: 'fuel',
            label: 'Fuel (L)',
            align: 'right'
          },
          {
            key: 'cost',
            label: 'Cost (₹)',
            align: 'right',
            render: (value: number) => value.toLocaleString()
          }
        ]}
        data={data.weeklyBreakdown}
        className="mb-8"
      />

      {/* Vehicle Performance */}
      <ReportTable
        title="Vehicle Performance Summary"
        columns={[
          {
            key: 'registrationNumber',
            label: 'Vehicle',
            align: 'left'
          },
          {
            key: 'model',
            label: 'Model',
            align: 'left'
          },
          {
            key: 'trips',
            label: 'Trips',
            align: 'right'
          },
          {
            key: 'distance',
            label: 'Distance (km)',
            align: 'right',
            render: (value: number) => value.toLocaleString()
          },
          {
            key: 'fuelEfficiency',
            label: 'Efficiency (km/L)',
            align: 'right'
          },
          {
            key: 'utilization',
            label: 'Utilization (%)',
            align: 'right',
            render: (value: number) => (
              <span className={`px-2 py-1 rounded text-xs ${
                value >= 80 ? 'bg-green-100 text-green-800' :
                value >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {value}%
              </span>
            )
          }
        ]}
        data={data.vehicleMetrics}
      />

      {/* Monthly Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Monthly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Performance Highlights</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Average fuel efficiency: {data.avgFuelEfficiency} km/L</li>
              <li>• Total operational days: {Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</li>
              <li>• Average trips per day: {Math.round(data.totalTrips / 30)}</li>
              <li>• Average distance per trip: {Math.round(data.totalDistance / data.totalTrips)} km</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Cost Analysis</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Total operational cost: ₹{data.totalCost.toLocaleString()}</li>
              <li>• Cost per trip: ₹{Math.round(data.totalCost / data.totalTrips)}</li>
              <li>• Cost per kilometer: ₹{Math.round(data.totalCost / data.totalDistance)}</li>
              <li>• Fuel cost percentage: {Math.round((data.totalFuelConsumed * 100) / data.totalCost)}%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
