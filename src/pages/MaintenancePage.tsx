import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout'; 
import { MaintenanceTask, Vehicle } from '../types';
import { getDateRangeForFilter, calculateMaintenanceMetrics, getMaintenanceMetricsWithComparison, exportMaintenanceReport } from '../utils/maintenanceAnalytics';
import { getTasks, createTask } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { PlusCircle, PenTool as PenToolIcon, Download, Settings, BarChart3, Wrench } from 'lucide-react';
import Button from '../components/ui/Button';
import MaintenanceDashboardFilters from '../components/maintenance/MaintenanceDashboardFilters';
import KPIPanel from '../components/maintenance/KPIPanel';
import EnhancedMaintenanceTable from '../components/maintenance/EnhancedMaintenanceTable';
import MaintenanceTaskForm from '../components/maintenance/MaintenanceTaskForm';
import { createTask } from '../utils/maintenanceStorage';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

const MaintenancePage = () => {
  const navigate = useNavigate();
  const [dateRangeFilter, setDateRangeFilter] = useState('allTime');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [metrics, setMetrics] = useState<any>({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasksThisMonth: 0,
    averageCompletionTime: 0,
    averageCost: 0,
    totalExpenditure: 0,
    monthlyExpenditure: [],
    expenditureByVehicle: [],
    expenditureByVendor: [],
    taskTypeDistribution: [],
    vehicleDowntime: [],
    kmBetweenMaintenance: [],
    previousPeriodComparison: {
      totalTasks: 0,
      totalExpenditure: 0,
      percentChange: 0
    }
  });

  // Initialize custom date range values
  useEffect(() => {
    const today = new Date();
    setCustomDateRange({
      start: '2020-01-01',
      end: today.toISOString().split('T')[0]
    });
  }, []);

  // Use React Query to fetch tasks
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['maintenanceTasks'],
    queryFn: getTasks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use React Query to fetch vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSaveMaintenance = async (taskData: any) => {
    setIsSubmitting(true);
    try {
      await createTask(taskData);
      toast.success('Maintenance task created successfully');
      setIsAddingMaintenance(false);
      refetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error creating maintenance task:', error);
      toast.error('Failed to create maintenance task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMaintenance = () => {
    setIsAddingMaintenance(false);
  };

  // Calculate metrics whenever date range changes or data is loaded
  useEffect(() => {
    if (!tasksLoading && !vehiclesLoading && tasks && vehicles) {
      calculateMetrics(tasks, vehicles, dateRangeFilter);
    }
  }, [dateRangeFilter, customDateRange, tasks, vehicles, tasksLoading, vehiclesLoading]);
  
  const calculateMetrics = async (tasksData: MaintenanceTask[], vehiclesData: Vehicle[], filter: string) => {
    try {
      const dateRange = getDateRangeForFilter(
        filter, 
        customDateRange.start, 
        customDateRange.end
      );
      
      // Get metrics with comparison to previous period
      const metricsData = await getMaintenanceMetricsWithComparison(
        dateRange,
        tasksData,
        vehiclesData
      );
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error calculating maintenance metrics:', error);
    }
  };
  
  const handleSaveMaintenance = async (data: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>) => {
    setIsSubmitting(true);
    try {
      const newTask = await createTask(data);
      if (newTask) {
        toast.success('Maintenance task created successfully');
        setIsAddingMaintenance(false);
        // Refresh the tasks list
        refetchTasks();
      }
    } catch (error) {
      console.error('Error creating maintenance task:', error);
      toast.error('Failed to create maintenance task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMaintenance = () => {
    setIsAddingMaintenance(false);
  };

  const handleExportPDF = () => {
    const dateRange = getDateRangeForFilter(dateRangeFilter, customDateRange.start, customDateRange.end);
    exportMaintenanceReport(tasks || [], vehicles || [], 'pdf', dateRange);
  };
  
  const handleExportCSV = () => {
    const dateRange = getDateRangeForFilter(dateRangeFilter, customDateRange.start, customDateRange.end);
    exportMaintenanceReport(tasks || [], vehicles || [], 'csv', dateRange);
  };

  if (tasksLoading || vehiclesLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      </Layout>
    );
  }

  // Show maintenance form when adding
  if (isAddingMaintenance) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Maintenance Task</h1>
            <Button
              variant="outline"
              onClick={handleCancelMaintenance}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
          <MaintenanceTaskForm
            vehicles={vehicles || []}
            onSubmit={handleSaveMaintenance}
            onCancel={handleCancelMaintenance}
            isSubmitting={isSubmitting}
          />
        </div>
      </Layout>
    );
  }

  const loading = tasksLoading || vehiclesLoading;

  return (
    <Layout>
      {isAddingMaintenance ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-primary-500" />
              New Maintenance Task
            </h2>
            <Button variant="outline" onClick={handleCancelMaintenance}>
              Cancel
            </Button>
          </div>

          <MaintenanceTaskForm
            vehicles={vehicles || []}
            onSubmit={handleSaveMaintenance}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        <>
          {/* Page Header */}
          <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
            <div className="flex items-center group">
              <Wrench className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Maintenance Dashboard</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Track and analyze vehicle maintenance performance</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => setIsAddingMaintenance(true)}
                icon={<PlusCircle className="h-4 w-4" />}
                size="sm"
              >
                New Task
              </Button>
              <Button
                onClick={() => navigate('/parts-health')}
                icon={<BarChart3 className="h-4 w-4" />}
                variant="outline"
                size="sm"
              >
                Parts Health & Analytics
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 text-gray-600">Loading maintenance analytics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Global Filter Bar */}
              <MaintenanceDashboardFilters
                dateRangeFilter={dateRangeFilter}
                onDateRangeFilterChange={setDateRangeFilter}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
              />
              
              {/* KPI Panel */}
              <KPIPanel
                totalTasks={metrics.totalTasks}
                pendingTasks={metrics.pendingTasks}
                averageCompletionTime={metrics.averageCompletionTime}
                completedTasksThisMonth={metrics.completedTasksThisMonth}
                averageCost={metrics.averageCost}
                totalExpenditure={metrics.totalExpenditure}
                previousPeriodComparison={metrics.previousPeriodComparison}
              />
              
              {/* Enhanced Maintenance Table */}
              <EnhancedMaintenanceTable 
                tasks={tasks || []}
                vehicles={vehicles || []}
              />
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default MaintenancePage;