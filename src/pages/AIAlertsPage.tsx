import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { AIAlert } from '@/types'; 
import { getAIAlerts, processAlertAction, runAlertScan } from '../utils/aiAnalytics';
import { getVehicle, getVehicles } from '../utils/storage';
import DriverAIInsights from '../components/ai/DriverAIInsights';
import { AlertTriangle, CheckCircle, XCircle, Bell, Search, ChevronRight, BarChart2, Filter, RefreshCw, Truck, Calendar, Fuel, TrendingDown, FileX, PenTool as Tool } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import AlertActionModal from '../components/alerts/AlertActionModal';
import AlertDetailsModal from '../components/alerts/AlertDetailsModal';
import AlertTypeTag from '../components/alerts/AlertTypeTag';
import { safeFormatDate, formatRelativeDate } from '../utils/dateUtils';
import { formatKmPerLitre } from '../utils/format';
import { isValid } from 'date-fns';
import { Vehicle } from '@/types';
import { toast } from 'react-toastify';

const AIAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'driver-insights'>('alerts');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
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
        const alertsArray = Array.isArray(alertsData) ? alertsData : [];
        setAlerts(alertsArray);
        
        // Fetch all data for both tabs
        const [vehiclesData, driversData, tripsData] = await Promise.all([
          getVehicles(),
          getDrivers(),
          getTrips()
        ]);
        
        const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
        const driversArray = Array.isArray(driversData) ? driversData : [];
        const tripsArray = Array.isArray(tripsData) ? tripsData : [];
        
        setVehicles(vehiclesArray);
        setDrivers(driversArray);
        setTrips(tripsArray);
        setMaintenanceTasks([]); // Initialize empty for now
        
        // Create vehicle lookup map for efficient access
        const vehicleMapData: Record<string, Vehicle> = {};
        vehiclesArray.forEach(vehicle => {
          vehicleMapData[vehicle.id] = vehicle;
        });
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
        
        // Update alert in state
        setAlerts(prevAlerts => prevAlerts.map(alert => 
          alert.id === actionModal.alert.id
            ? { 
                ...alert, 
                status: actionModal.type === 'accept' ? 'accepted' : actionModal.type === 'deny' ? 'denied' : 'ignored',
                metadata: { 
                  ...alert.metadata, 
                  resolution_reason: reason,
                  resolution_comment: reason,
                  ignore_duration: duration,
                  resolved_at: new Date().toISOString()
                }
              }
            : alert
        ));
        
        toast.success(`Alert ${actionModal.type === 'accept' ? 'accepted' : actionModal.type === 'deny' ? 'denied' : 'ignored'} successfully`);
      } catch (error) {
        console.error('Error processing alert action:', error);
        toast.error('Failed to process alert action');
      }
      setActionModal(null);
    }
  };

  // Run AI check again
  const handleRunAICheck = async () => {
    setRunningCheck(true);
    try {
      const newAlertCount = await runAlertScan();
      
      // Refresh alerts list
      const refreshedAlerts = await getAIAlerts();
      setAlerts(Array.isArray(refreshedAlerts) ? refreshedAlerts : []);
      
      toast.success(`AI check complete: ${newAlertCount} new alert${newAlertCount !== 1 ? 's' : ''} generated`);
    } catch (error) {
      console.error('Error running AI check:', error);
      toast.error('Failed to run AI check');
    } finally {
      setRunningCheck(false);
    }
  };

  // Helper to get status color
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
  const getSeverityIcon = (severity: string, alertType: string) => {
    // First check by alert type
    switch (alertType) {
      case 'fuel_anomaly':
        return <Fuel className="h-4 w-4 text-amber-500" />;
      case 'route_deviation':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'frequent_maintenance':
        return <Tool className="h-4 w-4 text-orange-500" />;
      case 'documentation':
        return <FileX className="h-4 w-4 text-purple-500" />;
      default:
        // Fall back to severity-based icons
        switch (severity) {
          case 'high': return <AlertTriangle className="h-4 w-4 text-error-500" />;
          case 'medium': return <AlertTriangle className="h-4 w-4 text-warning-500" />;
          default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
        }
    }
  };

  // Prepare alert message details with expected/actual values
  const getAlertMessageDetails = (alert: AIAlert) => {
    if (!alert.metadata) return alert.description;
    
    const { expected_value, actual_value, deviation } = alert.metadata;
    
    if (expected_value !== undefined && actual_value !== undefined) {
      // Special handling for fuel anomaly alerts
      if (alert.alert_type === 'fuel_anomaly') {
        const expectedMileage = Number(expected_value);
        const actualMileage = Number(actual_value);
        const calculatedDeviation = ((actualMileage - expectedMileage) / expectedMileage) * 100;
        
        const formattedExpected = expectedMileage.toFixed(2);
        const formattedActual = actualMileage.toFixed(2);
        const formattedDeviation = calculatedDeviation.toFixed(1);
        
        return (
          <div>
            <div className="font-medium">Fuel anomaly detected: {formattedActual} km/L ({formattedDeviation}%)</div>
            <div className="text-xs text-gray-600 mt-1">
              Expected: {formattedExpected}, Actual: {formattedActual}
            </div>
          </div>
        );
      }
      
      // General handling for other alert types with deviation
      if (deviation !== undefined) {
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

  // Handle alert actions
  const handleAction = async (alert: AIAlert, action: 'accept' | 'deny' | 'ignore') => {
    setActionModal({ type: action, alert });
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Bell className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {activeTab === 'alerts' ? 'AI AVS Alerts' : 'Driver AI Insights'}
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">
          {activeTab === 'alerts' 
            ? 'Review and manage AI-generated alerts' 
            : 'AI-powered driver performance insights'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('alerts')}
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>AI Alerts</span>
              </div>
            </button>
            
            <button
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'driver-insights'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('driver-insights')}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Driver Insights</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">
            Loading alerts...
          </p>
        </div>
      ) : (
        <>
          {activeTab === 'driver-insights' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Driver AI Insights</h2>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/drivers/insights')}
                    icon={<BarChart2 className="h-4 w-4" />}
                  >
                    View Full Dashboard
                  </Button>
                </div>
                
                {drivers.length > 0 && vehicles.length > 0 ? (
                  <DriverAIInsights
                    allDrivers={drivers}
                    trips={trips}
                    vehicles={vehicles}
                    maintenanceTasks={maintenanceTasks}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No driver data available for insights</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
        <div className="space-y-4">
          {/* Enhanced Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
              <div className="w-full md:flex-1">
                <Input
                  placeholder="Search alerts..."
                  icon={<Search className="h-4 w-4" />}
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                <Select
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'fuel_anomaly', label: 'Fuel Anomaly' },
                    { value: 'route_deviation', label: 'Route Deviation' },
                    { value: 'frequent_maintenance', label: 'Frequent Maintenance' },
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
              
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                <div className="w-full xs:w-auto">
                  <Checkbox
                  label="Group by Vehicle"
                  checked={groupByVehicle}
                  onChange={e => setGroupByVehicle(e.target.checked)}
                  />
                </div>
                
                <Button
                  onClick={handleRunAICheck}
                  isLoading={runningCheck}
                  icon={<RefreshCw className="h-4 w-4" />}
                  inputSize="sm"
                  className="w-full xs:w-auto"
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
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Alert</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Details</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {alerts.map(alert => (
                                <tr key={alert.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                      {getSeverityIcon(alert.severity, alert.alert_type)}
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
                                          title="Accept Alert"
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
                              ))}
                            </tbody>
                          </table>
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
                        {filteredAlerts.map(alert => {
                          const vehicle = alert.affected_entity?.type === 'vehicle' 
                            ? vehicleMap[alert.affected_entity.id] 
                            : null;
                            
                          return (
                            <tr key={alert.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getSeverityIcon(alert.severity, alert.alert_type)}
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
                                      title="Accept Alert"
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
            )}
          </div>
        </div>
          )}
        </>
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