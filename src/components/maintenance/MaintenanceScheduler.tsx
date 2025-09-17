import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  Truck,
  Bell,
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { Vehicle, MaintenanceTask } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '../../utils/storage';
import { getTasks } from '../../utils/maintenanceStorage';
import Button from '../ui/Button';

interface ScheduledMaintenance {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  taskType: string;
  scheduledDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // in hours
  assignedTechnician?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  description: string;
  estimatedCost: number;
  reminderSent: boolean;
}

interface MaintenanceCalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'scheduled' | 'overdue' | 'completed';
  priority: string;
  vehicle: string;
  duration: number;
}

const MaintenanceScheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'overdue' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const { data: maintenanceTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: getTasks,
  });

  const loading = vehiclesLoading || tasksLoading;

  // Generate scheduled maintenance from existing tasks and predictions
  const scheduledMaintenance = useMemo((): ScheduledMaintenance[] => {
    const scheduled: ScheduledMaintenance[] = [];

    // Convert existing maintenance tasks
    maintenanceTasks.forEach(task => {
      if (task.status === 'open' || task.status === 'in_progress') {
        scheduled.push({
          id: task.id,
          vehicleId: task.vehicle_id,
          vehicleRegistration: vehicles.find(v => v.id === task.vehicle_id)?.registration_number || 'Unknown',
          taskType: task.task_type,
          scheduledDate: new Date(task.start_date),
          priority: task.priority,
          estimatedDuration: task.downtime_days * 8, // Convert days to hours
          assignedTechnician: task.vendor_id,
          status: task.status === 'in_progress' ? 'in_progress' : 'scheduled',
          description: task.description,
          estimatedCost: task.estimated_cost,
          reminderSent: false
        });
      }
    });

    // Generate predictive maintenance schedules
    vehicles.forEach(vehicle => {
      const currentMileage = vehicle.current_odometer;
      
      // Engine service every 10,000 km
      const engineServiceInterval = 10000;
      const nextEngineService = Math.ceil(currentMileage / engineServiceInterval) * engineServiceInterval;
      const engineServiceDate = new Date(Date.now() + ((nextEngineService - currentMileage) / 100) * 24 * 60 * 60 * 1000);

      if (nextEngineService - currentMileage < 2000) { // Within 2000 km
        scheduled.push({
          id: `engine-${vehicle.id}-${nextEngineService}`,
          vehicleId: vehicle.id,
          vehicleRegistration: vehicle.registration_number,
          taskType: 'Engine Service',
          scheduledDate: engineServiceDate,
          priority: nextEngineService - currentMileage < 500 ? 'high' : 'medium',
          estimatedDuration: 4,
          status: 'scheduled',
          description: 'Regular engine service and oil change',
          estimatedCost: 5000,
          reminderSent: false
        });
      }

      // Brake inspection every 15,000 km
      const brakeInspectionInterval = 15000;
      const nextBrakeInspection = Math.ceil(currentMileage / brakeInspectionInterval) * brakeInspectionInterval;
      const brakeInspectionDate = new Date(Date.now() + ((nextBrakeInspection - currentMileage) / 100) * 24 * 60 * 60 * 1000);

      if (nextBrakeInspection - currentMileage < 2000) {
        scheduled.push({
          id: `brake-${vehicle.id}-${nextBrakeInspection}`,
          vehicleId: vehicle.id,
          vehicleRegistration: vehicle.registration_number,
          taskType: 'Brake Inspection',
          scheduledDate: brakeInspectionDate,
          priority: nextBrakeInspection - currentMileage < 500 ? 'high' : 'medium',
          estimatedDuration: 2,
          status: 'scheduled',
          description: 'Brake system inspection and pad replacement if needed',
          estimatedCost: 3000,
          reminderSent: false
        });
      }
    });

    // Mark overdue items
    const now = new Date();
    scheduled.forEach(item => {
      if (item.scheduledDate < now && item.status === 'scheduled') {
        item.status = 'overdue';
        item.priority = 'critical';
      }
    });

    return scheduled.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [vehicles, maintenanceTasks]);

  // Filter and search maintenance items
  const filteredMaintenance = useMemo(() => {
    let filtered = scheduledMaintenance;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.vehicleRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.taskType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [scheduledMaintenance, filterStatus, searchTerm]);

  // Calendar events for calendar view
  const calendarEvents = useMemo((): MaintenanceCalendarEvent[] => {
    return filteredMaintenance.map(item => ({
      id: item.id,
      title: `${item.vehicleRegistration} - ${item.taskType}`,
      date: item.scheduledDate,
      type: item.status === 'overdue' ? 'overdue' : item.status === 'completed' ? 'completed' : 'scheduled',
      priority: item.priority,
      vehicle: item.vehicleRegistration,
      duration: item.estimatedDuration
    }));
  }, [filteredMaintenance]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    const selectedDateStr = selectedDate.toDateString();
    return calendarEvents.filter(event => event.date.toDateString() === selectedDateStr);
  }, [calendarEvents, selectedDate]);

  // Statistics
  const stats = useMemo(() => {
    const total = scheduledMaintenance.length;
    const overdue = scheduledMaintenance.filter(item => item.status === 'overdue').length;
    const scheduled = scheduledMaintenance.filter(item => item.status === 'scheduled').length;
    const completed = scheduledMaintenance.filter(item => item.status === 'completed').length;
    const totalCost = scheduledMaintenance.reduce((sum, item) => sum + item.estimatedCost, 0);

    return { total, overdue, scheduled, completed, totalCost };
  }, [scheduledMaintenance]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled': return <Calendar className="h-4 w-4 text-gray-600" />;
      default: return <Wrench className="h-4 w-4 text-gray-600" />;
    }
  };

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
            Maintenance Scheduler
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Schedule and track vehicle maintenance tasks
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => {/* Open new maintenance modal */}}
            variant="primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
            <Wrench className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{stats.totalCost.toLocaleString()}
              </p>
            </div>
            <Truck className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search maintenance tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-100 text-primary-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Scheduled Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMaintenance.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.vehicleRegistration}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.taskType}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.scheduledDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.estimatedDuration}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        ₹{item.estimatedCost.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-primary-600 hover:text-primary-900">
                          Edit
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          Complete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Calendar view would be implemented here</p>
            <p className="text-sm">Using a calendar library like FullCalendar or React Big Calendar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceScheduler;
