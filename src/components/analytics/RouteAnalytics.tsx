import React from 'react';
import { Route, MapPin, TrendingUp, Navigation } from 'lucide-react';

interface RouteData {
  route: string;
  count: number;
  totalDistance: number;
  avgCost: number;
}

interface RouteAnalyticsProps {
  routes: RouteData[];
  maxDisplay?: number;
}

const RouteAnalytics: React.FC<RouteAnalyticsProps> = ({
  routes,
  maxDisplay = 5
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRouteIcon = (index: number) => {
    switch (index) {
      case 0:
        return { color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400', icon: '🏆' };
      case 1:
        return { color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', icon: '🥈' };
      case 2:
        return { color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', icon: '🥉' };
      default:
        return { color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', icon: `${index + 1}` };
    }
  };

  const getFrequencyColor = (count: number, maxCount: number) => {
    const percentage = (count / maxCount) * 100;
    if (percentage >= 80) return 'bg-green-500 dark:bg-green-600';
    if (percentage >= 60) return 'bg-yellow-500 dark:bg-yellow-600';
    if (percentage >= 40) return 'bg-orange-500 dark:bg-orange-600';
    return 'bg-red-500 dark:bg-red-600';
  };

  const getFrequencyLabel = (count: number, maxCount: number) => {
    const percentage = (count / maxCount) * 100;
    if (percentage >= 80) return 'Very High';
    if (percentage >= 60) return 'High';
    if (percentage >= 40) return 'Medium';
    return 'Low';
  };

  const maxCount = routes.length > 0 ? Math.max(...routes.map(r => r.count)) : 1;

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Route className="h-5 w-5 text-orange-500 dark:text-orange-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Route Analytics</h3>
      </div>

      {routes.length > 0 ? (
        <div className="space-y-3">
          {routes.slice(0, maxDisplay).map((route, index) => {
            const routeIcon = getRouteIcon(index);
            return (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${routeIcon.color}`}>
                    {routeIcon.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{route.route}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {route.totalDistance.toLocaleString()} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {route.count} trips
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Frequency</span>
                        <span>{getFrequencyLabel(route.count, maxCount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getFrequencyColor(route.count, maxCount)}`}
                          style={{ width: `${(route.count / maxCount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(route.avgCost)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">avg cost</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Route className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No route data available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Route analytics will appear here once trips are recorded</p>
        </div>
      )}

      {routes.length > maxDisplay && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Showing top {maxDisplay} routes out of {routes.length} total
          </p>
        </div>
      )}

      {/* Route Summary */}
      {routes.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Most Frequent</span>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1 truncate">
              {routes[0]?.route} - {routes[0]?.count} trips
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Distance</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              {routes.reduce((sum, r) => sum + r.totalDistance, 0).toLocaleString()} km
            </p>
          </div>

          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Unique Routes</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-300 mt-1">
              {routes.length} different routes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteAnalytics;
