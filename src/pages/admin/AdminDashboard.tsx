import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { Settings, Users, Truck, PenTool as Tool, MapPin, Bell, FileText, Calendar, BarChart2, Database, Activity, ShieldCheck, Shield, Fuel, Building2 } from 'lucide-react'; 
import { Link } from 'react-router-dom';
import { getVehicles } from '../../utils/storage';
import { getDrivers } from '../../utils/api/drivers';
import { Vehicle, Driver } from '@/types';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/ui/Button';
import VehicleProfileModal from '../../components/admin/VehicleProfileModal';
import DriverProfileModal from '../../components/admin/DriverProfileModal';
import SequenceMonitorDashboard from '../../components/admin/SequenceMonitorDashboard';
import ReturnTripValidationDashboard from '../../components/admin/ReturnTripValidationDashboard';
import FuelBaselineDashboard from '../../components/admin/FuelBaselineDashboard';
import EdgeCaseDashboard from '../../components/admin/EdgeCaseDashboard';
import AuditTrailDashboard from '../../components/admin/AuditTrailDashboard';
import DataIntegrityDashboard from '../../components/admin/DataIntegrityDashboard';

const AdminDashboard: React.FC = () => {
  // ✅ ALL HOOKS FIRST - NO CONDITIONAL LOGIC YET
  const { permissions, loading } = usePermissions();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const vehiclesData = await getVehicles();
      const driversData = await getDrivers();
      setVehicles(vehiclesData);
      setDrivers(driversData);
    };
    loadData();
  }, []);

  // ✅ THEN PERMISSION CHECKS AFTER ALL HOOKS
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!permissions?.canAccessAdmin) {
    return <Navigate to="/vehicles" replace />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Settings className="h-5 w-5" /> },
    { id: 'trips', label: 'Trips', icon: <FileText className="h-5 w-5" /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Truck className="h-5 w-5" /> },
    { id: 'drivers', label: 'Drivers', icon: <Users className="h-5 w-5" /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Tool className="h-5 w-5" /> },
    { id: 'data-integrity', label: 'Data Integrity', icon: <ShieldCheck className="h-5 w-5" /> },
    { id: 'sequence', label: 'Serial Monitor', icon: <BarChart2 className="h-5 w-5" /> },
    { id: 'return-trips', label: 'Return Trips', icon: <Activity className="h-5 w-5" /> },
    { id: 'fuel-baselines', label: 'Fuel Baselines', icon: <Fuel className="h-5 w-5" /> },
    { id: 'edge-cases', label: 'Edge Cases', icon: <Shield className="h-5 w-5" /> },
    { id: 'audit-trail', label: 'Audit Trail', icon: <FileText className="h-5 w-5" /> },
    { id: 'alerts', label: 'Alert Settings', icon: <Bell className="h-5 w-5" /> }
  ];

  const vehicleColumns = [
    { 
      key: 'registrationNumber', 
      label: 'Registration',
      render: (value: string, row: Vehicle) => (
        <button
          className="text-primary-600 hover:text-primary-800 font-medium"
          onClick={() => setSelectedVehicle(row)}
        >
          {value}
        </button>
      )
    },
    { key: 'type', label: 'Type' },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'status', label: 'Status', 
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
          value === 'active' ? 'bg-success-100 text-success-700' :
          value === 'maintenance' ? 'bg-warning-100 text-warning-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {value}
        </span>
      )
    }
  ];

  const driverColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (value: string, row: Driver) => (
        <button
          className="text-primary-600 hover:text-primary-800 font-medium"
          onClick={() => setSelectedDriver(row)}
        >
          {value}
        </button>
      )
    },
    { key: 'licenseNumber', label: 'License' },
    { key: 'experience', label: 'Experience' },
    { key: 'status', label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
          value === 'active' ? 'bg-success-100 text-success-700' :
          value === 'onLeave' ? 'bg-warning-100 text-warning-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {value.replace('_', ' ')}
        </span>
      )
    }
  ];

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <ShieldCheck className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">{t('admin.title')}</h1>
        </div>
        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">{t('admin.description')}</p>
      </div>

      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Link
                to="/admin/trips"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.tripManagement')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.tripManagementDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/trip-locations"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.tripLocations')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.tripLocationsDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/vehicle-management"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Truck className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.vehicleManagement')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.vehicleManagementDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/driver-management"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Users className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.driverManagement')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.driverManagementDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/maintenance-tasks"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Tool className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.maintenanceTasks')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.maintenanceTasksDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/alert-settings"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Bell className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.alertSettings')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.alertSettingsDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/reminders"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.reminders')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.remindersDesc')}
                    </p>
                  </div>
                </div>
              </Link>


              <Link
                to="/admin/driver-ranking-settings"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <BarChart2 className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.driverRanking')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.driverRankingDesc')}
                    </p>
                  </div>
                </div>
              </Link>


              <Link
                to="/admin/activity-logs"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Activity className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.activityLogs')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.activityLogsDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/company-settings"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div> 
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">{t('admin.companySettings')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.companySettingsDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/reports"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary-50 p-2 sm:p-3 rounded-lg">
                    <BarChart2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">
                      {t('admin.reportsAnalytics')}
                    </h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-500">
                      {t('admin.reportsAnalyticsDesc')}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-not-allowed opacity-70">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <Database className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-400">{t('admin.databaseBackup')}</h3>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-sans text-gray-400">
                      {t('admin.databaseBackupDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex flex-wrap gap-2 p-3 sm:p-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-sm font-sans ${
                      activeTab === tab.id 
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {activeTab === 'trips' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-display font-medium tracking-tight-plus text-gray-900">Trip Management</h2>
                      <p className="text-xs sm:text-sm font-sans text-gray-500">View and manage all trip records</p>
                    </div>
                    <Link to="/admin/trips">
                      <Button size="sm" className="w-full sm:w-auto">View All Trips</Button>
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-display font-medium tracking-tight-plus text-gray-900">Vehicle Management</h2>
                      <p className="text-sm font-sans text-gray-500">Manage vehicle master data and configurations</p>
                    </div>
                    <div className="flex space-x-3">
                      <Link to="/vehicles">
                        <Button>Manage Vehicles</Button>
                      </Link>
                      <Link to="/admin/vehicle-management">
                        <Button variant="primary">Advanced Management</Button>
                      </Link>
                    </div>
                  </div>
                  <DataTable
                    columns={vehicleColumns}
                    data={vehicles}
                    searchPlaceholder="Search vehicles..."
                  />
                </div>
              )}

              {activeTab === 'drivers' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-display font-medium tracking-tight-plus text-gray-900">Driver Management</h2>
                      <p className="text-sm font-sans text-gray-500">Manage driver master data and configurations</p>
                    </div>
                    <div className="flex space-x-3">
                      <Link to="/drivers">
                        <Button>Standard View</Button>
                      </Link>
                      <Link to="/admin/driver-management">
                        <Button variant="primary">Advanced Management</Button>
                      </Link>
                    </div>
                  </div>
                  <DataTable
                    columns={driverColumns}
                    data={drivers}
                    searchPlaceholder="Search drivers..."
                  />
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Maintenance Settings</h2>
                      <p className="text-sm text-gray-500">Configure maintenance tasks and schedules</p>
                    </div>
                    <Link to="/admin/maintenance-tasks">
                      <Button>Manage Tasks</Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">Service Types</h3>
                      <p className="text-sm text-gray-500 mt-1">Configure maintenance service types</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">Schedule Templates</h3>
                      <p className="text-sm text-gray-500 mt-1">Manage maintenance schedule templates</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sequence' && (
                <SequenceMonitorDashboard className="max-w-7xl" />
              )}

              {activeTab === 'return-trips' && (
                <ReturnTripValidationDashboard className="max-w-7xl" />
              )}

              {activeTab === 'fuel-baselines' && (
                <FuelBaselineDashboard className="max-w-7xl" />
              )}

              {activeTab === 'data-integrity' && (
                <DataIntegrityDashboard />
              )}

              {activeTab === 'edge-cases' && (
                <EdgeCaseDashboard className="max-w-7xl" />
              )}

              {activeTab === 'audit-trail' && (
                <AuditTrailDashboard className="max-w-7xl" />
              )}

              {activeTab === 'alerts' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Alert Settings</h2>
                      <p className="text-sm text-gray-500">Configure system-wide alert preferences</p>
                    </div>
                    <Link to="/admin/alert-settings">
                      <Button>Configure Alerts</Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">Notification Rules</h3>
                      <p className="text-sm text-gray-500 mt-1">Set up alert notification rules</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">Alert Thresholds</h3>
                      <p className="text-sm text-gray-500 mt-1">Configure alert trigger thresholds</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedVehicle && (
        <VehicleProfileModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {selectedDriver && (
        <DriverProfileModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </Layout>
  );
};

export default AdminDashboard;