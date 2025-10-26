import React from 'react';
import { DollarSign, TrendingUp, PieChart, BarChart3 } from 'lucide-react';

interface CostAnalyticsProps {
  totalCost: number;
  costPerKm: number;
  totalDistance: number;
  totalTrips: number;
  monthlyAverage?: number;
  tripAverage?: number;
}

const CostAnalytics: React.FC<CostAnalyticsProps> = ({
  totalCost,
  costPerKm,
  totalDistance,
  totalTrips,
  monthlyAverage,
  tripAverage
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyDetailed = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="h-5 w-5 text-green-500 dark:text-green-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Cost Analytics</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</span>
            <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Lifetime operational cost</p>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost per KM</span>
            <BarChart3 className="h-4 w-4 text-blue-400 dark:text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrencyDetailed(costPerKm)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Average cost per kilometer</p>
        </div>

        {monthlyAverage && (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Avg</span>
              <TrendingUp className="h-4 w-4 text-green-400 dark:text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlyAverage)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Average monthly cost</p>
          </div>
        )}

        {tripAverage && (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trip Avg</span>
              <PieChart className="h-4 w-4 text-purple-400 dark:text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(tripAverage)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Average cost per trip</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total Distance:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{totalDistance.toLocaleString()} km</span>
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total Trips:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{totalTrips}</span>
          </div>
        </div>
      </div>

      {/* Cost Efficiency Indicator */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            costPerKm < 10 ? 'bg-green-500' :
            costPerKm < 20 ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Cost Efficiency: {
              costPerKm < 10 ? 'Excellent' :
              costPerKm < 20 ? 'Good' : 'Needs Improvement'
            }
          </span>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
          {costPerKm < 10 ? 'Your vehicle is operating very cost-effectively.' :
           costPerKm < 20 ? 'Your vehicle has good cost efficiency.' :
           'Consider reviewing operational costs and efficiency.'}
        </p>
      </div>
    </div>
  );
};

export default CostAnalytics;
