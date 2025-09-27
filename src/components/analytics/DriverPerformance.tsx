import React from 'react';
import { Users, Award, TrendingUp, MapPin } from 'lucide-react';

interface DriverPerformanceData {
  driverId: string;
  driverName: string;
  trips: number;
  totalDistance: number;
  totalCost: number;
  avgKmpl: number;
  costPerKm: number;
}

interface DriverPerformanceProps {
  drivers: DriverPerformanceData[];
  maxDisplay?: number;
}

const DriverPerformance: React.FC<DriverPerformanceProps> = ({ 
  drivers, 
  maxDisplay = 5 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getPerformanceBadge = (index: number) => {
    switch (index) {
      case 0:
        return { color: 'bg-yellow-100 text-yellow-800', icon: '🥇', label: 'Best' };
      case 1:
        return { color: 'bg-gray-100 text-gray-800', icon: '🥈', label: '2nd' };
      case 2:
        return { color: 'bg-orange-100 text-orange-800', icon: '🥉', label: '3rd' };
      default:
        return { color: 'bg-blue-100 text-blue-800', icon: `${index + 1}`, label: `${index + 1}th` };
    }
  };

  const getEfficiencyColor = (kmpl: number) => {
    if (kmpl >= 12) return 'text-green-600';
    if (kmpl >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyLabel = (kmpl: number) => {
    if (kmpl >= 12) return 'Excellent';
    if (kmpl >= 10) return 'Good';
    if (kmpl >= 8) return 'Average';
    return 'Poor';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-medium text-gray-900">Driver Performance</h3>
      </div>

      {drivers.length > 0 ? (
        <div className="space-y-3">
          {drivers.slice(0, maxDisplay).map((driver, index) => {
            const badge = getPerformanceBadge(index);
            return (
              <div key={driver.driverId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{driver.driverName}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {driver.trips} trips
                      </span>
                      <span>{driver.totalDistance.toLocaleString()} km</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-medium ${getEfficiencyColor(driver.avgKmpl)}`}>
                      {driver.avgKmpl.toFixed(1)} km/L
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      driver.avgKmpl >= 12 ? 'bg-green-100 text-green-800' :
                      driver.avgKmpl >= 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {getEfficiencyLabel(driver.avgKmpl)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(driver.costPerKm)}/km
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No driver performance data available</p>
          <p className="text-sm text-gray-400 mt-1">Driver data will appear here once trips are recorded</p>
        </div>
      )}

      {drivers.length > maxDisplay && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            Showing top {maxDisplay} drivers out of {drivers.length} total
          </p>
        </div>
      )}

      {/* Performance Summary */}
      {drivers.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Best Performer</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {drivers[0]?.driverName} - {drivers[0]?.avgKmpl.toFixed(1)} km/L
            </p>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Average Efficiency</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              {(drivers.reduce((sum, d) => sum + d.avgKmpl, 0) / drivers.length).toFixed(1)} km/L
            </p>
          </div>
          
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Total Drivers</span>
            </div>
            <p className="text-sm text-purple-600 mt-1">
              {drivers.length} active drivers
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverPerformance;
