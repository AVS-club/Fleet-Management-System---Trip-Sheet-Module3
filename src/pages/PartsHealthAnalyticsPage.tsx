import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PartHealthDashboard from '../components/parts/PartHealthDashboard';
import ExpenditureAnalytics from '../components/maintenance/ExpenditureAnalytics';
import VehicleMaintenanceIntensity from '../components/maintenance/VehicleMaintenanceIntensity';
import VehicleDowntimeChart from '../components/maintenance/VehicleDowntimeChart';
import TaskDistributionChart from '../components/maintenance/TaskDistributionChart';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { getTasks } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { getDateRangeForFilter, calculateMaintenanceMetrics } from '../utils/maintenanceAnalytics';
import { 
  getPartsHealthMetrics, 
  PartHealthMetrics 
} from '../utils/partsAnalytics';
import { 
  ChevronLeft, 
  Settings, 
  BarChart3, 
  RefreshCw,
  Activity
} from 'lucide-react';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';

const PartsHealthAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'health' | 'analytics'>('health');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [partsMetrics, setPartsMetrics] = useState<PartHealthMetrics[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<any>({
    monthlyExpenditure: [],
    expenditureByVehicle: [],
    expenditureByVendor: [],
    taskTypeDistribution: [],
    vehicleDowntime: [],
    kmBetweenMaintenance: [],
    previousPeriodComparison: {
      totalExpenditure: 0,
      percentChange: 0
    }
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksData, vehiclesData] = await Promise.all([
          getTasks(),
          getVehicles()
        ]);
        
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        
        // Calculate parts metrics
        const metrics = getPartsHealthMetrics(
          Array.isArray(tasksData) ? tasksData : [],
          Array.isArray(vehiclesData) ? vehiclesData : []
        );
        setPartsMetrics(metrics);
        
        // Calculate analytics metrics for the Analytics tab
        const dateRange = getDateRangeForFilter('allTime');
        const analyticsData = calculateMaintenanceMetrics(
          Array.isArray(tasksData) ? tasksData : [],
          Array.isArray(vehiclesData) ? vehiclesData : [],
          dateRange
        );
        setAnalyticsMetrics(analyticsData);
        
      } catch (error) {
        console.error('Error fetching parts health data:', error);
        toast.error('Failed to load parts health data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [tasksData, vehiclesData] = await Promise.all([
        getTasks(),
        getVehicles()
      ]);
      
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      
      const metrics = getPartsHealthMetrics(
        Array.isArray(tasksData) ? tasksData : [],
        Array.isArray(vehiclesData) ? vehiclesData : []
      );
      setPartsMetrics(metrics);
      
      // Recalculate analytics metrics
      const dateRange = getDateRangeForFilter('allTime');
      const analyticsData = calculateMaintenanceMetrics(
        Array.isArray(tasksData) ? tasksData : [],
        Array.isArray(vehiclesData) ? vehiclesData : [],
        dateRange
      );
      setAnalyticsMetrics(analyticsData);
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">Loading parts health data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Page Header - Same style as Maintenance Dashboard */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Settings className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
            Parts Health & Analytics
          </h1>
        </div>
        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">
          Monitor and analyze the health of all vehicle parts across your fleet
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            isLoading={refreshing}
            icon={<RefreshCw className="h-4 w-4" />}
            inputSize="sm"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/maintenance')}
            icon={<ChevronLeft className="h-4 w-4" />}
            inputSize="sm"
          >
            Back to Maintenance
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'health'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('health')}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Part Health</span>
                </div>
              </button>
              
              <button
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('analytics')}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'health' ? (
              /* Part Health Tab - NEW Dashboard */
              <PartHealthDashboard
                tasks={tasks}
                vehicles={vehicles}
                partsMetrics={partsMetrics}
              />
            ) : (
              /* Analytics Tab - EXISTING Charts */
              <div className="space-y-6">
                {/* Expenditure Analytics */}
                <ExpenditureAnalytics
                  monthlyExpenditure={analyticsMetrics.monthlyExpenditure}
                  expenditureByVehicle={analyticsMetrics.expenditureByVehicle}
                  expenditureByVendor={analyticsMetrics.expenditureByVendor}
                  taskTypeDistribution={analyticsMetrics.taskTypeDistribution}
                  previousPeriodComparison={analyticsMetrics.previousPeriodComparison}
                />
                
                {/* KM Between Maintenance */}
                <VehicleMaintenanceIntensity
                  kmBetweenMaintenance={analyticsMetrics.kmBetweenMaintenance}
                />
                
                {/* Vehicle Downtime Chart */}
                <VehicleDowntimeChart
                  vehicleDowntime={analyticsMetrics.vehicleDowntime}
                />
                
                {/* Task Distribution Chart */}
                <TaskDistributionChart
                  taskTypeDistribution={analyticsMetrics.taskTypeDistribution}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PartsHealthAnalyticsPage;