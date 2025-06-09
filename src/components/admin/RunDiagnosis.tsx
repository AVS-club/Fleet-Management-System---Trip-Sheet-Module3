import React, { useState } from 'react';
import diagnoseBug, { DiagnosisResult } from '../../diagnose';
import { logger } from '../../utils/logger';
import Button from '../ui/Button';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const RunDiagnosis: React.FC = () => {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    logs: false,
    state: false
  });

  const handleRunDiagnosis = async () => {
    setIsLoading(true);
    try {
      // Get current logs
      const logs = logger.getLogs();

      // Create a state snapshot
      const stateSnapshot = {
        currentRoute: window.location.pathname,
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          try {
            acc[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            acc[key] = localStorage.getItem(key);
          }
          return acc;
        }, {} as Record<string, any>),
        navigator: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          onLine: navigator.onLine
        }
      };

      // Run the diagnosis
      const diagnosisResult = await diagnoseBug(logs, stateSnapshot);
      setDiagnosis(diagnosisResult);
    } catch (error) {
      logger.error('Diagnosis failed:', error);
      setDiagnosis({
        summary: 'Diagnosis failed to complete',
        issues: [{
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          recommendation: 'Check the console for more details'
        }],
        recommendations: ['Review the application logs for more information']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">System Diagnosis</h2>
            <p className="text-sm text-gray-500 mt-1">
              Analyze application logs and state to identify potential issues
            </p>
          </div>
          <Button
            onClick={handleRunDiagnosis}
            isLoading={isLoading}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Run Diagnosis
          </Button>
        </div>

        {diagnosis && (
          <div className="mt-6 space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900">Diagnosis Summary</h3>
              <p className="mt-1 text-sm text-gray-600">{diagnosis.summary}</p>
            </div>

            {/* Issues */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Identified Issues</h3>
              {diagnosis.issues.length > 0 ? (
                <div className="space-y-3">
                  {diagnosis.issues.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        issue.type === 'error'
                          ? 'bg-error-50 border border-error-200'
                          : issue.type === 'warning'
                          ? 'bg-warning-50 border border-warning-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <div className="flex items-start">
                        {issue.type === 'error' ? (
                          <XCircle className="h-5 w-5 text-error-500 mt-0.5" />
                        ) : issue.type === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-warning-500 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        )}
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            issue.type === 'error'
                              ? 'text-error-800'
                              : issue.type === 'warning'
                              ? 'text-warning-800'
                              : 'text-blue-800'
                          }`}>
                            {issue.message}
                          </p>
                          {issue.recommendation && (
                            <p className={`mt-1 text-sm ${
                              issue.type === 'error'
                                ? 'text-error-600'
                                : issue.type === 'warning'
                                ? 'text-warning-600'
                                : 'text-blue-600'
                            }`}>
                              Recommendation: {issue.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No issues identified</p>
              )}
            </div>

            {/* Recommendations */}
            {diagnosis.recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900">Recommendations</h3>
                <ul className="mt-2 space-y-2">
                  {diagnosis.recommendations.map((recommendation, index) => (
                    <li
                      key={index}
                      className="flex items-start text-sm text-gray-600"
                    >
                      <CheckCircle className="h-4 w-4 text-success-500 mt-1 mr-2 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expandable Sections */}
            <div className="space-y-4">
              {/* Logs Section */}
              <div className="border rounded-lg">
                <button
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                  onClick={() => toggleSection('logs')}
                >
                  <span className="text-sm font-medium text-gray-900">Raw Logs</span>
                  {expandedSections.logs ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.logs && (
                  <div className="px-4 pb-4">
                    <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                      {JSON.stringify(logger.getLogs(), null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* State Section */}
              <div className="border rounded-lg">
                <button
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                  onClick={() => toggleSection('state')}
                >
                  <span className="text-sm font-medium text-gray-900">Application State</span>
                  {expandedSections.state ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.state && (
                  <div className="px-4 pb-4">
                    <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                      {JSON.stringify({
                        currentRoute: window.location.pathname,
                        localStorage: Object.keys(localStorage).reduce((acc, key) => {
                          try {
                            acc[key] = JSON.parse(localStorage.getItem(key) || 'null');
                          } catch {
                            acc[key] = localStorage.getItem(key);
                          }
                          return acc;
                        }, {} as Record<string, any>)
                      }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunDiagnosis;