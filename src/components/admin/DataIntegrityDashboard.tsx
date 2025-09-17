import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Database,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';
import { DataIntegrityValidator, ValidationResult } from '../../utils/dataIntegrityValidator';
import { getVehicles } from '../../utils/storage';
import { Vehicle } from '@/types';
import Button from '../ui/Button';

interface DataQualitySummary {
  totalTrips: number;
  averageScore: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  warnings: number;
}

interface VehicleValidationResult {
  vehicle: Vehicle;
  results: ValidationResult[];
  averageScore: number;
  totalIssues: number;
}

const DataIntegrityDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [vehicleResults, setVehicleResults] = useState<VehicleValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadDataQualitySummary();
    loadVehicleResults();
  }, []);

  const loadDataQualitySummary = async () => {
    try {
      const summary = await DataIntegrityValidator.getDataQualitySummary();
      setSummary(summary);
    } catch (error) {
      console.error('Error loading data quality summary:', error);
    }
  };

  const loadVehicleResults = async () => {
    try {
      const vehicles = await getVehicles();
      const results: VehicleValidationResult[] = [];

      for (const vehicle of vehicles) {
        try {
          const validationResults = await DataIntegrityValidator.validateVehicleTrips(vehicle.id);
          const averageScore = validationResults.length > 0 
            ? validationResults.reduce((sum, result) => sum + result.score, 0) / validationResults.length
            : 100;
          
          const totalIssues = validationResults.reduce((sum, result) => 
            sum + result.errors.length + result.warnings.length, 0
          );

          results.push({
            vehicle,
            results: validationResults,
            averageScore,
            totalIssues
          });
        } catch (error) {
          console.error(`Error validating trips for vehicle ${vehicle.registration_number}:`, error);
        }
      }

      setVehicleResults(results);
    } catch (error) {
      console.error('Error loading vehicle results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 75) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredVehicleResults = vehicleResults.filter(result => {
    if (filter === 'all') return true;
    
    const hasIssues = result.results.some(validation => 
      validation.errors.some(error => error.severity === filter)
    );
    
    return hasIssues;
  });

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
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-primary-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Integrity Dashboard</h2>
            <p className="text-gray-600">Monitor and validate trip data quality</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setLoading(true);
            loadDataQualitySummary();
            loadVehicleResults();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Quality Score</p>
                <p className="text-3xl font-bold text-gray-900">{summary.averageScore.toFixed(1)}</p>
              </div>
              <div className={`p-3 rounded-full ${getQualityBadgeColor(summary.averageScore)}`}>
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {getQualityLabel(summary.averageScore)} data quality
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Trips</p>
                <p className="text-3xl font-bold text-gray-900">{summary.totalTrips}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Database className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Trips analyzed</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600">{summary.criticalIssues}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Require immediate attention</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Warnings</p>
                <p className="text-3xl font-bold text-yellow-600">{summary.warnings}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Need review</p>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by severity:</span>
        </div>
        <div className="flex space-x-2">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setFilter(severity)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === severity
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Results */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Vehicle Data Quality</h3>
          <p className="text-sm text-gray-600">Data integrity analysis by vehicle</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicleResults.map((result) => (
                <tr key={result.vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.vehicle.registration_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.vehicle.make} {result.vehicle.model}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {result.averageScore.toFixed(1)}
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getQualityBadgeColor(result.averageScore)}`}>
                        {getQualityLabel(result.averageScore)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {result.totalIssues} total issues
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.results.reduce((sum, r) => sum + r.errors.filter(e => e.severity === 'critical').length, 0)} critical
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.averageScore >= 90 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </span>
                    ) : result.averageScore >= 75 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Critical
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedVehicle(
                        selectedVehicle === result.vehicle.id ? null : result.vehicle.id
                      )}
                      className="text-primary-600 hover:text-primary-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedVehicle === result.vehicle.id ? 'Hide' : 'View'} Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed View */}
      {selectedVehicle && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Validation Results</h3>
            <p className="text-sm text-gray-600">Issues and recommendations for selected vehicle</p>
          </div>
          
          <div className="p-6">
            {(() => {
              const result = vehicleResults.find(r => r.vehicle.id === selectedVehicle);
              if (!result) return null;

              return (
                <div className="space-y-4">
                  {result.results.map((validation, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Trip #{index + 1} - {validation.score.toFixed(1)}% Quality
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getQualityBadgeColor(validation.score)}`}>
                          {getQualityLabel(validation.score)}
                        </span>
                      </div>
                      
                      {validation.errors.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Errors:</h5>
                          <div className="space-y-2">
                            {validation.errors.map((error, errorIndex) => (
                              <div key={errorIndex} className={`p-3 rounded-lg ${getSeverityColor(error.severity)}`}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">{error.field}: {error.message}</p>
                                    {error.suggestedFix && (
                                      <p className="text-sm mt-1 opacity-90">
                                        <strong>Fix:</strong> {error.suggestedFix}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs font-medium uppercase">
                                    {error.severity}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {validation.warnings.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Warnings:</h5>
                          <div className="space-y-2">
                            {validation.warnings.map((warning, warningIndex) => (
                              <div key={warningIndex} className="p-3 rounded-lg bg-yellow-50 text-yellow-800">
                                <p className="font-medium">{warning.field}: {warning.message}</p>
                                <p className="text-sm mt-1 opacity-90">
                                  <strong>Recommendation:</strong> {warning.recommendation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIntegrityDashboard;
