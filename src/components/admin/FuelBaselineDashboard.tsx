import React, { useState, useEffect } from 'react';
import { FuelEfficiencyBaselineManager, FuelEfficiencyBaseline, BaselineAnalysis } from '../../utils/fuelEfficiencyBaselineManager';
import { Fuel, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Target, BarChart3, Activity } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../utils/supabaseClient';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FuelBaselineDashboard');

interface FuelBaselineDashboardProps {
  className?: string;
}

const FuelBaselineDashboard: React.FC<FuelBaselineDashboardProps> = ({ className = '' }) => {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [vehicleAnalyses, setVehicleAnalyses] = useState<BaselineAnalysis[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [establishingBaselines, setEstablishingBaselines] = useState(false);

  useEffect(() => {
    loadSystemStatus();
    loadVehicleAnalyses();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const status = await FuelEfficiencyBaselineManager.getSystemWideBaselineStatus();
      setSystemStatus(status);
      
      // Handle any errors returned from the status call
      if (status.error) {
        toast.error(`Baseline status error: ${status.error}`);
      }
    } catch (error) {
      logger.error('Error loading system status:', error);
      toast.error('Failed to load baseline status');
    }
  };

  const loadVehicleAnalyses = async () => {
    setLoading(true);
    try {
      // Get real vehicle data from database
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .is('deleted_at', null)
        .order('registration_number');

      if (vehiclesError) {
        logger.error('Error fetching vehicles:', vehiclesError);
        toast.error('Failed to fetch vehicle list');
        return;
      }

      if (!vehicles || vehicles.length === 0) {
        logger.debug('No vehicles found in database');
        setVehicleAnalyses([]);
        toast.info('No vehicles found. Please add vehicles first.');
        return;
      }
      
      const analyses: BaselineAnalysis[] = [];
      for (const vehicle of vehicles) {
        try {
          const analysis = await FuelEfficiencyBaselineManager.analyzeVehicle(vehicle.id);
          if (analysis) {
            analyses.push(analysis);
          }
        } catch (error) {
          logger.error(`Error analyzing vehicle ${vehicle.registration_number} (${vehicle.id}):`, error);
          // Continue with other vehicles even if one fails
        }
      }
      
      setVehicleAnalyses(analyses);
      
      if (analyses.length === 0 && vehicles.length > 0) {
        toast.info('No vehicle analysis data available. Vehicles may need more trip data for baseline calculations.');
      }
    } catch (error) {
      logger.error('Error loading vehicle analyses:', error);
      toast.error('Failed to load vehicle analyses');
    } finally {
      setLoading(false);
    }
  };

  const establishBaselinesForAll = async () => {
    setEstablishingBaselines(true);
    try {
      const result = await FuelEfficiencyBaselineManager.establishBaselinesForAllVehicles();
      
      // Show detailed results
      const successMsg = `Baselines established: ${result.success} successful, ${result.failed} failed, ${result.skipped} skipped`;
      
      if (result.success > 0) {
        toast.success(successMsg);
      } else if (result.failed > 0) {
        toast.warning(successMsg);
      } else {
        toast.info(successMsg);
      }
      
      // Show detailed error information
      const failedResults = result.results.filter(r => r.status === 'failed');
      if (failedResults.length > 0) {
        logger.debug('Failed baseline establishments:', failedResults);
        const errorMessages = failedResults.map(r => `${r.registration}: ${r.reason}`).join(', ');
        if (errorMessages.length < 200) { // Keep toast message reasonable
          toast.error(`Failures: ${errorMessages}`);
        }
      }
      
      // Reload data
      await loadSystemStatus();
      await loadVehicleAnalyses();
    } catch (error) {
      logger.error('Error establishing baselines:', error);
      if (error instanceof Error) {
        toast.error(`Failed to establish baselines: ${error.message}`);
      } else {
        toast.error('Failed to establish baselines for vehicles');
      }
    } finally {
      setEstablishingBaselines(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderBaselineCard = (baseline: FuelEfficiencyBaseline) => {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">{baseline.vehicle_registration}</h4>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(baseline.confidence_score)}`}>
            {baseline.confidence_score}% confidence
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <span className="text-sm text-gray-600">Baseline Efficiency</span>
            <div className="text-lg font-semibold text-gray-900">{baseline.baseline_kmpl} km/l</div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Sample Size</span>
            <div className="text-lg font-semibold text-gray-900">{baseline.sample_size} trips</div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <div>Calculated: {formatDate(baseline.baseline_calculated_date)}</div>
          <div>Distance: {baseline.data_range.total_distance} km | Fuel: {baseline.data_range.total_fuel} L</div>
        </div>
      </div>
    );
  };

  const renderVehicleAnalysis = (analysis: BaselineAnalysis) => {
    return (
      <div key={analysis.vehicle_id} className="bg-white rounded-lg border">
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => setSelectedVehicleId(selectedVehicleId === analysis.vehicle_id ? null : analysis.vehicle_id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Fuel className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">{analysis.vehicle_registration}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    30-day avg: {analysis.trend_analysis.last_30_days.avg_kmpl} km/l
                  </span>
                  <span className="flex items-center">
                    {getTrendIcon(analysis.trend_analysis.last_30_days.trend_direction)}
                    <span className={`ml-1 ${getTrendColor(analysis.trend_analysis.last_30_days.trend_direction)}`}>
                      {analysis.trend_analysis.last_30_days.trend_direction}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {analysis.current_baseline ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Baseline set
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  No baseline
                </span>
              )}
              {analysis.recent_deviations.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {analysis.recent_deviations.length} deviations
                </span>
              )}
              {analysis.needs_baseline_update && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Update needed
                </span>
              )}
            </div>
          </div>
        </div>

        {selectedVehicleId === analysis.vehicle_id && (
          <div className="border-t bg-gray-50 p-4">
            {analysis.current_baseline && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Current Baseline</h4>
                {renderBaselineCard(analysis.current_baseline)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded p-3">
                <h5 className="font-medium text-gray-900 mb-2">30-Day Performance</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium">{analysis.trend_analysis.last_30_days.avg_kmpl} km/l</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deviation:</span>
                    <span className={`font-medium ${analysis.trend_analysis.last_30_days.deviation_from_baseline > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analysis.trend_analysis.last_30_days.deviation_from_baseline > 0 ? '+' : ''}{analysis.trend_analysis.last_30_days.deviation_from_baseline}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded p-3">
                <h5 className="font-medium text-gray-900 mb-2">7-Day Performance</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium">{analysis.trend_analysis.last_7_days.avg_kmpl} km/l</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deviation:</span>
                    <span className={`font-medium ${analysis.trend_analysis.last_7_days.deviation_from_baseline > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analysis.trend_analysis.last_7_days.deviation_from_baseline > 0 ? '+' : ''}{analysis.trend_analysis.last_7_days.deviation_from_baseline}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {analysis.recent_deviations.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Recent Deviations</h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {analysis.recent_deviations.slice(0, 5).map((deviation, idx) => (
                    <div key={idx} className="bg-white rounded p-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{deviation.trip_serial_number}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          deviation.severity === 'high' ? 'bg-red-100 text-red-800' :
                          deviation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {deviation.severity}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        {deviation.actual_kmpl} km/l ({deviation.deviation_percent > 0 ? '+' : ''}{deviation.deviation_percent}% vs baseline)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
                <ul className="text-sm space-y-1">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="inline-block w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading && !systemStatus) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span>Loading fuel efficiency baselines...</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Fuel Efficiency Baselines</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor vehicle performance against established efficiency baselines
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadSystemStatus}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={establishBaselinesForAll}
              disabled={establishingBaselines}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {establishingBaselines ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              {establishingBaselines ? 'Establishing...' : 'Establish All Baselines'}
            </button>
          </div>
        </div>
      </div>

      {/* System Overview */}
      {systemStatus && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{systemStatus.total_vehicles}</div>
              <div className="text-sm text-gray-600">Total Vehicles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStatus.vehicles_with_baselines}</div>
              <div className="text-sm text-gray-600">With Baselines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{systemStatus.vehicles_needing_updates}</div>
              <div className="text-sm text-gray-600">Need Updates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemStatus.vehicles_with_recent_deviations}</div>
              <div className="text-sm text-gray-600">With Deviations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemStatus.avg_confidence_score}%</div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{systemStatus.baseline_coverage_percent}%</div>
              <div className="text-sm text-gray-600">Coverage</div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Analyses */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Analysis</h3>
          <span className="text-sm text-gray-600">
            {vehicleAnalyses.length} vehicles analyzed
          </span>
        </div>

        {vehicleAnalyses.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No vehicle analyses available</p>
            <p className="text-sm text-gray-500 mt-1">
              Establish baselines to begin monitoring fuel efficiency
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicleAnalyses.map(analysis => renderVehicleAnalysis(analysis))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelBaselineDashboard;