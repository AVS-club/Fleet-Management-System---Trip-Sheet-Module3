import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PartHealthDashboard from '../components/parts/PartHealthDashboard';
import TagBasedComparison from '../components/parts/TagBasedComparison';
import HistoricalTrends from '../components/parts/HistoricalTrends';
import ExpenditureAnalytics from '../components/maintenance/ExpenditureAnalytics';
import VehicleMaintenanceIntensity from '../components/maintenance/VehicleMaintenanceIntensity';
import VehicleDowntimeChart from '../components/maintenance/VehicleDowntimeChart';
import TaskDistributionChart from '../components/maintenance/TaskDistributionChart';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle, Tag } from '@/types';
import { getTasks } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { getTags } from '../utils/api/tags';
import { getDateRangeForFilter, calculateMaintenanceMetrics } from '../utils/maintenanceAnalytics';
import { 
  getPartsHealthMetrics,
  getTagBasedPartsHealthMetrics,
  PartHealthMetrics 
} from '../utils/partsAnalytics';
import { 
  ChevronLeft, 
  Settings, 
  BarChart3, 
  RefreshCw,
  Activity,
  Tag as TagIcon
} from 'lucide-react';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';
import VehicleTagBadges from '../components/vehicles/VehicleTagBadges';

const PartsHealthAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'health' | 'analytics'>('health');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'peer-comparison' | 'historical-trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [partsMetrics, setPartsMetrics] = useState<PartHealthMetrics[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
        const [tasksData, vehiclesData, tagsData] = await Promise.all([
          getTasks(),
          getVehicles(),
          getTags()
        ]);
        
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setTags(Array.isArray(tagsData) ? tagsData : []);
        
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
      const [tasksData, vehiclesData, tagsData] = await Promise.all([
        getTasks(),
        getVehicles(),
        getTags()
      ]);
      
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
      
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

  // Calculate tag-based analytics summary
  const tagAnalyticsSummary = useMemo(() => {
    if (selectedTags.length === 0) return null;

    const filteredVehicles = vehicles.filter(v => 
      v.tags?.some(t => selectedTags.includes(t.id))
    );
    
    const filteredTasks = tasks.filter(t => 
      filteredVehicles.some(v => v.id === t.vehicle_id)
    );
    
    const totalCost = filteredTasks.reduce((sum, t) => sum + (t.cost || 0), 0);
    const avgCostPerVehicle = filteredVehicles.length > 0 ? totalCost / filteredVehicles.length : 0;
    
    return {
      vehicleCount: filteredVehicles.length,
      taskCount: filteredTasks.length,
      totalCost,
      avgCostPerVehicle,
      selectedTagNames: tags
        .filter(t => selectedTags.includes(t.id))
        .map(t => t.name)
    };
  }, [selectedTags, vehicles, tasks, tags]);

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
      {/* Page Header */}
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
        
        {/* Main Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'health' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('health')}
            icon={<Activity className="h-4 w-4" />}
            inputSize="sm"
          >
            Part Health
          </Button>
          
          <Button
            variant={activeTab === 'analytics' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('analytics')}
            icon={<BarChart3 className="h-4 w-4" />}
            inputSize="sm"
          >
            Analytics
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/maintenance')}
            icon={<ChevronLeft className="h-4 w-4" />}
            inputSize="sm"
          >
            Back to Maintenance
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            icon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
            inputSize="sm"
            className="ml-auto"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Part Health Tab */}
      {activeTab === 'health' && (
        <>
          {/* Part Health Tab Indicator */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm mb-6 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6" />
                <div>
                  <h2 className="text-lg font-semibold">Part Health</h2>
                  <p className="text-sm text-blue-100">Monitor vehicle parts condition and lifecycle</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{partsMetrics.filter(p => p.status === 'overdue').length}</div>
                  <div className="text-xs text-blue-100">Critical</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{partsMetrics.filter(p => p.status === 'needs_attention').length}</div>
                  <div className="text-xs text-blue-100">Warning</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{partsMetrics.filter(p => p.status === 'good').length}</div>
                  <div className="text-xs text-blue-100">Good</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    ₹{Math.round(partsMetrics.reduce((sum, p) => sum + (p.averageCost || 0), 0) / 1000)}K
                  </div>
                  <div className="text-xs text-blue-100">Est. Cost</div>
                </div>
              </div>
            </div>
          </div>

          {/* Render based on sub-tab */}
          {activeSubTab === 'overview' && (
            <PartHealthDashboard
              tasks={tasks}
              vehicles={vehicles}
              partsMetrics={partsMetrics}
              activeSubTab={activeSubTab}
              onSubTabChange={setActiveSubTab}
            />
          )}

          {activeSubTab === 'peer-comparison' && (
            <>
              <div className="mb-6">
                <PartHealthDashboard
                  tasks={tasks}
                  vehicles={vehicles}
                  partsMetrics={partsMetrics}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              </div>
              <TagBasedComparison
                tasks={tasks}
                vehicles={vehicles}
                selectedTags={selectedTags}
              />
            </>
          )}

          {activeSubTab === 'historical-trends' && (
            <>
              <div className="mb-6">
                <PartHealthDashboard
                  tasks={tasks}
                  vehicles={vehicles}
                  partsMetrics={partsMetrics}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              </div>
              <HistoricalTrends
                tasks={tasks}
                vehicles={vehicles}
                selectedTags={selectedTags}
              />
            </>
          )}
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {/* Analytics Tab Indicator */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg shadow-sm mb-6 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6" />
                <div>
                  <h2 className="text-lg font-semibold">Analytics</h2>
                  <p className="text-sm text-teal-100">Detailed maintenance analytics and trends</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tag-based Filter for Analytics */}
          {tags.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <TagIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filter Analytics by Tags:</span>
                <button
                  onClick={() => setSelectedTags([])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedTags.length === 0
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Vehicles
                </button>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (selectedTags.includes(tag.id)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag.id));
                      } else {
                        setSelectedTags([...selectedTags, tag.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color_hex : undefined
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              
              {tagAnalyticsSummary && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-600">Vehicles</div>
                      <div className="text-lg font-bold text-gray-900">{tagAnalyticsSummary.vehicleCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Tasks</div>
                      <div className="text-lg font-bold text-gray-900">{tagAnalyticsSummary.taskCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Total Cost</div>
                      <div className="text-lg font-bold text-gray-900">
                        ₹{tagAnalyticsSummary.totalCost.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Avg/Vehicle</div>
                      <div className="text-lg font-bold text-gray-900">
                        ₹{Math.round(tagAnalyticsSummary.avgCostPerVehicle).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analytics Components */}
          <div className="space-y-6">
            <ExpenditureAnalytics metrics={analyticsMetrics} />
            <VehicleMaintenanceIntensity 
              vehicles={selectedTags.length > 0 
                ? vehicles.filter(v => v.tags?.some(t => selectedTags.includes(t.id)))
                : vehicles
              } 
              tasks={tasks} 
            />
            <VehicleDowntimeChart 
              vehicles={selectedTags.length > 0 
                ? vehicles.filter(v => v.tags?.some(t => selectedTags.includes(t.id)))
                : vehicles
              } 
            />
            <TaskDistributionChart tasks={tasks} />
          </div>
        </>
      )}
    </Layout>
  );
};

export default PartsHealthAnalyticsPage;