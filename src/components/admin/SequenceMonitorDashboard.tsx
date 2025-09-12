import React, { useState, useEffect } from 'react';
import { SerialSequenceMonitor, SequenceAnalysis, SerialSequenceIssue } from '../../utils/serialSequenceMonitor';
import { AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw, Truck, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

interface SequenceMonitorDashboardProps {
  className?: string;
}

const SequenceMonitorDashboard: React.FC<SequenceMonitorDashboardProps> = ({ className = '' }) => {
  const [systemAnalysis, setSystemAnalysis] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<SequenceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadSystemAnalysis();
  }, []);

  const loadSystemAnalysis = async () => {
    setLoading(true);
    try {
      const analysis = await SerialSequenceMonitor.getSystemWideSequenceIssues();
      setSystemAnalysis(analysis);
    } catch (error) {
      console.error('Error loading sequence analysis:', error);
      toast.error('Failed to load sequence analysis');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <Eye className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const renderIssueDetails = (issue: SerialSequenceIssue) => {
    return (
      <div key={`${issue.type}-${issue.serial_number}`} className="border rounded-lg p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
              {getSeverityIcon(issue.severity)}
              <span className="ml-1 capitalize">{issue.severity}</span>
            </span>
            <span className="text-sm font-medium">
              {issue.type === 'gap' ? 'Sequence Gap' : 'Duplicate Serial'}
            </span>
          </div>
          <span className="text-xs text-gray-500">{issue.serial_number}</span>
        </div>

        <p className="text-sm text-gray-700 mb-2">{issue.description}</p>

        {issue.type === 'gap' && issue.missing_serials && (
          <div className="bg-gray-50 rounded p-2 mb-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Missing Serial Numbers:</p>
            <div className="flex flex-wrap gap-1">
              {issue.missing_serials.slice(0, 10).map(serial => (
                <span key={serial} className="inline-block bg-white px-2 py-1 rounded text-xs border">
                  {serial}
                </span>
              ))}
              {issue.missing_serials.length > 10 && (
                <span className="text-xs text-gray-500">
                  +{issue.missing_serials.length - 10} more...
                </span>
              )}
            </div>
          </div>
        )}

        {issue.type === 'duplicate' && issue.duplicate_trips && (
          <div className="bg-gray-50 rounded p-2 mb-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Duplicate Trips:</p>
            {issue.duplicate_trips.map(trip => (
              <div key={trip.id} className="text-xs text-gray-600 flex justify-between">
                <span>{trip.driver_name || 'Unknown Driver'}</span>
                <span>{new Date(trip.trip_start_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {issue.date_range && (
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(issue.date_range.start_date).toLocaleDateString()} - 
            {new Date(issue.date_range.end_date).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span>Analyzing sequence integrity...</span>
        </div>
      </div>
    );
  }

  if (!systemAnalysis) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load sequence analysis</p>
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
            <h2 className="text-xl font-semibold text-gray-900">Serial Number Sequence Monitor</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor trip serial number integrity and detect gaps or duplicates
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
            <div className="text-2xl font-bold text-gray-900">{systemAnalysis.total_vehicles_checked}</div>
            <div className="text-sm text-gray-600">Vehicles Checked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{systemAnalysis.vehicles_with_issues}</div>
            <div className="text-sm text-gray-600">With Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{systemAnalysis.total_issues}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {systemAnalysis.total_vehicles_checked - systemAnalysis.vehicles_with_issues}
            </div>
            <div className="text-sm text-gray-600">Clean Vehicles</div>
          </div>
        </div>
      </div>

      {/* Issue Severity Breakdown */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Issues by Severity</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-red-50 rounded">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium">High</span>
            </div>
            <span className="text-xl font-bold text-red-600">{systemAnalysis.issues_by_severity.high}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium">Medium</span>
            </div>
            <span className="text-xl font-bold text-yellow-600">{systemAnalysis.issues_by_severity.medium}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Low</span>
            </div>
            <span className="text-xl font-bold text-blue-600">{systemAnalysis.issues_by_severity.low}</span>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Analysis</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div className="space-y-3">
          {systemAnalysis.vehicle_analyses.map((analysis: SequenceAnalysis) => (
            <div key={analysis.vehicle_id} className="border rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedVehicle(selectedVehicle?.vehicle_id === analysis.vehicle_id ? null : analysis)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="font-medium">{analysis.vehicle_registration}</span>
                      <div className="text-sm text-gray-600">
                        {analysis.total_trips} trips, {analysis.issues.length} issues
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
                        Clean
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedVehicle?.vehicle_id === analysis.vehicle_id && showDetails && (
                <div className="border-t p-4 bg-gray-50">
                  {analysis.issues.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Issues Found:</h4>
                      {analysis.issues.map(issue => renderIssueDetails(issue))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-600">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      No sequence issues detected for this vehicle
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

export default SequenceMonitorDashboard;