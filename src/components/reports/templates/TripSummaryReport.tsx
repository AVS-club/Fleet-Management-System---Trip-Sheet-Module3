import React from 'react';
import { ReportHeader } from '../common/ReportHeader';
import { StatCard } from '../common/StatCard';
import { ReportTable } from '../common/ReportTable';
import { MapPin, Clock, Fuel, DollarSign, Car, User } from 'lucide-react';

interface TripSummaryData {
  dateRange: {
    start: string;
    end: string;
  };
  totalTrips: number;
  totalDistance: number;
  avgDuration: number;
  avgFuelEfficiency: number;
  totalFuelCost: number;
  trips: Array<{
    id: string;
    vehicle: string;
    driver: string;
    startLocation: string;
    endLocation: string;
    distance: number;
    duration: number;
    startTime: string;
    endTime: string;
    fuelConsumed: number;
    fuelCost: number;
  }>;
  summaryStats: {
    totalActiveHours: number;
    totalIdleTime: number;
    avgSpeed: number;
    mostUsedVehicle: string;
    topDriver: string;
  };
}

interface TripSummaryReportProps {
  data: TripSummaryData;
}

export const TripSummaryReport: React.FC<TripSummaryReportProps> = ({ data }) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="report-container max-w-7xl mx-auto p-6 bg-white">
      <ReportHeader
        title="Trip Summary Report"
        dateRange={data.dateRange}
        additionalInfo={
          <div className="mt-2">
            <p className="text-xs text-gray-500">Total Trips</p>
            <p className="text-2xl font-bold text-green-600">{data.totalTrips}</p>
          </div>
        }
      />

      {/* Summary Statistics */}
      <div className="bg-gray-50 p-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-6">
        <StatCard
          title="Total Distance"
          value={`${data.totalDistance.toLocaleString()} km`}
          icon={<MapPin className="w-6 h-6" />}
        />
        <StatCard
          title="Avg Trip Duration"
          value={formatDuration(data.avgDuration)}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Fuel Efficiency"
          value={`${data.avgFuelEfficiency} km/L`}
          icon={<Fuel className="w-6 h-6" />}
        />
        <StatCard
          title="Total Fuel Cost"
          value={`₹${data.totalFuelCost.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>

      {/* Additional Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Active Hours</p>
              <p className="text-xl font-semibold text-blue-700">{formatDuration(data.summaryStats.totalActiveHours)}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Car className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Most Used Vehicle</p>
              <p className="text-lg font-semibold text-yellow-700">{data.summaryStats.mostUsedVehicle}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Top Driver</p>
              <p className="text-lg font-semibold text-green-700">{data.summaryStats.topDriver}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Details Table */}
      <ReportTable
        title="Trip Details"
        columns={[
          {
            key: 'id',
            label: 'Trip ID',
            align: 'left'
          },
          {
            key: 'vehicle',
            label: 'Vehicle',
            align: 'left'
          },
          {
            key: 'driver',
            label: 'Driver',
            align: 'left'
          },
          {
            key: 'startLocation',
            label: 'Start Location',
            align: 'left'
          },
          {
            key: 'endLocation',
            label: 'End Location',
            align: 'left'
          },
          {
            key: 'distance',
            label: 'Distance (km)',
            align: 'right'
          },
          {
            key: 'duration',
            label: 'Duration',
            align: 'right',
            render: (value: number) => formatDuration(value)
          },
          {
            key: 'startTime',
            label: 'Start Time',
            align: 'center',
            render: (value: string) => formatTime(value)
          },
          {
            key: 'fuelCost',
            label: 'Fuel Cost (₹)',
            align: 'right',
            render: (value: number) => value.toLocaleString()
          }
        ]}
        data={data.trips}
        className="mb-8"
      />

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Trip Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Speed</span>
              <span className="font-medium">{data.summaryStats.avgSpeed} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Idle Time</span>
              <span className="font-medium">{formatDuration(data.summaryStats.totalIdleTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cost per Trip</span>
              <span className="font-medium">₹{Math.round(data.totalFuelCost / data.totalTrips)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cost per Kilometer</span>
              <span className="font-medium">₹{Math.round(data.totalFuelCost / data.totalDistance)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Efficiency Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Trips per Day</span>
              <span className="font-medium">{Math.round(data.totalTrips / 30)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Distance per Trip</span>
              <span className="font-medium">{Math.round(data.totalDistance / data.totalTrips)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Fuel per Trip</span>
              <span className="font-medium">{Math.round((data.totalFuelCost / data.totalTrips) / 100)} L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Utilization Rate</span>
              <span className="font-medium text-green-600">
                {Math.round((data.summaryStats.totalActiveHours / (data.summaryStats.totalActiveHours + data.summaryStats.totalIdleTime)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Route Analysis */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Route Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{data.trips.length}</p>
            <p className="text-sm text-gray-600">Total Routes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {new Set(data.trips.map(trip => `${trip.startLocation}-${trip.endLocation}`)).size}
            </p>
            <p className="text-sm text-gray-600">Unique Routes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(data.totalDistance / new Set(data.trips.map(trip => `${trip.startLocation}-${trip.endLocation}`)).size)}
            </p>
            <p className="text-sm text-gray-600">Avg Route Distance</p>
          </div>
        </div>
      </div>
    </div>
  );
};
