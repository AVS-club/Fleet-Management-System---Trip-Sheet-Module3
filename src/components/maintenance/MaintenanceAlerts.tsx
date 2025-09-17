import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  Truck,
  Calendar,
  CheckCircle,
  XCircle,
  Settings,
  Filter
} from 'lucide-react';
import { Vehicle, MaintenanceTask } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '../../utils/storage';
import { getTasks } from '../../utils/maintenanceStorage';
import Button from '../ui/Button';

interface MaintenanceAlert {
  id: string;
  type: 'overdue' | 'due_soon' | 'mileage_based' | 'time_based' | 'critical';
  vehicleId: string;
  vehicleRegistration: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  mileageThreshold?: number;
  currentMileage?: number;
  estimatedCost?: number;
  actionRequired: string;
  createdAt: Date;
  acknowledged: boolean;
  dismissed: boolean;
}

interface AlertSettings {
  enableOverdueAlerts: boolean;
  enableDueSoonAlerts: boolean;
  enableMileageAlerts: boolean;
  enableTimeBasedAlerts: boolean;
  dueSoonDays: number;
  mileageThresholdKm: number;
  reminderFrequency: 'daily' | 'weekly' | 'monthly';
  emailNotifications: boolean;
  smsNotifications: boolean;
}

const MaintenanceAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'due_soon' | 'critical'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enableOverdueAlerts: true,
    enableDueSoonAlerts: true,
    enableMileageAlerts: true,
    enableTimeBasedAlerts: true,
    dueSoonDays: 7,
    mileageThresholdKm: 1000,
    reminderFrequency: 'daily',
    emailNotifications: true,
    smsNotifications: false
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const { data: maintenanceTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: getTasks,
  });

  const loading = vehiclesLoading || tasksLoading;

  // Generate maintenance alerts
  const generatedAlerts = useMemo((): MaintenanceAlert[] => {
    const alertsList: MaintenanceAlert[] = [];
    const now = new Date();

    // Overdue maintenance alerts
    if (alertSettings.enableOverdueAlerts) {
      maintenanceTasks.forEach(task => {
        if (task.status === 'open' && new Date(task.start_date) < now) {
          const vehicle = vehicles.find(v => v.id === task.vehicle_id);
          if (vehicle) {
            alertsList.push({
              id: `overdue-${task.id}`,
              type: 'overdue',
              vehicleId: task.vehicle_id,
              vehicleRegistration: vehicle.registration_number,
              title: 'Overdue Maintenance',
              message: `Maintenance task "${task.title.join(', ')}" is overdue for ${vehicle.registration_number}`,
              priority: 'critical',
              dueDate: new Date(task.start_date),
              estimatedCost: task.estimated_cost,
              actionRequired: 'Schedule maintenance immediately',
              createdAt: new Date(),
              acknowledged: false,
              dismissed: false
            });
          }
        }
      });
    }

    // Due soon alerts
    if (alertSettings.enableDueSoonAlerts) {
      const dueSoonDate = new Date(now.getTime() + alertSettings.dueSoonDays * 24 * 60 * 60 * 1000);
      
      maintenanceTasks.forEach(task => {
        const taskDate = new Date(task.start_date);
        if (task.status === 'open' && taskDate > now && taskDate <= dueSoonDate) {
          const vehicle = vehicles.find(v => v.id === task.vehicle_id);
          if (vehicle) {
            alertsList.push({
              id: `due-soon-${task.id}`,
              type: 'due_soon',
              vehicleId: task.vehicle_id,
              vehicleRegistration: vehicle.registration_number,
              title: 'Maintenance Due Soon',
              message: `Maintenance task "${task.title.join(', ')}" is due in ${Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`,
              priority: 'high',
              dueDate: taskDate,
              estimatedCost: task.estimated_cost,
              actionRequired: 'Schedule maintenance appointment',
              createdAt: new Date(),
              acknowledged: false,
              dismissed: false
            });
          }
        }
      });
    }

    // Mileage-based alerts
    if (alertSettings.enableMileageAlerts) {
      vehicles.forEach(vehicle => {
        const currentMileage = vehicle.current_odometer;
        
        // Engine service every 10,000 km
        const engineServiceInterval = 10000;
        const nextEngineService = Math.ceil(currentMileage / engineServiceInterval) * engineServiceInterval;
        const mileageGap = nextEngineService - currentMileage;
        
        if (mileageGap <= alertSettings.mileageThresholdKm) {
          alertsList.push({
            id: `mileage-engine-${vehicle.id}`,
            type: 'mileage_based',
            vehicleId: vehicle.id,
            vehicleRegistration: vehicle.registration_number,
            title: 'Engine Service Due',
            message: `Engine service is due in ${mileageGap} km for ${vehicle.registration_number}`,
            priority: mileageGap <= 500 ? 'critical' : mileageGap <= 1000 ? 'high' : 'medium',
            mileageThreshold: nextEngineService,
            currentMileage: currentMileage,
            estimatedCost: 5000,
            actionRequired: 'Schedule engine service',
            createdAt: new Date(),
            acknowledged: false,
            dismissed: false
          });
        }

        // Brake inspection every 15,000 km
        const brakeInspectionInterval = 15000;
        const nextBrakeInspection = Math.ceil(currentMileage / brakeInspectionInterval) * brakeInspectionInterval;
        const brakeMileageGap = nextBrakeInspection - currentMileage;
        
        if (brakeMileageGap <= alertSettings.mileageThresholdKm) {
          alertsList.push({
            id: `mileage-brake-${vehicle.id}`,
            type: 'mileage_based',
            vehicleId: vehicle.id,
            vehicleRegistration: vehicle.registration_number,
            title: 'Brake Inspection Due',
            message: `Brake inspection is due in ${brakeMileageGap} km for ${vehicle.registration_number}`,
            priority: brakeMileageGap <= 500 ? 'critical' : brakeMileageGap <= 1000 ? 'high' : 'medium',
            mileageThreshold: nextBrakeInspection,
            currentMileage: currentMileage,
            estimatedCost: 3000,
            actionRequired: 'Schedule brake inspection',
            createdAt: new Date(),
            acknowledged: false,
            dismissed: false
          });
        }
      });
    }

    // Time-based alerts (insurance, permit, etc.)
    if (alertSettings.enableTimeBasedAlerts) {
      vehicles.forEach(vehicle => {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Insurance expiry
        if (vehicle.insurance_expiry) {
          const insuranceExpiry = new Date(vehicle.insurance_expiry);
          if (insuranceExpiry <= thirtyDaysFromNow && insuranceExpiry > now) {
            alertsList.push({
              id: `insurance-${vehicle.id}`,
              type: 'time_based',
              vehicleId: vehicle.id,
              vehicleRegistration: vehicle.registration_number,
              title: 'Insurance Expiring Soon',
              message: `Insurance for ${vehicle.registration_number} expires on ${insuranceExpiry.toLocaleDateString()}`,
              priority: insuranceExpiry <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) ? 'critical' : 'high',
              dueDate: insuranceExpiry,
              actionRequired: 'Renew insurance policy',
              createdAt: new Date(),
              acknowledged: false,
              dismissed: false
            });
          }
        }

        // Permit expiry
        if (vehicle.permit_expiry) {
          const permitExpiry = new Date(vehicle.permit_expiry);
          if (permitExpiry <= thirtyDaysFromNow && permitExpiry > now) {
            alertsList.push({
              id: `permit-${vehicle.id}`,
              type: 'time_based',
              vehicleId: vehicle.id,
              vehicleRegistration: vehicle.registration_number,
              title: 'Permit Expiring Soon',
              message: `Permit for ${vehicle.registration_number} expires on ${permitExpiry.toLocaleDateString()}`,
              priority: permitExpiry <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) ? 'critical' : 'high',
              dueDate: permitExpiry,
              actionRequired: 'Renew permit',
              createdAt: new Date(),
              acknowledged: false,
              dismissed: false
            });
          }
        }
      });
    }

    return alertsList.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [vehicles, maintenanceTasks, alertSettings]);

  // Update alerts when generated alerts change
  useEffect(() => {
    setAlerts(generatedAlerts);
  }, [generatedAlerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (filterType === 'all') return alerts;
    return alerts.filter(alert => {
      switch (filterType) {
        case 'overdue':
          return alert.type === 'overdue';
        case 'due_soon':
          return alert.type === 'due_soon';
        case 'critical':
          return alert.priority === 'critical';
        default:
          return true;
      }
    });
  }, [alerts, filterType]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'due_soon': return <Clock className="h-5 w-5 text-orange-600" />;
      case 'mileage_based': return <Truck className="h-5 w-5 text-blue-600" />;
      case 'time_based': return <Calendar className="h-5 w-5 text-purple-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter(a => a.priority === 'critical').length;
    const unacknowledged = alerts.filter(a => !a.acknowledged).length;
    const overdue = alerts.filter(a => a.type === 'overdue').length;

    return { total, critical, unacknowledged, overdue };
  }, [alerts]);

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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Maintenance Alerts
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Stay informed about upcoming and overdue maintenance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unacknowledged</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unacknowledged}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Alert Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Overdue Alerts
                </label>
                <input
                  type="checkbox"
                  checked={alertSettings.enableOverdueAlerts}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, enableOverdueAlerts: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Due Soon Alerts
                </label>
                <input
                  type="checkbox"
                  checked={alertSettings.enableDueSoonAlerts}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, enableDueSoonAlerts: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Mileage Alerts
                </label>
                <input
                  type="checkbox"
                  checked={alertSettings.enableMileageAlerts}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, enableMileageAlerts: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Soon Days
                </label>
                <input
                  type="number"
                  value={alertSettings.dueSoonDays}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, dueSoonDays: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mileage Threshold (km)
                </label>
                <input
                  type="number"
                  value={alertSettings.mileageThresholdKm}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, mileageThresholdKm: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
        </div>
        <div className="flex space-x-2">
          {(['all', 'overdue', 'due_soon', 'critical'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterType === filter
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No alerts found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filterType === 'all' 
                ? 'All maintenance is up to date!' 
                : `No ${filterType.replace('_', ' ')} alerts at the moment.`
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getPriorityColor(alert.priority)} ${
                alert.acknowledged ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{alert.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                    <p className="text-sm mt-2 font-medium">
                      <strong>Action Required:</strong> {alert.actionRequired}
                    </p>
                    {alert.dueDate && (
                      <p className="text-xs mt-1 opacity-75">
                        Due: {alert.dueDate.toLocaleDateString()}
                      </p>
                    )}
                    {alert.estimatedCost && (
                      <p className="text-xs mt-1 opacity-75">
                        Estimated Cost: ₹{alert.estimatedCost.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MaintenanceAlerts;
