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
import ServicesPartsBreakdown from '../components/maintenance/ServicesPartsBreakdown';
import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle, Tag } from '@/types';
import { getTasks } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { getTags } from '../utils/api/tags';
import { getVendors } from '../utils/vendorStorage';
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
  Tag as TagIcon,
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  ChevronDown
} from 'lucide-react';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';
import { createLogger } from '../utils/logger';

const logger = createLogger('PartsHealthAnalyticsPage');

const PartsHealthAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'health' | 'analytics'>('health');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'peer-comparison' | 'historical-trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [partsMetrics, setPartsMetrics] = useState<PartHealthMetrics[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [selectedPartType, setSelectedPartType] = useState<string>('all');
  const [analyticsMetrics, setAnalyticsMetrics] = useState<any>({
    monthlyExpenditure: [],
    expenditureByVehicle: [],
    expenditureByVendor: [],
    taskTypeDistribution: [],
    vehicleDowntime: [],
    kmBetweenMaintenance: [],
    serviceTypeBreakdown: [],
    partsBreakdown: [],
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
        const [tasksData, vehiclesData, tagsData, vendorsData] = await Promise.all([
          getTasks(),
          getVehicles(),
          getTags(),
          getVendors()
        ]);
        
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setTags(Array.isArray(tagsData) ? tagsData : []);
        setVendors(Array.isArray(vendorsData) ? vendorsData : []);
        
        const metrics = getPartsHealthMetrics(
          Array.isArray(tasksData) ? tasksData : [],
          Array.isArray(vehiclesData) ? vehiclesData : []
        );
        setPartsMetrics(metrics);
        
        const dateRange = getDateRangeForFilter('allTime');
        const analyticsData = calculateMaintenanceMetrics(
          Array.isArray(tasksData) ? tasksData : [],
          Array.isArray(vehiclesData) ? vehiclesData : [],
          dateRange,
          Array.isArray(vendorsData) ? vendorsData : []
        );
        setAnalyticsMetrics(analyticsData);
        
      } catch (error) {
        logger.error('Error fetching parts health data:', error);
        toast.error('Failed to load parts health data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [tasksData, vehiclesData, tagsData, vendorsData] = await Promise.all([
        getTasks(),
        getVehicles(),
        getTags(),
        getVendors()
      ]);
      
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      
      const metrics = getPartsHealthMetrics(
        Array.isArray(tasksData) ? tasksData : [],
        Array.isArray(vehiclesData) ? vehiclesData : []
      );
      setPartsMetrics(metrics);
      
      const dateRange = getDateRangeForFilter('allTime');
      const analyticsData = calculateMaintenanceMetrics(
        Array.isArray(tasksData) ? tasksData : [],
        Array.isArray(vehiclesData) ? vehiclesData : [],
        dateRange,
        Array.isArray(vendorsData) ? vendorsData : []
      );
      setAnalyticsMetrics(analyticsData);
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const critical = partsMetrics.filter(p => p.status === 'overdue').length;
    const warning = partsMetrics.filter(p => p.status === 'needs_attention').length;
    const good = partsMetrics.filter(p => p.status === 'good').length;
    const upcomingCost = partsMetrics
      .filter(p => p.status !== 'good')
      .reduce((sum, p) => sum + (p.averageCost || 0), 0);

    return { critical, warning, good, upcomingCost };
  }, [partsMetrics]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64 px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600 text-center">Loading parts health data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 md:pb-6">
        {/* Mobile-Optimized Header */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          {/* Title Row */}
          <div className="px-3 sm:px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Settings className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                  Parts Health
                </h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-shrink-0 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Stats - Horizontally Scrollable on Mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              <div className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800 min-w-[90px]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div>
                    <div className="text-lg font-bold text-red-900 dark:text-red-100">{metrics.critical}</div>
                    <div className="text-[10px] text-red-700 dark:text-red-300">Critical</div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2 border border-yellow-200 dark:border-yellow-800 min-w-[90px]">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">{metrics.warning}</div>
                    <div className="text-[10px] text-yellow-700 dark:text-yellow-300">Warning</div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 border border-green-200 dark:border-green-800 min-w-[90px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-lg font-bold text-green-900 dark:text-green-100">{metrics.good}</div>
                    <div className="text-[10px] text-green-700 dark:text-green-300">Good</div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800 min-w-[100px]">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">₹</span>
                  <div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {(metrics.upcomingCost / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300">Est. Cost</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation - Swipeable on Mobile */}
          <div className="flex gap-1 px-3 sm:px-4 pb-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('health')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'health'
                  ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-1.5" />
              Part Health
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-1.5" />
              Analytics
            </button>

            <button
              onClick={() => navigate('/maintenance')}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <ChevronLeft className="h-4 w-4 inline mr-1" />
              Back
            </button>
          </div>

          {/* Tag Filter Button - Mobile */}
          {tags.length > 0 && (
            <div className="px-3 sm:px-4 pb-2">
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedTags.length === 0
                      ? 'Filter by Tags'
                      : `${selectedTags.length} tag(s) selected`
                    }
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform ${
                  showTagFilter ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Expandable Tag Filter */}
              {showTagFilter && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Tags:</span>
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'text-white shadow-md ring-2 ring-offset-1'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        style={{
                          backgroundColor: selectedTags.includes(tag.id) ? tag.color_hex : undefined,
                          ringColor: selectedTags.includes(tag.id) ? tag.color_hex : undefined
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-3 sm:px-4 py-4 space-y-4">
          {activeTab === 'health' && (
            <>
              {/* Sub-tab Navigation - Mobile Optimized */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
                <button
                  onClick={() => setActiveSubTab('overview')}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSubTab === 'overview'
                      ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveSubTab('peer-comparison')}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeSubTab === 'peer-comparison'
                      ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Tag Comparison
                </button>
                <button
                  onClick={() => setActiveSubTab('historical-trends')}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeSubTab === 'historical-trends'
                      ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Trends
                </button>
              </div>

              {/* Content based on sub-tab */}
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
                <TagBasedComparison
                  tasks={tasks}
                  vehicles={vehicles}
                  selectedTags={selectedTags}
                />
              )}

              {activeSubTab === 'historical-trends' && (
                <HistoricalTrends
                  tasks={tasks}
                  vehicles={vehicles}
                  selectedTags={selectedTags}
                />
              )}
            </>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <ExpenditureAnalytics 
                monthlyExpenditure={analyticsMetrics.monthlyExpenditure || []}
                expenditureByVehicle={analyticsMetrics.expenditureByVehicle || []}
                expenditureByVendor={analyticsMetrics.expenditureByVendor || []}
                taskTypeDistribution={analyticsMetrics.taskTypeDistribution || []}
                previousPeriodComparison={analyticsMetrics.previousPeriodComparison}
              />
              <VehicleMaintenanceIntensity 
                kmBetweenMaintenance={analyticsMetrics.kmBetweenMaintenance || []}
              />
              <VehicleDowntimeChart 
                vehicleDowntime={analyticsMetrics.vehicleDowntime || []}
              />
              <TaskDistributionChart 
                taskTypeDistribution={analyticsMetrics.taskTypeDistribution || []}
              />
              <ServicesPartsBreakdown
                serviceTypeBreakdown={analyticsMetrics.serviceTypeBreakdown || []}
                partsBreakdown={analyticsMetrics.partsBreakdown || []}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet Overlay (for future use) */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Layout>
  );
};

export default PartsHealthAnalyticsPage;