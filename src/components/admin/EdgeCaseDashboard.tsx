import React, { useState, useEffect } from 'react';
import { EdgeCaseHandler, EdgeCaseDetection, DataRecoveryScenario } from '../../utils/edgeCaseHandler';
import { AlertTriangle, Shield, Wrench, Zap, Database, Activity, RefreshCw, Eye, CheckCircle, XCircle, Clock, TrendingUp, FileQuestion } from 'lucide-react';
import { toast } from 'react-toastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EdgeCaseDashboard');

interface EdgeCaseDashboardProps {
  className?: string;
}

const EdgeCaseDashboard: React.FC<EdgeCaseDashboardProps> = ({ className = '' }) => {
  const [systemAnalysis, setSystemAnalysis] = useState<any>(null);
  const [selectedDetection, setSelectedDetection] = useState<EdgeCaseDetection | null>(null);
  const [recoveryScenarios, setRecoveryScenarios] = useState<DataRecoveryScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);

  useEffect(() => {
    loadSystemAnalysis();
  }, []);

  const loadSystemAnalysis = async () => {
    setLoading(true);
    try {
      const analysis = await EdgeCaseHandler.getSystemWideEdgeCases();
      setSystemAnalysis(analysis);
    } catch (error) {
      logger.error('Error loading edge case analysis:', error);
      toast.error('Failed to load edge case analysis');
    } finally {
      setLoading(false);
    }
  };

  const loadRecoveryScenarios = async () => {
    try {
      const allScenarios: DataRecoveryScenario[] = [];
      
      // Get all active vehicles from storage
      const { getVehicles } = await import('../../utils/storage');
      const vehicles = await getVehicles();
      
      // Analyze recovery scenarios for each vehicle (limit to first 5 for performance)
      const vehiclesToAnalyze = vehicles.slice(0, 5);
      
      for (const vehicle of vehiclesToAnalyze) {
        if (vehicle.id) {
          const scenarios = await EdgeCaseHandler.analyzeDataRecovery(vehicle.id);
          allScenarios.push(...scenarios);
        }
      }
      
      setRecoveryScenarios(allScenarios);
    } catch (error) {
      logger.error('Error loading recovery scenarios:', error);
      toast.error('Failed to load recovery scenarios');
    }
  };

  const getCaseTypeIcon = (caseType: string) => {
    switch (caseType) {
      case 'maintenance_trip': return <Wrench className="h-4 w-4" />;
      case 'emergency_trip': return <Zap className="h-4 w-4" />;
      case 'data_anomaly': return <Database className="h-4 w-4" />;
      case 'breakdown_trip': return <AlertTriangle className="h-4 w-4" />;
      case 'unusual_pattern': return <TrendingUp className="h-4 w-4" />;
      case 'recovery_scenario': return <FileQuestion className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getCaseTypeColor = (caseType: string) => {
    switch (caseType) {
      case 'maintenance_trip': return 'text-blue-600 bg-blue-50';
      case 'emergency_trip': return 'text-red-600 bg-red-50';
      case 'data_anomaly': return 'text-orange-600 bg-orange-50';
      case 'breakdown_trip': return 'text-purple-600 bg-purple-50';
      case 'unusual_pattern': return 'text-yellow-600 bg-yellow-50';
      case 'recovery_scenario': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'dismissed': return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Eye className="h-4 w-4 text-orange-600" />;
    }
  };

  const formatCaseTypeName = (caseType: string) => {
    return caseType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderDetectionCard = (detection: EdgeCaseDetection) => {
    return (
      <div key={detection.case_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCaseTypeColor(detection.case_type)}`}>
              {getCaseTypeIcon(detection.case_type)}
              <span className="ml-1">{formatCaseTypeName(detection.case_type)}</span>
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(detection.severity)}`}>
              {detection.severity.toUpperCase()}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {detection.confidence_score}% confidence
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(detection.resolution_status)}
            {detection.requires_manual_review && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Manual Review
              </span>
            )}
          </div>
        </div>

        <div className="mb-3">
          <h4 className="font-medium text-gray-900 mb-1">{detection.vehicle_registration}</h4>
          <p className="text-sm text-gray-700">{detection.description}</p>
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Patterns Detected:</p>
          <div className="flex flex-wrap gap-1">
            {detection.patterns_detected.map((pattern, idx) => (
              <span key={idx} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {pattern}
              </span>
            ))}
          </div>
        </div>

        {detection.context.trip_details && (
          <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <span className="font-medium">Serial:</span> {detection.context.trip_details.serial}
              </div>
              <div>
                <span className="font-medium">Distance:</span> {detection.context.trip_details.distance} km
              </div>
              <div>
                <span className="font-medium">Duration:</span> {detection.context.trip_details.duration_hours?.toFixed(1)}h
              </div>
              {detection.context.trip_details.efficiency && (
                <div>
                  <span className="font-medium">Efficiency:</span> {detection.context.trip_details.efficiency} km/l
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Detected: {formatDate(detection.detected_at)}
          </span>
          <button
            onClick={() => setSelectedDetection(selectedDetection?.case_id === detection.case_id ? null : detection)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {selectedDetection?.case_id === detection.case_id ? 'Hide Details' : 'View Details'}
          </button>
        </div>

        {selectedDetection?.case_id === detection.case_id && (
          <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
            {detection.auto_actions_taken.length > 0 && (
              <div className="mb-3">
                <h5 className="font-medium text-gray-900 mb-2">Auto Actions Taken:</h5>
                <ul className="text-sm space-y-1">
                  {detection.auto_actions_taken.map((action, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                      {action.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
              <ul className="text-sm space-y-1">
                {detection.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRecoveryScenario = (scenario: DataRecoveryScenario) => {
    return (
      <div key={scenario.scenario_id} className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">{formatCaseTypeName(scenario.scenario_type)}</h4>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {scenario.affected_trips.length} trips affected
          </span>
        </div>

        <div className="mb-3">
          <h5 className="font-medium text-gray-900 mb-2">Data Inconsistencies:</h5>
          <div className="space-y-2">
            {scenario.data_inconsistencies.map((issue, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                <div className="font-medium text-red-800">{issue.field}</div>
                <div className="text-red-700">
                  Expected: {issue.expected_value}, Got: {issue.actual_value}
                  <span className="ml-2 text-xs">({issue.confidence}% confidence)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <h5 className="font-medium text-gray-900 mb-2">Recovery Options:</h5>
          <div className="space-y-2">
            {scenario.recovery_options.map((option, idx) => (
              <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                <div className="font-medium text-blue-800">{option.method.replace(/_/g, ' ')}</div>
                <div className="text-blue-700 mb-1">{option.description}</div>
                <div className="flex space-x-4 text-xs">
                  <span className={`${option.risk_level === 'low' ? 'text-green-600' : option.risk_level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                    Risk: {option.risk_level}
                  </span>
                  <span>Success: {option.success_probability}%</span>
                  <span>Accuracy: {option.estimated_accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="font-medium text-green-800 text-sm">Recommended Action:</div>
          <div className="text-green-700 text-sm">{scenario.recommended_action}</div>
        </div>
      </div>
    );
  };

  if (loading && !systemAnalysis) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span>Analyzing edge cases...</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Edge Case Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Detect and manage special scenarios, anomalies, and data recovery situations
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowRecoveryPanel(!showRecoveryPanel);
                if (!showRecoveryPanel) loadRecoveryScenarios();
              }}
              className={`flex items-center px-4 py-2 rounded ${showRecoveryPanel ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-100'} hover:bg-blue-700`}
            >
              <Database className="h-4 w-4 mr-2" />
              Data Recovery
            </button>
            <button
              onClick={loadSystemAnalysis}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* System Overview */}
      {systemAnalysis && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{systemAnalysis.total_cases_detected}</div>
              <div className="text-sm text-gray-600">Total Cases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemAnalysis.pending_reviews}</div>
              <div className="text-sm text-gray-600">Pending Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {systemAnalysis.cases_by_severity?.critical || 0}
              </div>
              <div className="text-sm text-gray-600">Critical Cases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {systemAnalysis.total_cases_detected - systemAnalysis.pending_reviews}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
          </div>

          {/* Case Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {Object.entries(systemAnalysis.cases_by_type).map(([type, count]: [string, any]) => (
              <div key={type} className={`flex items-center justify-between p-3 rounded ${getCaseTypeColor(type)}`}>
                <div className="flex items-center">
                  {getCaseTypeIcon(type)}
                  <span className="ml-2 font-medium">{formatCaseTypeName(type)}</span>
                </div>
                <span className="text-xl font-bold">{count}</span>
              </div>
            ))}
          </div>

          {/* Severity Breakdown */}
          <div className="grid grid-cols-4 gap-4">
            {['critical', 'high', 'medium', 'low'].map(severity => (
              <div key={severity} className={`flex items-center justify-between p-3 rounded border ${getSeverityColor(severity)}`}>
                <span className="font-medium capitalize">{severity}</span>
                <span className="text-xl font-bold">{systemAnalysis.cases_by_severity[severity] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {showRecoveryPanel ? (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Recovery Scenarios</h3>
            {recoveryScenarios.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No data recovery scenarios detected</p>
                <p className="text-sm text-gray-500 mt-1">Your data appears to be consistent and complete</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recoveryScenarios.map(scenario => renderRecoveryScenario(scenario))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Edge Case Detections</h3>
            {systemAnalysis?.recent_detections.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No edge cases detected</p>
                <p className="text-sm text-gray-500 mt-1">All trips appear to follow normal patterns</p>
              </div>
            ) : (
              <div className="space-y-4">
                {systemAnalysis?.recent_detections.map((detection: EdgeCaseDetection) => renderDetectionCard(detection))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EdgeCaseDashboard;