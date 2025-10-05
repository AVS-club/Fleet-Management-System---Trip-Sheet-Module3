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
      {/* Page Header with Apple Design */}
      <div className="rounded-xl border bg-white/95 backdrop-blur-sm px-4 py-3 shadow-sm mb-6 border-gray-200/80">
        <div className="flex items-center group">
          <Settings className="h-5 w-5 mr-2 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Parts Health & Analytics
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 ml-7">
          Comprehensive vehicle parts monitoring and predictive analysis
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* 1. Part Health - Primary Action */}
          <Button
            variant={activeTab === 'health' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('health')}
            icon={<Activity className="h-4 w-4" />}
            inputSize="sm"
          >
            Part Health
          </Button>
          
          {/* 2. Analytics */}
          <Button
            variant={activeTab === 'analytics' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('analytics')}
            icon={<BarChart3 className="h-4 w-4" />}
            inputSize="sm"
          >
            Analytics
          </Button>
          
          {/* 3. Back to Maintenance */}
          <Button
            variant="outline"
            onClick={() => navigate('/maintenance')}
            icon={<ChevronLeft className="h-4 w-4" />}
            inputSize="sm"
          >
            Back to Maintenance
          </Button>
          
          {/* 4. Refresh */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            isLoading={refreshing}
            icon={<RefreshCw className="h-4 w-4" />}
            inputSize="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tabs with Apple Design */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80">
          <div className="flex space-x-1 p-2">
            <button
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'health'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('health')}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Part Health</span>
              </div>
            </button>
            
            <button
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </div>
            </button>
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