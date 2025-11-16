import React, { ReactNode } from 'react';
import { IndianRupee, TrendingUp, Fuel, User, Truck } from 'lucide-react';

interface TripSummaryMetrics {
  totalExpenses: number;
  avgDistance: number;
  tripCount: number;
  meanMileage: number;
  topDriver: {
    id: string;
    name: string;
    totalDistance: number;
    tripCount: number;
  } | null;
  topVehicle: {
    id: string;
    registrationNumber: string;
    tripCount: number;
  } | null;
}

interface TripsSummaryProps {
  trips: any[];
  vehicles: any[];
  drivers: any[];
  loading?: boolean;
  metrics: TripSummaryMetrics;
  className?: string;
  actionsSlot?: ReactNode;
}

const TripsSummary: React.FC<TripsSummaryProps> = ({
  loading = false,
  metrics,
  className,
  actionsSlot
}) => {
  const gridClasses = [
    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4',
    className
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={gridClasses}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const baseCard = (
    key: string,
    label: string,
    value: React.ReactNode,
    icon: React.ReactNode,
    secondary?: React.ReactNode
  ) => (
    <div
      key={key}
      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="min-h-[18px] text-xs text-gray-500">{secondary || '\u00A0'}</p>
          </div>
        </div>
        {icon}
      </div>
    </div>
  );

  const cards = [
    baseCard(
      'avg-distance',
      'Avg Distance',
      `${(metrics.avgDistance || 0).toFixed(1)} km`,
      <TrendingUp className="h-8 w-8 text-green-500 opacity-75" />,
      'Per trip'
    ),
    baseCard(
      'mean-mileage',
      'Mean Mileage',
      `${(metrics.meanMileage || 0).toFixed(2)} km/L`,
      <Fuel className="h-8 w-8 text-orange-500 opacity-75" />,
      'Fleet-wide'
    ),
    baseCard(
      'top-driver',
      'Top Driver',
      metrics.topDriver?.name || 'No drivers',
      <User className="h-8 w-8 text-purple-500 opacity-75" />,
      metrics.topDriver?.tripCount ? `${metrics.topDriver.tripCount} trips` : 'No trips yet'
    ),
    baseCard(
      'top-vehicle',
      'Top Vehicle',
      metrics.topVehicle?.registrationNumber || 'No vehicles',
      <Truck className="h-8 w-8 text-indigo-500 opacity-75" />,
      metrics.topVehicle?.tripCount ? `${metrics.topVehicle.tripCount} trips` : 'No trips yet'
    )
  ];

  if (actionsSlot) {
    cards.push(
      <div
        key="quick-actions"
        className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col"
      >
        {actionsSlot}
      </div>
    );
  }

  return <div className={gridClasses}>{cards}</div>;
};

export default TripsSummary;
