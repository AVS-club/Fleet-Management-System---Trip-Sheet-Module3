import React, { useState, useEffect } from 'react';
import { ReturnTripValidator, ReturnTripAnalysis, ReturnTripIssue } from '../../utils/returnTripValidator';
import { AlertTriangle, CheckCircle, XCircle, ArrowRight, Clock, Fuel, Route, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';

interface ReturnTripValidationDashboardProps {
  className?: string;
}

const ReturnTripValidationDashboard: React.FC<ReturnTripValidationDashboardProps> = ({ className = '' }) => {
  const [systemAnalysis, setSystemAnalysis] = useState<any>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ReturnTripAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadSystemAnalysis();
  }, []);

  const loadSystemAnalysis = async () => {
    setLoading(true);
    try {
      const analysis = await ReturnTripValidator.getSystemWideReturnTripIssues();
      setSystemAnalysis(analysis);
    } catch (error) {
      console.error('Error loading return trip analysis:', error);
      toast.error('Failed to load return trip analysis');
    } finally {
      setLoading(false);
    }
  };

  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'distance_mismatch': return <Route className="h-4 w-4" />;
      case 'fuel_inconsistency': return <Fuel className="h-4 w-4" />;
      case 'time_gap': return <Clock className="h-4 w-4" />;
      case 'missing_return': return <ArrowRight className="h-4 w-4" />;
      case 'orphaned_return': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'distance_mismatch': return 'text-orange-600 bg-orange-50';
      case 'fuel_inconsistency': return 'text-blue-600 bg-blue-50';
      case 'time_gap': return 'text-purple-600 bg-purple-50';
      case 'missing_return': return 'text-yellow-600 bg-yellow-50';
      case 'orphaned_return': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatIssueTypeName = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderIssueDetails = (issue: ReturnTripIssue) => {
    return (
      <div key={`${issue.type}-${issue.trip_id}`} className={`border rounded-lg p-4 mb-3 ${getSeverityColor(issue.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getIssueTypeColor(issue.type)}`}>
              {getIssueTypeIcon(issue.type)}
              <span className="ml-1">{formatIssueTypeName(issue.type)}</span>
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
              {issue.severity.toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {issue.trip_serial_number}
            {issue.related_trip_serial && (
              <span className="ml-1">↔ {issue.related_trip_serial}</span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
        
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">Route:</span> {issue.route_description}
        </div>

        {issue.details && Object.keys(issue.details).length > 0 && (
          <div className="bg-white bg-opacity-50 rounded p-2 mb-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Details:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {issue.details.expected_value !== undefined && (
                <div>
                  <span className="font-medium">Expected:</span> {issue.details.expected_value}
                </div>
              )}
              {issue.details.actual_value !== undefined && (
                <div>
                  <span className="font-medium">Actual:</span> {issue.details.actual_value}
                </div>
              )}
              {issue.details.difference !== undefined && (
                <div>
                  <span className="font-medium">Difference:</span> {issue.details.difference.toFixed(2)}
                </div>
              )}
              {issue.details.time_gap_hours !== undefined && (
                <div>
                  <span className="font-medium">Time Gap:</span> {issue.details.time_gap_hours.toFixed(1)}h
                </div>
              )}
            </div>
          </div>
        )}

        {issue.recommendations.length > 0 && (
          <div className="bg-white bg-opacity-50 rounded p-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Recommendations:</p>
            <ul className="text-xs space-y-1">
              {issue.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderMetrics = (metrics: any) => {
    if (!metrics || Object.keys(metrics).length === 0) return null;

    return (
      <div className="bg-gray-50 rounded p-3 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Trip Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {metrics.outbound_distance !== undefined && (
            <div>
              <span className="text-gray-600">Outbound:</span>
              <span className="ml-1 font-medium">{metrics.outbound_distance.toFixed(1)} km</span>
            </div>
          )}
          {metrics.return_distance !== undefined && (
            <div>
              <span className="text-gray-600">Return:</span>
              <span className="ml-1 font-medium">{metrics.return_distance.toFixed(1)} km</span>
            </div>
          )}
          {metrics.distance_variance !== undefined && (
            <div>
              <span className="text-gray-600">Distance Variance:</span>
              <span className={`ml-1 font-medium ${metrics.distance_variance > 15 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.distance_variance.toFixed(1)}%
              </span>
            </div>
          )}
          {metrics.fuel_variance !== undefined && (
            <div>
              <span className="text-gray-600">Fuel Variance:</span>
              <span className={`ml-1 font-medium ${metrics.fuel_variance > 20 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.fuel_variance.toFixed(1)}%
              </span>
            </div>
          )}
          {metrics.time_gap_hours !== undefined && (
            <div>
              <span className="text-gray-600">Time Gap:</span>
              <span className={`ml-1 font-medium ${metrics.time_gap_hours > 48 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.time_gap_hours.toFixed(1)}h
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span>Analyzing return trip validation...</span>
        </div>
      </div>
    );
  }

  if (!systemAnalysis) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load return trip analysis</p>
          <button
            onClick={loadSystemAnalysis}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Return Trip Validation</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor round-trip consistency and detect data entry errors
            </p>
          </div>
          <button
            onClick={loadSystemAnalysis}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{systemAnalysis.total_trips_analyzed}</div>
            <div className="text-sm text-gray-600">Trips Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{systemAnalysis.trips_with_issues}</div>
            <div className="text-sm text-gray-600">With Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {systemAnalysis.total_trips_analyzed - systemAnalysis.trips_with_issues}
            </div>
            <div className="text-sm text-gray-600">Valid Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {Object.values(systemAnalysis.issues_by_type).reduce((a: number, b: any) => a + Number(b), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
        </div>
      </div>

      {/* Issue Type Breakdown */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Issues by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(systemAnalysis.issues_by_type).map(([type, count]: [string, any]) => (
            <div key={type} className={`flex items-center justify-between p-3 rounded ${getIssueTypeColor(type)}`}>
              <div className="flex items-center">
                {getIssueTypeIcon(type)}
                <span className="ml-2 font-medium">{formatIssueTypeName(type)}</span>
              </div>
              <span className="text-xl font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Issue Severity Breakdown */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Issues by Severity</h3>
        <div className="grid grid-cols-3 gap-4">
          {['high', 'medium', 'low'].map(severity => (
            <div key={severity} className={`flex items-center justify-between p-3 rounded border ${getSeverityColor(severity)}`}>
              <div className="flex items-center">
                {severity === 'high' && <XCircle className="h-5 w-5 mr-2" />}
                {severity === 'medium' && <AlertTriangle className="h-5 w-5 mr-2" />}
                {severity === 'low' && <TrendingUp className="h-5 w-5 mr-2" />}
                <span className="font-medium capitalize">{severity}</span>
              </div>
              <span className="text-xl font-bold">{systemAnalysis.issues_by_severity[severity] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trip Analysis List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Trip Analysis</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div className="space-y-3">
          {systemAnalysis.analyses.map((analysis: ReturnTripAnalysis) => (
            <div key={analysis.trip_id} className="border rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedAnalysis(selectedAnalysis?.trip_id === analysis.trip_id ? null : analysis)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="font-medium">{analysis.vehicle_registration}</span>
                      <div className="text-sm text-gray-600">
                        {analysis.has_return_trip ? (
                          <span className="text-green-600">Has return trip</span>
                        ) : (
                          <span className="text-yellow-600">No return trip</span>
                        )}
                        {analysis.is_round_trip && (
                          <span className="ml-2 text-blue-600">Round trip</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {analysis.issues.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {analysis.issues.length} issues
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedAnalysis?.trip_id === analysis.trip_id && showDetails && (
                <div className="border-t p-4 bg-gray-50">
                  {renderMetrics(analysis.metrics)}
                  
                  {analysis.issues.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Issues Found:</h4>
                      {analysis.issues.map(issue => renderIssueDetails(issue))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-600">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      No validation issues detected for this trip
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReturnTripValidationDashboard;