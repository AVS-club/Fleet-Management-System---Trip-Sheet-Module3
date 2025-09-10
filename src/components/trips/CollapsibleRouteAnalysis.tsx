import React, { useState, useEffect } from 'react';
import { RouteAnalysis as RouteAnalysisType, Alert, Trip } from '@/types';
import { Map, TrendingUp, Clock, AlertTriangle, ChevronDown, ChevronUp, History, TrendingDown } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import { cn } from '../../utils/cn';

interface CollapsibleRouteAnalysisProps {
  analysis: RouteAnalysisType | null;
  alerts: Alert[];
  onAlertAction: (accepted: boolean, notes?: string) => void;
  isAnalyzing?: boolean;
  historicalTrips?: Trip[];
  vehicleId?: string;
  destinations?: string[];
}

const CollapsibleRouteAnalysis: React.FC<CollapsibleRouteAnalysisProps> = ({
  analysis,
  alerts,
  onAlertAction,
  isAnalyzing = false,
  historicalTrips = [],
  vehicleId,
  destinations = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [alertNotes, setAlertNotes] = useState('');
  const [historicalData, setHistoricalData] = useState<{
    sameVehicle: Trip[];
    sameRoute: Trip[];
    averages: {
      distance: number;
      time: number;
      fuel: number;
      expenses: number;
    };
  }>({ sameVehicle: [], sameRoute: [], averages: { distance: 0, time: 0, fuel: 0, expenses: 0 } });

  // Calculate historical data when trips change
  useEffect(() => {
    if (historicalTrips.length > 0) {
      // Filter trips by same vehicle
      const sameVehicle = vehicleId 
        ? historicalTrips.filter(t => t.vehicle_id === vehicleId).slice(0, 5)
        : [];

      // Filter trips by similar route (same destinations)
      const sameRoute = destinations.length > 0
        ? historicalTrips.filter(t => 
            t.destinations && 
            t.destinations.some(d => destinations.includes(d))
          ).slice(0, 5)
        : [];

      // Calculate averages
      const relevantTrips = sameRoute.length > 0 ? sameRoute : sameVehicle;
      const averages = relevantTrips.reduce((acc, trip) => {
        const distance = (trip.end_km || 0) - (trip.start_km || 0);
        const fuel = trip.fuel_quantity || 0;
        const expenses = trip.total_road_expenses || 0;
        
        return {
          distance: acc.distance + distance,
          time: acc.time + 1, // Count for now
          fuel: acc.fuel + fuel,
          expenses: acc.expenses + expenses
        };
      }, { distance: 0, time: 0, fuel: 0, expenses: 0 });

      if (relevantTrips.length > 0) {
        averages.distance = averages.distance / relevantTrips.length;
        averages.fuel = averages.fuel / relevantTrips.length;
        averages.expenses = averages.expenses / relevantTrips.length;
      }

      setHistoricalData({ sameVehicle, sameRoute, averages });
    }
  }, [historicalTrips, vehicleId, destinations]);

  const handleAlertAction = (accepted: boolean) => {
    onAlertAction(accepted, alertNotes);
    setAlertNotes('');
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={toggleExpanded}
          className={cn(
            "w-full p-4 flex items-center justify-between",
            "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
            "border-l-2 border-blue-500"
          )}
          disabled={isAnalyzing}
        >
          <div className="flex items-center">
            <Map className="h-5 w-5 mr-2 text-primary-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Route Analysis
            </h3>
            {analysis && !isExpanded && (
              <span className="ml-3 text-sm text-gray-500">
                {analysis.total_distance > 0 ? `${analysis.total_distance.toFixed(1)} km` : 'Click to analyze'}
              </span>
            )}
            {isAnalyzing && (
              <span className="ml-3 text-sm text-gray-500 italic">Analyzing...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {historicalData.sameRoute.length > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                {historicalData.sameRoute.length} similar trips
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-1">
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-3 text-gray-500">Analyzing route...</span>
              </div>
            ) : analysis ? (
              <>
                {/* Main Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Route Analysis Stats */}
                  <div className="space-y-4">
                    {/* Current Trip Stats */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Current Trip Analysis
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Actual Distance</div>
                          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {analysis.total_distance > 0 ? `${analysis.total_distance.toFixed(1)} km` : '—'}
                          </div>
                          {historicalData.averages.distance > 0 && (
                            <div className={cn(
                              "text-xs mt-1",
                              analysis.total_distance > historicalData.averages.distance * 1.1
                                ? "text-error-600"
                                : "text-success-600"
                            )}>
                              Avg: {historicalData.averages.distance.toFixed(1)} km
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Route Deviation</div>
                          <div className={cn(
                            "text-xl font-semibold",
                            Math.abs(analysis.deviation || 0) > 10
                              ? "text-error-600"
                              : "text-success-600"
                          )}>
                            {analysis.standard_distance > 0 ? `${(analysis.deviation || 0).toFixed(1)}%` : '—'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            From standard
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Est. Time</div>
                          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {analysis.estimated_time && analysis.estimated_time !== '—' ? analysis.estimated_time : '—'}
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">Est. Toll</div>
                          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            ₹{analysis.estimated_toll || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Historical Comparison */}
                    {(historicalData.sameRoute.length > 0 || historicalData.sameVehicle.length > 0) && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <History className="h-4 w-4 mr-1" />
                          Historical Comparison
                        </h4>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs">
                          <div className="space-y-2">
                            {historicalData.sameRoute.length > 0 && (
                              <div>
                                <span className="font-medium text-blue-700 dark:text-blue-400">
                                  {historicalData.sameRoute.length} trips on similar route
                                </span>
                                <div className="text-gray-600 dark:text-gray-400 mt-1">
                                  Avg fuel: {historicalData.averages.fuel.toFixed(1)}L • 
                                  Avg expense: ₹{historicalData.averages.expenses.toFixed(0)}
                                </div>
                              </div>
                            )}
                            {historicalData.sameVehicle.length > 0 && (
                              <div>
                                <span className="font-medium text-blue-700 dark:text-blue-400">
                                  {historicalData.sameVehicle.length} trips with same vehicle
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recent Similar Trips */}
                        {historicalData.sameRoute.slice(0, 3).map((trip, idx) => (
                          <div key={trip.id} className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                {new Date(trip.trip_start_date).toLocaleDateString()}
                              </span>
                              <span className="font-medium">
                                {(trip.end_km || 0) - (trip.start_km || 0)} km
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Map */}
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <GoogleMap 
                      waypoints={analysis.waypoints}
                      className="h-[350px] lg:h-full min-h-[350px] w-full"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Map className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Click to analyze the route for this trip</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alerts Section (outside collapsible) */}
      {Array.isArray(alerts) && alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-2 border-warning-500">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 mr-2 text-warning-500" />
            Route Alerts
          </h3>

          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  "border rounded-lg p-4",
                  alert.severity === 'high'
                    ? "border-error-200 bg-error-50 dark:bg-error-900/20"
                    : alert.severity === 'medium'
                    ? "border-warning-200 bg-warning-50 dark:bg-warning-900/20"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-900"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={cn(
                      "font-medium",
                      alert.severity === 'high'
                        ? "text-error-700 dark:text-error-400"
                        : alert.severity === 'medium'
                        ? "text-warning-700 dark:text-warning-400"
                        : "text-gray-700 dark:text-gray-300"
                    )}>
                      {alert.message}
                    </h4>
                    {alert.details && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {alert.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800"
                    placeholder="Add notes about this alert..."
                    value={alertNotes}
                    onChange={(e) => setAlertNotes(e.target.value)}
                  />

                  <div className="flex justify-end space-x-3 mt-3">
                    <button
                      type="button"
                      className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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

export default CollapsibleRouteAnalysis;