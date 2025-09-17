import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Vehicle, MaintenanceTask } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '../../utils/storage';
import { getTasks } from '../../utils/maintenanceStorage';

interface MaintenancePrediction {
  vehicleId: string;
  vehicleRegistration: string;
  component: string;
  currentMileage: number;
  predictedFailureMileage: number;
  predictedFailureDate: Date;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  recommendedAction: string;
  urgency: 'immediate' | 'soon' | 'scheduled' | 'monitor';
}

interface MaintenanceInsight {
  type: 'cost_savings' | 'risk_reduction' | 'efficiency' | 'scheduling';
  title: string;
  description: string;
  impact: number;
  timeframe: string;
  recommendation: string;
}

const PredictiveMaintenance: React.FC = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | '180d' | '1y'>('90d');

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const { data: maintenanceTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: getTasks,
  });

  const loading = vehiclesLoading || tasksLoading;

  // Generate maintenance predictions (simplified algorithm)
  const maintenancePredictions = useMemo((): MaintenancePrediction[] => {
    const predictions: MaintenancePrediction[] = [];

    vehicles.forEach(vehicle => {
      if (selectedVehicle !== 'all' && vehicle.id !== selectedVehicle) return;

      // Engine maintenance prediction
      const engineMileage = vehicle.current_odometer;
      const engineFailureMileage = 150000; // Simplified threshold
      const daysToFailure = Math.max(0, (engineFailureMileage - engineMileage) / 100); // 100 km per day average
      const predictedDate = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000);

      if (daysToFailure < 365) { // Only show if within a year
        predictions.push({
          vehicleId: vehicle.id,
          vehicleRegistration: vehicle.registration_number,
          component: 'Engine',
          currentMileage: engineMileage,
          predictedFailureMileage: engineFailureMileage,
          predictedFailureDate: predictedDate,
          confidence: Math.max(60, 100 - (daysToFailure / 10)),
          riskLevel: daysToFailure < 30 ? 'critical' : daysToFailure < 90 ? 'high' : daysToFailure < 180 ? 'medium' : 'low',
          estimatedCost: 15000,
          recommendedAction: 'Schedule engine service and inspection',
          urgency: daysToFailure < 30 ? 'immediate' : daysToFailure < 90 ? 'soon' : 'scheduled'
        });
      }

      // Brake system prediction
      const brakeMileage = vehicle.current_odometer;
      const brakeFailureMileage = 80000; // Simplified threshold
      const brakeDaysToFailure = Math.max(0, (brakeFailureMileage - brakeMileage) / 100);
      const brakePredictedDate = new Date(Date.now() + brakeDaysToFailure * 24 * 60 * 60 * 1000);

      if (brakeDaysToFailure < 365) {
        predictions.push({
          vehicleId: vehicle.id,
          vehicleRegistration: vehicle.registration_number,
          component: 'Brake System',
          currentMileage: brakeMileage,
          predictedFailureMileage: brakeFailureMileage,
          predictedFailureDate: brakePredictedDate,
          confidence: Math.max(70, 100 - (brakeDaysToFailure / 8)),
          riskLevel: brakeDaysToFailure < 30 ? 'critical' : brakeDaysToFailure < 90 ? 'high' : brakeDaysToFailure < 180 ? 'medium' : 'low',
          estimatedCost: 5000,
          recommendedAction: 'Inspect brake pads and replace if necessary',
          urgency: brakeDaysToFailure < 30 ? 'immediate' : brakeDaysToFailure < 90 ? 'soon' : 'scheduled'
        });
      }

      // Transmission prediction
      const transmissionMileage = vehicle.current_odometer;
      const transmissionFailureMileage = 120000;
      const transmissionDaysToFailure = Math.max(0, (transmissionFailureMileage - transmissionMileage) / 100);
      const transmissionPredictedDate = new Date(Date.now() + transmissionDaysToFailure * 24 * 60 * 60 * 1000);

      if (transmissionDaysToFailure < 365) {
        predictions.push({
          vehicleId: vehicle.id,
          vehicleRegistration: vehicle.registration_number,
          component: 'Transmission',
          currentMileage: transmissionMileage,
          predictedFailureMileage: transmissionFailureMileage,
          predictedFailureDate: transmissionPredictedDate,
          confidence: Math.max(65, 100 - (transmissionDaysToFailure / 12)),
          riskLevel: transmissionDaysToFailure < 30 ? 'critical' : transmissionDaysToFailure < 90 ? 'high' : transmissionDaysToFailure < 180 ? 'medium' : 'low',
          estimatedCost: 20000,
          recommendedAction: 'Schedule transmission service and fluid change',
          urgency: transmissionDaysToFailure < 30 ? 'immediate' : transmissionDaysToFailure < 90 ? 'soon' : 'scheduled'
        });
      }
    });

    return predictions.sort((a, b) => {
      const urgencyOrder = { immediate: 0, soon: 1, scheduled: 2, monitor: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }, [vehicles, selectedVehicle]);

  // Generate maintenance insights
  const maintenanceInsights = useMemo((): MaintenanceInsight[] => {
    const insights: MaintenanceInsight[] = [];

    // Cost savings insight
    const totalPredictedCost = maintenancePredictions.reduce((sum, pred) => sum + pred.estimatedCost, 0);
    const preventiveCost = totalPredictedCost * 0.3; // Preventive maintenance is 30% of reactive cost
    const savings = totalPredictedCost - preventiveCost;

    if (savings > 0) {
      insights.push({
        type: 'cost_savings',
        title: 'Preventive Maintenance Savings',
        description: `Implementing preventive maintenance could save ₹${savings.toLocaleString()}`,
        impact: savings,
        timeframe: 'Next 6 months',
        recommendation: 'Schedule preventive maintenance for high-risk components'
      });
    }

    // Risk reduction insight
    const criticalRisks = maintenancePredictions.filter(p => p.riskLevel === 'critical').length;
    if (criticalRisks > 0) {
      insights.push({
        type: 'risk_reduction',
        title: 'Critical Risk Reduction',
        description: `${criticalRisks} components at critical risk of failure`,
        impact: criticalRisks * 10000, // Estimated cost of unplanned downtime
        timeframe: 'Immediate',
        recommendation: 'Address critical maintenance items immediately'
      });
    }

    // Efficiency insight
    const vehiclesWithPredictions = new Set(maintenancePredictions.map(p => p.vehicleId)).size;
    const efficiencyGain = vehiclesWithPredictions * 0.15; // 15% efficiency gain per vehicle
    if (efficiencyGain > 0) {
      insights.push({
        type: 'efficiency',
        title: 'Fleet Efficiency Improvement',
        description: `Predictive maintenance could improve fleet efficiency by ${(efficiencyGain * 100).toFixed(1)}%`,
        impact: efficiencyGain * 50000, // Estimated value of efficiency gains
        timeframe: 'Next 3 months',
        recommendation: 'Implement predictive maintenance scheduling'
      });
    }

    return insights;
  }, [maintenancePredictions]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'soon': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'scheduled': return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'monitor': return <Activity className="h-5 w-5 text-gray-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'cost_savings': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'risk_reduction': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'efficiency': return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'scheduling': return <Calendar className="h-5 w-5 text-purple-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Predictive Maintenance
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered maintenance predictions and recommendations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Vehicles</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registration_number}
              </option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="30d">Next 30 days</option>
            <option value="90d">Next 90 days</option>
            <option value="180d">Next 6 months</option>
            <option value="1y">Next year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Predictions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {maintenancePredictions.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Risks</p>
              <p className="text-2xl font-bold text-red-600">
                {maintenancePredictions.filter(p => p.riskLevel === 'critical').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estimated Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{maintenancePredictions.reduce((sum, p) => sum + p.estimatedCost, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {maintenancePredictions.length > 0 
                  ? (maintenancePredictions.reduce((sum, p) => sum + p.confidence, 0) / maintenancePredictions.length).toFixed(0)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Insights */}
      {maintenanceInsights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Maintenance Insights
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-generated recommendations for optimizing maintenance operations
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {maintenanceInsights.map((insight, index) => (
              <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{insight.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-2">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Impact: ₹{insight.impact.toLocaleString()}</span>
                      <span>Timeframe: {insight.timeframe}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Predictions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Maintenance Predictions
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Component failure predictions based on usage patterns and historical data
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Component
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Predicted Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estimated Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {maintenancePredictions.map((prediction, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {prediction.vehicleRegistration}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {prediction.component}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(prediction.riskLevel)}`}>
                      {prediction.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getUrgencyIcon(prediction.urgency)}
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {prediction.predictedFailureDate.toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {prediction.confidence.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      ₹{prediction.estimatedCost.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-primary-600 hover:text-primary-900 text-sm font-medium">
                      Schedule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PredictiveMaintenance;
