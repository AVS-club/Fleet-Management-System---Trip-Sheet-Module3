import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { MaintenanceTask, Vehicle, MaintenanceStats } from '../types';
import { getTasks, getMaintenanceStats } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { PlusCircle, PenTool as Tool, AlertTriangle, Clock, IndianRupee, Download, Filter, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceCharts from '../components/maintenance/MaintenanceCharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1'];

const MaintenancePage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total_expenditure: 0,
    record_count: 0,
    average_monthly_expense: 0,
    average_task_cost: 0,
    expenditure_by_vehicle: {},
    expenditure_by_vendor: {},
    km_reading_difference: {},
    vehicle_downtime: {},
    average_completion_time: 0,
    total_tasks: 0,
    pending_tasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    vehicle_id: 'all',
    task_type: 'all',
    dateRange: {
      start: '',
      end: ''
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksData, vehiclesData, statsData] = await Promise.all([
          getTasks(),
          getVehicles(),
          getMaintenanceStats()
        ]);
        
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setStats(statsData || {
          total_expenditure: 0,
          record_count: 0,
          average_monthly_expense: 0,
          average_task_cost: 0,
          expenditure_by_vehicle: {},
          expenditure_by_vendor: {},
          km_reading_difference: {},
          vehicle_downtime: {},
          average_completion_time: 0,
          total_tasks: 0,
          pending_tasks: 0
        });
      } catch (error) {
        console.error('Error fetching maintenance data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    if (filter.search) {
      const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v.id === task.vehicle_id) : undefined;
      const searchTerm = filter.search.toLowerCase();
      const searchFields = [
        vehicle?.registration_number,
        task.task_type,
        task.status,
        task.priority
      ].map(field => field?.toLowerCase());

      if (!searchFields.some(field => field?.includes(searchTerm))) {
        return false;
      }
    }

    if (filter.status !== 'all' && task.status !== filter.status) {
      return false;
    }

    if (filter.priority !== 'all' && task.priority !== filter.priority) {
      return false;
    }

    if (filter.vehicle_id !== 'all' && task.vehicle_id !== filter.vehicle_id) {
      return false;
    }

    if (filter.dateRange.start && new Date(task.startDate) < new Date(filter.dateRange.start)) {
      return false;
    }

    if (filter.dateRange.end && new Date(task.startDate) > new Date(filter.dateRange.end)) {
      return false;
    }

    return true;
  }) : [];

  const handleExport = () => {
    const doc = new jsPDF();
    doc.text('Maintenance Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [['Vehicle', 'Type', 'Status', 'Priority', 'Date', 'Cost']],
      body: Array.isArray(filteredTasks) ? filteredTasks.map(task => [
        vehicles.find(v => v.id === task.vehicleId)?.registrationNumber || 'Unknown',
        task.taskType.replace('_', ' '),
        task.status.toUpperCase(),
        task.priority.toUpperCase(),
        format(new Date(task.startDate), 'dd/MM/yyyy'),
        `₹${(task.actualCost || task.estimatedCost || 0).toLocaleString()}`
      ]) : []
    });
    doc.save('maintenance-report.pdf');
  };

  // Calculate stats for current period vs last period
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentPeriodTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const taskDate = new Date(task.start_date);
    return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
  }) : [];

  const lastPeriodTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const taskDate = new Date(task.startDate);
    return taskDate.getMonth() === (currentMonth - 1) && taskDate.getFullYear() === currentYear;
  }) : [];

  const currentPeriodCost = currentPeriodTasks.reduce((sum, task) => 
    sum + (task.actual_cost || task.estimated_cost || 0), 
    0
  );

  const lastPeriodCost = lastPeriodTasks.reduce((sum, task) => 
    sum + (task.actual_cost || task.estimated_cost || 0), 
    0
  );

  const costChange = lastPeriodCost ? 
    ((currentPeriodCost - lastPeriodCost) / lastPeriodCost) * 100 : 
    0;

  return (
    <Layout
      title="Maintenance Management"
      subtitle="Track and manage vehicle maintenance tasks"
      actions={
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleExport}
            icon={<Download className="h-4 w-4" />}
            size="sm"
          >
            Export
          </Button>
          <Button
            onClick={() => navigate('/maintenance/new')}
            icon={<PlusCircle className="h-4 w-4" />}
            size="sm"
          >
            New Task
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">Loading maintenance data...</p>
        </div>
      ) : (
        <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Tasks</p>
                <h3 className="text-xl font-bold text-gray-900">{stats.total_tasks || 0}</h3>
                {stats.total_tasks > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {currentPeriodTasks.length} this month
                  </p>
                )}
              </div>
              <Tool className="h-6 w-6 text-primary-500" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Tasks</p>
                <h3 className="text-xl font-bold text-warning-600">{stats.pending_tasks || 0}</h3>
                {stats.pending_tasks > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Requires attention
                  </p>
                )}
              </div>
              <AlertTriangle className="h-6 w-6 text-warning-500" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Avg. Completion</p>
                <h3 className="text-xl font-bold text-gray-900">
                  {(typeof stats.average_completion_time === 'number' && !isNaN(stats.average_completion_time))
                    ? stats.average_completion_time.toFixed(1)
                    : '0.0'} days
                </h3>
                {stats.average_completion_time > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Based on completed tasks
                  </p>
                )}
              </div>
              <Clock className="h-6 w-6 text-primary-500" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Cost</p>
                <h3 className="text-xl font-bold text-success-600">
                  ₹{(stats.total_expenditure || 0).toLocaleString()}
                </h3>
                {costChange !== 0 && (
                  <p className={`text-xs ${costChange > 0 ? 'text-error-500' : 'text-success-500'} mt-1`}>
                    {costChange > 0 ? '↑' : '↓'} {Math.abs(costChange).toFixed(1)}% vs last month
                  </p>
                )}
              </div>
              <IndianRupee className="h-6 w-6 text-success-500" />
            </div>
          </div>
        </div>

        <MaintenanceCharts tasks={tasks} vehicles={vehicles} />

        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm">
          <Input
            placeholder="Search tasks..."
            icon={<Search className="h-4 w-4" />}
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            className="w-64"
            size="sm"
          />
          
          <Select
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'escalated', label: 'Escalated' }
            ]}
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="w-36"
            size="sm"
          />
          
          <Select
            options={[
              { value: 'all', label: 'All Priority' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' }
            ]}
            value={filter.priority}
            onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
            className="w-36"
            size="sm"
          />
          
          <Select
            options={[
              { value: 'all', label: 'All Vehicles' },
              ...Array.isArray(vehicles) ? vehicles.map(v => ({
                value: v.id,
                label: v.registration_number
              })) : []
            ]}
            value={filter.vehicleId}
            onChange={e => setFilter(f => ({ ...f, vehicleId: e.target.value }))}
            className="w-40"
            size="sm"
          />

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filter.dateRange.start}
              onChange={e => setFilter(f => ({
                ...f,
                dateRange: { ...f.dateRange, start: e.target.value }
              }))}
              className="w-32"
              size="sm"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={filter.dateRange.end}
              onChange={e => setFilter(f => ({
                ...f,
                dateRange: { ...f.dateRange, end: e.target.value }
              }))}
              className="w-32"
              size="sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <MaintenanceTable
            data={filteredTasks}
            vehicles={vehicles}
            onRowClick={(task) => navigate(`/maintenance/${task.id}`)}
          />
        </div>
      </div>
      )}
    </Layout>
  );
};

export default MaintenancePage;