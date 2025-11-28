import React, { useMemo } from 'react';
import { Vehicle, Trip } from '@/types';
import { Fuel, TrendingUp, Activity, Zap, Award, AlertCircle } from 'lucide-react';
import { NumberFormatter } from '@/utils/numberFormatter';
import EmptyState from './EmptyState';
import '@/styles/vehicle-stats-scrollbar.css';

interface VehicleStatsListProps {
  vehicles: Vehicle[];
  trips?: Trip[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

const VehicleStatsList: React.FC<VehicleStatsListProps> = ({ vehicles, trips = [], onSelectVehicle }) => {
  // Filter out archived vehicles
  const activeVehicles = Array.isArray(vehicles) ? vehicles.filter(v => v.status !== 'archived') : [];
  
  // Calculate stats for all vehicles with memoization for performance
  const vehiclesWithStats = useMemo(() => {
    return activeVehicles.map((vehicle) => {
      const vehicleTrips = Array.isArray(trips) ? trips.filter(trip => trip.vehicle_id === vehicle.id) : [];
      const totalTrips = vehicleTrips.length;
      const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
      const tripsWithKmpl = vehicleTrips.filter(trip => trip.calculated_kmpl !== undefined && trip.calculated_kmpl > 0);
      const averageKmpl = tripsWithKmpl.length > 0
        ? tripsWithKmpl.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithKmpl.length
        : undefined;
      
      // Calculate efficiency score (0-100)
      const efficiencyScore = averageKmpl 
        ? Math.min(100, Math.round((averageKmpl / 6) * 100)) // 6 km/L = 100% (excellent)
        : 0;

      return {
        ...vehicle,
        stats: {
          totalTrips,
          totalDistance,
          averageKmpl,
          efficiencyScore,
          hasData: totalTrips > 0,
        }
      };
    });
  }, [activeVehicles, trips]);

  // Sort vehicles by activity and efficiency
  const sortedVehicles = useMemo(() => {
    return [...vehiclesWithStats].sort((a, b) => {
      // Primary sort: by number of trips (most active first)
      if (b.stats.totalTrips !== a.stats.totalTrips) {
        return b.stats.totalTrips - a.stats.totalTrips;
      }
      // Secondary sort: by efficiency
      return b.stats.efficiencyScore - a.stats.efficiencyScore;
    });
  }, [vehiclesWithStats]);
  
  if (!Array.isArray(activeVehicles) || activeVehicles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100 mb-4">Vehicle Performance</h3>
        <EmptyState 
          type="vehicles" 
          message="No active vehicles available. Add your first vehicle to start tracking performance."
        />
      </div>
    );
  }

  // Helper function to get efficiency color
  const getEfficiencyColor = (score: number) => {
    if (score >= 70) return 'text-success-600 dark:text-success-400';
    if (score >= 40) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  };

  // Helper function to get efficiency badge
  const getEfficiencyBadge = (score: number) => {
    if (score >= 70) return { label: 'Excellent', color: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400' };
    if (score >= 40) return { label: 'Good', color: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' };
    if (score > 0) return { label: 'Fair', color: 'bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400' };
    return { label: 'No Data', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
  };
  
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-card border border-gray-200/80 dark:border-gray-700/80 overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-500/10 via-secondary-500/10 to-primary-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
                Vehicle Performance
              </h3>
              <p className="text-xs font-sans text-gray-600 dark:text-gray-400">
                {sortedVehicles.filter(v => v.stats.hasData).length} of {sortedVehicles.length} active
              </p>
            </div>
          </div>
          <Award className="h-6 w-6 text-primary-500/30" />
        </div>
      </div>

      {/* Vehicle list with enhanced cards */}
      <div 
        className="vehicle-stats-scroll p-2 overflow-y-scroll"
        style={{ 
          maxHeight: '500px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent'
        }}
      >
        <div className="space-y-2">
          {sortedVehicles.map((vehicle, index) => {
            const efficiencyBadge = getEfficiencyBadge(vehicle.stats.efficiencyScore);
            const hasData = vehicle.stats.hasData;

            return (
              <div 
                key={vehicle.id}
                className={`
                  group relative p-4 rounded-xl cursor-pointer transition-all duration-300 
                  hover:shadow-card-hover hover:scale-[1.02] hover:-translate-y-0.5
                  bg-white dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50
                  hover:border-primary-300 dark:hover:border-primary-600
                  ${index === 0 && hasData ? 'ring-2 ring-primary-500/20 dark:ring-primary-400/20' : ''}
                `}
                onClick={() => onSelectVehicle(vehicle)}
              >
                {/* Top performer badge */}
                {index === 0 && hasData && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center space-x-1">
                      <Zap className="h-3 w-3" />
                      <span>Top</span>
                    </div>
                  </div>
                )}

                {/* Vehicle header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-display font-semibold text-gray-900 dark:text-gray-100 text-base">
                        {vehicle.registration_number}
                      </h4>
                      {!hasData && (
                        <AlertCircle className="h-4 w-4 text-gray-400" title="No trip data" />
                      )}
                    </div>
                    <p className="text-sm font-sans text-gray-600 dark:text-gray-400">
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>

                  {/* Status and efficiency badges */}
                  <div className="flex flex-col items-end space-y-1">
                    <div className={`
                      px-2.5 py-1 rounded-full text-xs font-medium capitalize
                      ${vehicle.status === 'active' 
                        ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                        : vehicle.status === 'maintenance'
                        ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }
                    `}>
                      {vehicle.status}
                    </div>
                    {hasData && vehicle.stats.averageKmpl && (
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${efficiencyBadge.color}`}>
                        {efficiencyBadge.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Trips */}
                  <div className="flex flex-col space-y-1 p-2.5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg border border-blue-200/50 dark:border-blue-700/30">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-[10px] font-sans font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                        Trips
                      </span>
                    </div>
                    <span className="font-display font-bold text-lg text-blue-900 dark:text-blue-100">
                      {hasData ? vehicle.stats.totalTrips : '—'}
                    </span>
                  </div>
                  
                  {/* Total Distance */}
                  <div className="flex flex-col space-y-1 p-2.5 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg border border-purple-200/50 dark:border-purple-700/30">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-[10px] font-sans font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                        Distance
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-1">
                      <span className="font-display font-bold text-lg text-purple-900 dark:text-purple-100">
                        {hasData ? NumberFormatter.large(vehicle.stats.totalDistance) : '—'}
                      </span>
                      {hasData && (
                        <span className="text-[10px] font-sans text-purple-600 dark:text-purple-400">km</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Average Mileage */}
                  <div className="flex flex-col space-y-1 p-2.5 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 rounded-lg border border-primary-200/50 dark:border-primary-700/30">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Fuel className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                      <span className="text-[10px] font-sans font-medium text-primary-700 dark:text-primary-300 uppercase tracking-wide">
                        Mileage
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-1">
                      <span className={`font-display font-bold text-lg ${hasData && vehicle.stats.averageKmpl ? getEfficiencyColor(vehicle.stats.efficiencyScore) : 'text-gray-400 dark:text-gray-500'}`}>
                        {hasData && vehicle.stats.averageKmpl ? NumberFormatter.display(vehicle.stats.averageKmpl, 2) : '—'}
                      </span>
                      {hasData && vehicle.stats.averageKmpl && (
                        <span className="text-[10px] font-sans text-primary-600 dark:text-primary-400">km/L</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Efficiency indicator bar */}
                {hasData && vehicle.stats.averageKmpl && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-sans font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Efficiency Score
                      </span>
                      <span className={`text-xs font-display font-bold ${getEfficiencyColor(vehicle.stats.efficiencyScore)}`}>
                        {vehicle.stats.efficiencyScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          vehicle.stats.efficiencyScore >= 70 
                            ? 'bg-gradient-to-r from-success-500 to-success-400'
                            : vehicle.stats.efficiencyScore >= 40
                            ? 'bg-gradient-to-r from-warning-500 to-warning-400'
                            : 'bg-gradient-to-r from-error-500 to-error-400'
                        }`}
                        style={{ width: `${vehicle.stats.efficiencyScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* No data indicator */}
                {!hasData && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs font-sans text-gray-500 dark:text-gray-400 text-center">
                      No trip data available
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VehicleStatsList;
