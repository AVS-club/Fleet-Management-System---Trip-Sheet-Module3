import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Settings, Users, Truck, PenTool as Tool, MapPin, AlertTriangle, Bell, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getVehicles, getDrivers } from '../../utils/storage';
import { Vehicle, Driver } from '../../types';
import DataTable from '../../components/shared/DataTable';
import Button from '../../components/ui/Button';
import VehicleProfileModal from '../../components/admin/VehicleProfileModal';
import DriverProfileModal from '../../components/admin/DriverProfileModal';
import RunDiagnosis from '../../components/admin/RunDiagnosis';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    setVehicles(getVehicles());
    setDrivers(getDrivers());
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Settings className="h-5 w-5" /> },
    { id: 'trips', label: 'Trips', icon: <FileText className="h-5 w-5" /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Truck className="h-5 w-5" /> },
    { id: 'drivers', label: 'Drivers', icon: <Users className="h-5 w-5" /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Tool className="h-5 w-5" /> },
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
    <Layout
      title="Admin Dashboard"
      subtitle="Manage system settings and configurations"
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
                    <h3 className="text-lg font-medium text-gray-900">Trip Management</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage trip records and configurations
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
                    <h3 className="text-lg font-medium text-gray-900">Trip Locations</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage warehouses and destinations
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
                    <h3 className="text-lg font-medium text-gray-900">Vehicle Management</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage vehicle fleet and maintenance
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
                    <h3 className="text-lg font-medium text-gray-900">Driver Management</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage drivers and assignments
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
                    <h3 className="text-lg font-medium text-gray-900">Maintenance Tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure maintenance task types
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
                    <h3 className="text-lg font-medium text-gray-900">Alert Settings</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure alert rules and notifications
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
                      <h2 className="text-lg font-medium text-gray-900">Trip Management</h2>
                      <p className="text-sm text-gray-500">View and manage all trip records</p>
                    </div>
                    <Link to="/admin/trips">
                      <Button>View All Trips</Button>
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Vehicle Management</h2>
                      <p className="text-sm text-gray-500">Manage vehicle master data and configurations</p>
                    </div>
                    <Link to="/vehicles">
                      <Button>Manage Vehicles</Button>
                    </Link>
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
                      <h2 className="text-lg font-medium text-gray-900">Driver Management</h2>
                      <p className="text-sm text-gray-500">Manage driver master data and configurations</p>
                    </div>
                    <Link to="/drivers">
                      <Button>Manage Drivers</Button>
                    </Link>
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