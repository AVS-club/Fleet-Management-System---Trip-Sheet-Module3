import React from 'react';
import { ReportHeader } from '../common/ReportHeader';
import { StatCard } from '../common/StatCard';
import { ReportTable } from '../common/ReportTable';
import { TrendingUp, TrendingDown, Car, Fuel, MapPin } from 'lucide-react';

interface WeeklyComparisonData {
  currentWeek: {
    number: number;
    totalTrips: number;
    totalDistance: number;
    fuelConsumed: number;
    avgFuelEfficiency: number;
    totalCost: number;
  };
  previousWeek: {
    number: number;
    totalTrips: number;
    totalDistance: number;
    fuelConsumed: number;
    avgFuelEfficiency: number;
    totalCost: number;
  };
  percentageChange: {
    trips: number;
    distance: number;
    fuel: number;
    efficiency: number;
    cost: number;
  };
  metrics: Array<{
    name: string;
    previousValue: string | number;
    currentValue: string | number;
    change: number;
  }>;
}

interface WeeklyComparisonReportProps {
  data: WeeklyComparisonData;
}

export const WeeklyComparisonReport: React.FC<WeeklyComparisonReportProps> = ({ data }) => {
  const formatChange = (change: number) => {
    const isPositive = change > 0;
    return {
      value: Math.abs(change),
      isPositive
    };
  };

  return (
    <div className="report-container max-w-4xl mx-auto p-6 bg-white">
      <ReportHeader
        title="Weekly Comparison Report"
        subtitle={`Week ${data.currentWeek.number} vs Week ${data.previousWeek.number}`}
        additionalInfo={
          <div className="mt-2">
            <p className="text-xs text-gray-500">Report Period</p>
            <p className="text-sm font-medium">7 days comparison</p>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-6">
        <StatCard
          title="Total Trips"
          value={data.currentWeek.totalTrips}
          change={formatChange(data.percentageChange.trips)}
          icon={<Car className="w-6 h-6" />}
        />
        <StatCard
          title="Distance Covered"
          value={`${data.currentWeek.totalDistance} km`}
          change={formatChange(data.percentageChange.distance)}
          icon={<MapPin className="w-6 h-6" />}
        />
        <StatCard
          title="Fuel Consumed"
          value={`${data.currentWeek.fuelConsumed} L`}
          change={formatChange(data.percentageChange.fuel)}
          icon={<Fuel className="w-6 h-6" />}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard
          title="Average Fuel Efficiency"
          value={`${data.currentWeek.avgFuelEfficiency} km/L`}
          change={formatChange(data.percentageChange.efficiency)}
          className="border-blue-500"
        />
        <StatCard
          title="Total Cost"
          value={`₹${data.currentWeek.totalCost.toLocaleString()}`}
          change={formatChange(data.percentageChange.cost)}
          className="border-purple-500"
        />
      </div>

      {/* Detailed Comparison Table */}
      <ReportTable
        title="Detailed Comparison"
        columns={[
          {
            key: 'name',
            label: 'Metric',
            align: 'left'
          },
          {
            key: 'previousValue',
            label: `Week ${data.previousWeek.number}`,
            align: 'right'
          },
          {
            key: 'currentValue',
            label: `Week ${data.currentWeek.number}`,
            align: 'right'
          },
          {
            key: 'change',
            label: 'Change',
            align: 'right',
            render: (value: number) => (
              <span className={`flex items-center justify-end gap-1 ${
                value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {value > 0 ? <TrendingUp className="w-4 h-4" /> : 
                 value < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                {value > 0 ? '+' : ''}{value}%
              </span>
            )
          }
        ]}
        data={data.metrics}
      />

      {/* Performance Insights */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Positive Trends</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.percentageChange.trips > 0 && (
                <li>• Trip volume increased by {data.percentageChange.trips}%</li>
              )}
              {data.percentageChange.efficiency > 0 && (
                <li>• Fuel efficiency improved by {data.percentageChange.efficiency}%</li>
              )}
              {data.percentageChange.distance > 0 && (
                <li>• Distance coverage increased by {data.percentageChange.distance}%</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Areas for Improvement</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.percentageChange.fuel > 0 && (
                <li>• Fuel consumption increased by {data.percentageChange.fuel}%</li>
              )}
              {data.percentageChange.cost > 0 && (
                <li>• Operating costs increased by {data.percentageChange.cost}%</li>
              )}
              {data.percentageChange.efficiency < 0 && (
                <li>• Fuel efficiency decreased by {Math.abs(data.percentageChange.efficiency)}%</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
