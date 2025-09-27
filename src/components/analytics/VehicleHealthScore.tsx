import React from 'react';
import { Gauge, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface VehicleHealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const VehicleHealthScore: React.FC<VehicleHealthScoreProps> = ({ 
  score, 
  size = 'md', 
  showDetails = true 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Health Score</p>
          <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</p>
          {showDetails && (
            <p className="text-xs text-gray-500">{getScoreLabel(score)}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${getScoreBgColor(score)}`}>
          <Gauge className={`${iconSizes[size]} ${getScoreColor(score)}`} />
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm">
            {getScoreIcon(score)}
            <span className={getScoreColor(score)}>{getScoreLabel(score)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                score >= 80 ? 'bg-green-500' : 
                score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleHealthScore;
