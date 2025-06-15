import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Settings, Users, Truck, PenTool as Tool, MapPin, AlertTriangle, Bell, FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getVehicles, getDrivers } from '../../utils/storage';
import { Vehicle, Driver } from '../../types';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/ui/Button';
import VehicleProfileModal from '../../components/admin/VehicleProfileModal';
import DriverProfileModal from '../../components/admin/DriverProfileModal';
import RunDiagnosis from '../../components/admin/RunDiagnosis';
import { useTranslation } from '../../utils/translationUtils';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Translate UI text
  const title = useTranslation('Admin Dashboard');
  const subtitle = useTranslation('Manage system settings and configurations');
  const overviewTab = useTranslation('Overview');
  const tripsTab = useTranslation('Trips');
  const vehiclesTab = useTranslation('Vehicles');
  const driversTab = useTranslation('Drivers');
  const maintenanceTab = useTranslation('Maintenance');
  const alertsTab = useTranslation('Alert Settings');
  
  // Translate card titles
  const tripManagementText = useTranslation('Trip Management');
  const tripManagementDesc = useTranslation('Manage trip records and configurations');
  const tripLocationsText = useTranslation('Trip Locations');
  const tripLocationsDesc = useTranslation('Manage warehouses and destinations');
  const vehicleManagementText = useTranslation('Vehicle Management');
  const vehicleManagementDesc = useTranslation('Manage vehicle fleet and maintenance');
  const driverManagementText = useTranslation('Driver Management');
  const driverManagementDesc = useTranslation('Manage drivers and assignments');
  const maintenanceTasksText = useTranslation('Maintenance Tasks');
  const maintenanceTasksDesc = useTranslation('Configure maintenance task types');
  const alertSettingsText = useTranslation('Alert Settings');
  const alertSettingsDesc = useTranslation('Configure alert rules and notifications');
  const remindersText = useTranslation('Reminders');
  const remindersDesc = useTranslation('Configure reminder contacts and timing rules');
  const viewAllTripsText = useTranslation('View All Trips');
  const manageVehiclesText = useTranslation('Manage Vehicles');
  const manageDriversText = useTranslation('Manage Drivers');
  const manageTasksText = useTranslation('Manage Tasks');
  const configureAlertsText = useTranslation('Configure Alerts');

  useEffect(() => {
    setVehicles(getVehicles());
    setDrivers(getDrivers());
  }, []);

  const tabs = [
    { id: 'overview', label: overviewTab, icon: <Settings className="h-5 w-5" /> },
    { id: 'trips', label: tripsTab, icon: <FileText className="h-5 w-5" /> },
    { id: 'vehicles', label: vehiclesTab, icon: <Truck className="h-5 w-5" /> },
    { id: 'drivers', label: driversTab, icon: <Users className="h-5 w-5" /> },
    { id: 'maintenance', label: maintenanceTab, icon: <Tool className="h-5 w-5" /> },
    { id: 'alerts', label: alertsTab, icon: <Bell className="h-5 w-5" /> }
  ];

  const vehicleColumns = [
    { 
      key: 'registrationNumber', 
      label: useTranslation('Registration'),
      render: (value: string, row: Vehicle) => (
        <button
          className="text-primary-600 hover:text-primary-800 font-medium"
          onClick={() => setSelectedVehicle(row)}
        >
          {value}
        </button>
      )
    },
    { key: 'type', label: useTranslation('Type') },
    { key: 'make', label: useTranslation('Make') },
    { key: 'model', label: useTranslation('Model') },
    { key: 'status', label: useTranslation('Status'), 
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
          value === 'active' ? 'bg-success-100 text-success-700' :
          value === 'maintenance' ? 'bg-warning-100 text-warning-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {useTranslation(value)}
        </span>
      )
    }
  ];

  const driverColumns = [
    {
      key: 'name',
      label: useTranslation('Name'),
      render: (value: string, row: Driver) => (
        <button
          className="text-primary-600 hover:text-primary-800 font-medium"
          onClick={() => setSelectedDriver(row)}
        >
          {value}
        </button>
      )
    },
    { key: 'licenseNumber', label: useTranslation('License') },
    { key: 'experience', label: useTranslation('Experience') },
    { key: 'status', label: useTranslation('Status'),
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
          value === 'active' ? 'bg-success-100 text-success-700' :
          value === 'onLeave' ? 'bg-warning-100 text-warning-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {useTranslation(value.replace('_', ' '))}
        </span>
      )
    }
  ];

  return (
    <Layout
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                to="/admin/trips"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{tripManagementText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {tripManagementDesc}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/trip-locations"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{tripLocationsText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {tripLocationsDesc}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/vehicles"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <Truck className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{vehicleManagementText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {vehicleManagementDesc}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/drivers"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <Users className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{driverManagementText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {driverManagementDesc}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/maintenance-tasks"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <Tool className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{maintenanceTasksText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {maintenanceTasksDesc}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/alert-settings"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <Bell className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{alertSettingsText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {alertSettingsDesc}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/reminders"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{remindersText}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {remindersDesc}
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            <RunDiagnosis />
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex space-x-4 p-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
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

            <div className="p-6">
              {activeTab === 'trips' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{tripManagementText}</h2>
                      <p className="text-sm text-gray-500">{useTranslation('View and manage all trip records')}</p>
                    </div>
                    <Link to="/admin/trips">
                      <Button>{viewAllTripsText}</Button>
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{vehicleManagementText}</h2>
                      <p className="text-sm text-gray-500">{useTranslation('Manage vehicle master data and configurations')}</p>
                    </div>
                    <Link to="/vehicles">
                      <Button>{manageVehiclesText}</Button>
                    </Link>
                  </div>
                  <DataTable
                    columns={vehicleColumns}
                    data={vehicles}
                    searchPlaceholder={useTranslation('Search vehicles...')}
                  />
                </div>
              )}

              {activeTab === 'drivers' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{driverManagementText}</h2>
                      <p className="text-sm text-gray-500">{useTranslation('Manage driver master data and configurations')}</p>
                    </div>
                    <Link to="/drivers">
                      <Button>{manageDriversText}</Button>
                    </Link>
                  </div>
                  <DataTable
                    columns={driverColumns}
                    data={drivers}
                    searchPlaceholder={useTranslation('Search drivers...')}
                  />
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{useTranslation('Maintenance Settings')}</h2>
                      <p className="text-sm text-gray-500">{useTranslation('Configure maintenance tasks and schedules')}</p>
                    </div>
                    <Link to="/admin/maintenance-tasks">
                      <Button>{manageTasksText}</Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">{useTranslation('Service Types')}</h3>
                      <p className="text-sm text-gray-500 mt-1">{useTranslation('Configure maintenance service types')}</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">{useTranslation('Schedule Templates')}</h3>
                      <p className="text-sm text-gray-500 mt-1">{useTranslation('Manage maintenance schedule templates')}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{alertSettingsText}</h2>
                      <p className="text-sm text-gray-500">{useTranslation('Configure system-wide alert preferences')}</p>
                    </div>
                    <Link to="/admin/alert-settings">
                      <Button>{configureAlertsText}</Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">{useTranslation('Notification Rules')}</h3>
                      <p className="text-sm text-gray-500 mt-1">{useTranslation('Set up alert notification rules')}</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-medium text-gray-900">{useTranslation('Alert Thresholds')}</h3>
                      <p className="text-sm text-gray-500 mt-1">{useTranslation('Configure alert trigger thresholds')}</p>
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