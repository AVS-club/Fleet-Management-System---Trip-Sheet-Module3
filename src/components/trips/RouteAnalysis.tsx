import React from 'react';
import { RouteAnalysis as RouteAnalysisType, Alert } from '../../types';
import { Map, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';

interface RouteAnalysisProps {
  analysis: RouteAnalysisType;
  alerts: Alert[];
  onAlertAction: (accepted: boolean, notes?: string) => void;
}

const RouteAnalysis: React.FC<RouteAnalysisProps> = ({
  analysis,
  alerts,
  onAlertAction
}) => {
  const [alertNotes, setAlertNotes] = React.useState('');

  const handleAlertAction = (accepted: boolean) => {
    onAlertAction(accepted, alertNotes);
    setAlertNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
          <Map className="h-5 w-5 mr-2 text-primary-500" />
          Route Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <TrendingUp className="h-4 w-4 mr-1" />
              Actual Distance
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {analysis.total_distance.toFixed(1)} km
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Standard: {analysis.standard_distance.toFixed(1)} km
            </div>
          </div>

          {analysis.deviation !== undefined && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Route Deviation
              </div>
              <div className={`text-2xl font-semibold ${
                Math.abs(analysis.deviation) > 10
                  ? 'text-error-600'
                  : 'text-success-600'
              }`}>
                {analysis.deviation.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                From standard route
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <Clock className="h-4 w-4 mr-1" />
              Estimated Time
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {analysis.estimated_time}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Based on standard route
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg overflow-hidden border border-gray-200">
          <GoogleMap 
            waypoints={analysis.waypoints}
            className="h-[400px] w-full"
          />
        </div>
      </div>

      {Array.isArray(alerts) && alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 mr-2 text-warning-500" />
            Route Alerts
          </h3>

          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  alert.severity === 'high'
                    ? 'border-error-200 bg-error-50'
                    : alert.severity === 'medium'
                    ? 'border-warning-200 bg-warning-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-medium ${
                      alert.severity === 'high'
                        ? 'text-error-700'
                        : alert.severity === 'medium'
                        ? 'text-warning-700'
                        : 'text-gray-700'
                    }`}>
                      {alert.message}
                    </h4>
                    {alert.details && (
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="Add notes about this alert..."
                    value={alertNotes}
                    onChange={(e) => setAlertNotes(e.target.value)}
                  />

                  <div className="flex justify-end space-x-3 mt-3">
                    <button
                      type="button"
                      className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
                      onClick={() => handleAlertAction(false)}
                    >
                      Reject Alert
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                      onClick={() => handleAlertAction(true)}
                    >
                      Accept Alert
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteAnalysis;