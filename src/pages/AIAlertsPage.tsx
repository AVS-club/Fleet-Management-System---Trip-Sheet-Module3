import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { AIAlert } from '../types';
import { getAIAlerts, processAlertAction } from '../utils/aiAnalytics';
import { getVehicle, getVehicles } from '../utils/storage';
import { AlertTriangle, CheckCircle, XCircle, Bell, Search, ChevronRight, BarChart2, Filter, RefreshCw, Truck, Calendar } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import AlertActionModal from '../components/alerts/AlertActionModal';
import AlertDetailsModal from '../components/alerts/AlertDetailsModal';
import AlertTypeTag from '../components/alerts/AlertTypeTag';
import { safeFormatDate, formatRelativeDate } from '../utils/dateUtils';
import { isValid } from 'date-fns';
import { Vehicle } from '../types';

const AIAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    severity: 'all',
    vehicle: 'all',
    status: 'pending'
  });
  const [groupByVehicle, setGroupByVehicle] = useState(false);
  const [actionModal, setActionModal] = useState<{
    type: 'accept' | 'deny' | 'ignore';
    alert: AIAlert;
  } | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AIAlert | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);

  // Fetch alerts and vehicles data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch alerts
        const alertsData = await getAIAlerts();
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
        
        // Fetch vehicles for dropdown and display
        const vehiclesData = await getVehicles();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        
        // Create vehicle lookup map for efficient access
        const vehicleMapData: Record<string, Vehicle> = {};
        if (Array.isArray(vehiclesData)) {
          vehiclesData.forEach(vehicle => {
            vehicleMapData[vehicle.id] = vehicle;
          });
        }
        setVehicleMap(vehicleMapData);
      } catch (error) {
        console.error('Error fetching AI alerts data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle alert action modal submission
  const handleActionSubmit = async (reason: string, duration?: 'week' | 'permanent') => {
    if (actionModal) {
      try {
        await processAlertAction(actionModal.alert.id, actionModal.type, reason, duration);
        // Refresh alerts
        const data = await getAIAlerts();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error processing alert action:', error);
      }
      setActionModal(null);
    }
  };

  // Run AI check again (simulated)
  const handleRunAICheck = async () => {
    setRunningCheck(true);
    try {
      // In a real app, this would trigger a backend process to run AI checks
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating API call
      
      // Refresh alerts
      const data = await getAIAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error running AI check:', error);
    } finally {
      setRunningCheck(false);
    }
  };

  // Helper to get status style classes
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'accepted': return 'bg-success-100 text-success-700';
      case 'denied': return 'bg-error-100 text-error-700';
      case 'ignored': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper to get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-error-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Prepare alert message details with expected/actual values
  const getAlertMessageDetails = (alert: AIAlert) => {
    if (!alert.metadata) return alert.description;
    
    const { expected_value, actual_value, deviation } = alert.metadata;
    
    if (expected_value !== undefined && actual_value !== undefined && deviation !== undefined) {
      const deviationSymbol = deviation > 0 ? '↑' : '↓';
      const absDeviation = Math.abs(Number(deviation));
      
      return (
        <div>
          <div className="font-medium">{alert.title}</div>
          <div className="text-xs text-gray-600 mt-1">
            Expected: {expected_value}, Actual: {actual_value} 
            <span className={deviation > 0 ? 'text-error-600' : 'text-success-600'}>
              {' '}{deviationSymbol}{absDeviation.toFixed(1)}%
            </span>
          </div>
        </div>
      );
    }
    
    return alert.description;
  };

  // Filter alerts based on user selections
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Search filter
      if (filters.search && alert.affected_entity) {
        const vehicle = alert.affected_entity.type === 'vehicle' 
          ? vehicleMap[alert.affected_entity.id]
          : null;
          
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          alert.title,
          alert.description,
          vehicle?.registration_number
        ].map(field => field?.toLowerCase());

        if (!searchFields.some(field => field?.includes(searchTerm))) {
          return false;
        }
      }

      // Type filter
      if (filters.type !== 'all' && alert.alert_type !== filters.type) {
        return false;
      }

      // Severity filter
      if (filters.severity !== 'all' && alert.severity !== filters.severity) {
        return false;
      }

      // Vehicle filter
      if (filters.vehicle !== 'all' && 
          alert.affected_entity?.type === 'vehicle' && 
          alert.affected_entity?.id !== filters.vehicle) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && alert.status !== filters.status) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by date first
      const dateA = new Date(a.created_at || '');
      const dateB = new Date(b.created_at || '');
      
      // Handle invalid dates by putting them at the end
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      const dateCompare = dateB.getTime() - dateA.getTime();
      
      // If dates are the same, sort by severity (high → medium → low)
      if (dateCompare === 0) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return (severityOrder[a.severity as keyof typeof severityOrder] || 3) - 
               (severityOrder[b.severity as keyof typeof severityOrder] || 3);
      }
      
      return dateCompare;
    });
  }, [alerts, filters, vehicleMap]);

  // Group alerts by vehicle if groupByVehicle is enabled
  const groupedAlerts = useMemo(() => {
    if (!groupByVehicle) return null;
    
    const groups: Record<string, { vehicle: Vehicle | null, alerts: AIAlert[] }> = {};
    
    filteredAlerts.forEach(alert => {
      if (alert.affected_entity?.type === 'vehicle') {
        const vehicleId = alert.affected_entity.id;
        if (!groups[vehicleId]) {
          groups[vehicleId] = {
            vehicle: vehicleMap[vehicleId] || null,
            alerts: []
          };
        }
        groups[vehicleId].alerts.push(alert);
      } else {
        // For non-vehicle alerts, group under "other"
        if (!groups['other']) {
          groups['other'] = {
            vehicle: null,
            alerts: []
          };
        }
        groups['other'].alerts.push(alert);
      }
    });
    
    return groups;
  }, [filteredAlerts, groupByVehicle, vehicleMap]);

  // Render alert table (used in both grouped and non-grouped views)
  const renderAlertTable = (alertsToRender: AIAlert[]) => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Alert</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vehicle</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Details</th>
          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {alertsToRender.map(alert => {
          const vehicle = alert.affected_entity?.type === 'vehicle' 
            ? vehicleMap[alert.affected_entity.id] 
            : null;
            
          return (
            <tr key={alert.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center">
                  {getSeverityIcon(alert.severity)}
                  <AlertTypeTag 
                    type={alert.alert_type} 
                    className="ml-2"
                  />
                </div>
              </td>
              <td className="px-3 py-2">
                {getAlertMessageDetails(alert)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {vehicle ? (
                  <div>
                    <p className="text-sm font-medium text-primary-600">
                      {vehicle.registration_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                  {alert.status}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                {formatRelativeDate(alert.created_at)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-center">
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="text-primary-600 hover:text-primary-800"
                  title="View Alert Details"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right">
                {alert.status === 'pending' && (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleAction(alert, 'accept')}
                      className="text-success-600 hover:text-success-700"
                      title="Acknowledge Alert"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAction(alert, 'deny')}
                      className="text-error-600 hover:text-error-700"
                      title="Dismiss Alert"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // Handle alert actions
  const handleAction = async (alert: AIAlert, action: 'accept' | 'deny' | 'ignore') => {
    setActionModal({ type: action, alert });
  };

  return (
    <Layout title="AI AVS Alerts" subtitle="Review and manage AI-generated alerts">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">
            Loading alerts...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Enhanced Filter Bar */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="md:flex-1">
                <Input
                  placeholder="Search alerts..."
                  icon={<Search className="h-4 w-4" />}
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'route_deviation', label: 'Route Deviation' },
                    { value: 'fuel_anomaly', label: 'Fuel Anomaly' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'documentation', label: 'Documentation' }
                  ]}
                  value={filters.type}
                  onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full"
                />
                
                <Select
                  options={[
                    { value: 'all', label: 'All Severity' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' }
                  ]}
                  value={filters.severity}
                  onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
                  className="w-full"
                />
                
                <Select
                  options={[
                    { value: 'all', label: 'All Vehicles' },
                    ...vehicles.map(v => ({
                      value: v.id,
                      label: v.registration_number
                    }))
                  ]}
                  value={filters.vehicle}
                  onChange={e => setFilters(f => ({ ...f, vehicle: e.target.value }))}
                  className="w-full"
                />
                
                <Select
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'accepted', label: 'Accepted' },
                    { value: 'denied', label: 'Denied' },
                    { value: 'ignored', label: 'Ignored' }
                  ]}
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-3">
                <Checkbox
                  label="Group by Vehicle"
                  checked={groupByVehicle}
                  onChange={e => setGroupByVehicle(e.target.checked)}
                />
                
                <Button
                  onClick={handleRunAICheck}
                  isLoading={runningCheck}
                  icon={<RefreshCw className="h-4 w-4" />}
                  size="sm"
                >
                  Run AI Check
                </Button>
              </div>
            </div>
          </div>

          {/* Alerts Display */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {groupByVehicle ? (
              // Grouped by vehicle view
              <div>
                {groupedAlerts && Object.keys(groupedAlerts).length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(groupedAlerts).map(([groupKey, { vehicle, alerts }]) => (
                      <div key={groupKey} className="p-4">
                        <div className="mb-4 flex items-center">
                          {vehicle ? (
                            <div className="flex items-center">
                              <Truck className="h-5 w-5 text-primary-500 mr-2" />
                              <h3 className="text-lg font-medium text-gray-900">{vehicle.registration_number}</h3>
                              <p className="ml-2 text-sm text-gray-500">({vehicle.make} {vehicle.model})</p>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <BarChart2 className="h-5 w-5 text-gray-500 mr-2" />
                              <h3 className="text-lg font-medium text-gray-900">Other Alerts</h3>
                            </div>
                          )}
                          <div className="ml-auto text-sm text-gray-500">
                            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          {renderAlertTable(alerts)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 mb-4">No alerts match your current filters</p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          search: '',
                          type: 'all',
                          severity: 'all',
                          vehicle: 'all',
                          status: 'pending'
                        })}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        onClick={handleRunAICheck}
                        isLoading={runningCheck}
                      >
                        Run AI Check
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Regular table view
              <div>
                {filteredAlerts.length > 0 ? (
                  <div className="overflow-x-auto">
                    {renderAlertTable(filteredAlerts)}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 mb-4">No alerts match your current filters</p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          search: '',
                          type: 'all',
                          severity: 'all',
                          vehicle: 'all',
                          status: 'pending'
                        })}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        onClick={handleRunAICheck}
                        isLoading={runningCheck}
                        icon={<RefreshCw className="h-4 w-4" />}
                      >
                        Run AI Check
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <AlertActionModal
          type={actionModal.type}
          onSubmit={handleActionSubmit}
          onClose={() => setActionModal(null)}
        />
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </Layout>
  );
};

export default AIAlertsPage;