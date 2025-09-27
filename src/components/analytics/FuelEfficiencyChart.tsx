import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FuelEfficiencyChartProps {
  current: number;
  baseline: number;
  trend: number;
  period?: string;
}

const FuelEfficiencyChart: React.FC<FuelEfficiencyChartProps> = ({
  current,
  baseline,
  trend,
  period = '30 days'
}) => {
  const getTrendIcon = () => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (trend > 5) return 'text-green-600';
    if (trend < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendLabel = () => {
    if (trend > 5) return 'Improving';
    if (trend < -5) return 'Declining';
    return 'Stable';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Fuel Efficiency</h3>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {getTrendLabel()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Current ({period})</p>
          <p className="text-2xl font-bold text-blue-600">{current.toFixed(1)}</p>
          <p className="text-xs text-gray-500">km/L</p>
        </div>

        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Baseline</p>
          <p className="text-2xl font-bold text-gray-600">{baseline.toFixed(1)}</p>
          <p className="text-xs text-gray-500">km/L</p>
        </div>

        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Trend</p>
          <p className={`text-2xl font-bold ${getTrendColor()}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">vs baseline</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Efficiency Status:</span>
          <span className={`font-medium ${getTrendColor()}`}>
            {current > baseline ? 'Above Average' : 
             current < baseline * 0.9 ? 'Below Average' : 'Average'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FuelEfficiencyChart;
