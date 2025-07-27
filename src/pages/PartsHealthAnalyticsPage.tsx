import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PartHealthCard from '../components/parts/PartHealthCard';
import { MaintenanceTask } from '../types/maintenance';
import { Vehicle } from '../types';
import { getTasks } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { 
  getPartsHealthMetrics, 
  getPartsByCategory, 
  getFleetPartHealthSummary,
  PartHealthMetrics 
} from '../utils/partsAnalytics';
import { 
  ChevronLeft, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  IndianRupee
} from 'lucide-react';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import StatCard from '../components/ui/StatCard';
import { toast } from 'react-toastify';

const PartsHealthAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'health' | 'analytics'>('health');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [partsMetrics, setPartsMetrics] = useState<PartHealthMetrics[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

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
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Get filtered parts
  const filteredParts = partsMetrics.filter(part => {
    if (selectedCategory !== 'all' && part.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'all' && part.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Get parts organized by category
  const partsByCategory = getPartsByCategory(filteredParts);
  
  // Get fleet summary
  const fleetSummary = getFleetPartHealthSummary(partsMetrics);

  // Get unique categories for filter
  const categories = Array.from(new Set(partsMetrics.map(part => part.category)));

  // Handle part card click (placeholder for future drilldown)
  const handlePartClick = (part: PartHealthMetrics) => {
    toast.info(`Detailed analytics for ${part.partName} coming soon!`);
  };

  if (loading) {
    return (
      <Layout title="Parts Health & Analytics">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">Loading parts health data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Parts Health & Analytics"
      subtitle="Monitor and analyze the health of all vehicle parts across your fleet"
      actions={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            isLoading={refreshing}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/maintenance')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Maintenance
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Fleet Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Parts Overdue"
            value={fleetSummary.overdueParts}
            icon={<AlertTriangle className="h-5 w-5 text-error-600" />}
            warning={fleetSummary.overdueParts > 0}
          />
          
          <StatCard
            title="Need Attention"
            value={fleetSummary.needsAttentionParts}
            icon={<Settings className="h-5 w-5 text-warning-600" />}
            warning={fleetSummary.needsAttentionParts > 0}
          />
          
          <StatCard
            title="Parts in Good Health"
            value={fleetSummary.goodParts}
            icon={<CheckCircle className="h-5 w-5 text-success-600" />}
          />
          
          <StatCard
            title="Estimated Upcoming Costs"
            value={`₹${fleetSummary.estimatedUpcomingCosts.toLocaleString('en-IN')}`}
            icon={<IndianRupee className="h-5 w-5 text-primary-600" />}
          />
        </div>

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
                  <Settings className="h-4 w-4" />
                  <span>Status & Health</span>
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
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4">
                    <div className="w-48">
                      <Select
                        label="Category"
                        options={[
                          { value: 'all', label: 'All Categories' },
                          ...categories.map(cat => ({ value: cat, label: cat }))
                        ]}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        size="sm"
                      />
                    </div>
                    
                    <div className="w-48">
                      <Select
                        label="Status"
                        options={[
                          { value: 'all', label: 'All Status' },
                          { value: 'overdue', label: 'Overdue' },
                          { value: 'needs_attention', label: 'Needs Attention' },
                          { value: 'good', label: 'Good' }
                        ]}
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        size="sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Download className="h-4 w-4" />}
                      onClick={() => toast.info('Export functionality coming soon!')}
                    >
                      Export
                    </Button>
                  </div>
                </div>

                {/* Parts Grid by Category */}
                {Object.keys(partsByCategory).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(partsByCategory).map(([category, categoryParts]) => (
                      <div key={category}>
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <span className="mr-2">{categoryParts[0]?.icon}</span>
                          {category}
                          <span className="ml-2 text-sm text-gray-500">({categoryParts.length})</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {categoryParts.map(part => (
                            <PartHealthCard
                              key={part.partId}
                              part={part}
                              onClick={() => handlePartClick(part)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Parts Data Found</h3>
                    <p className="text-gray-500">
                      {selectedCategory !== 'all' || selectedStatus !== 'all' 
                        ? 'Try adjusting your filters to see more results.'
                        : 'Start recording maintenance tasks to see parts health insights.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Analytics Tab - Placeholder */
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Advanced Analytics</h3>
                <p className="text-gray-500 mb-4">
                  Detailed brand comparisons, cost trends, and failure analysis coming soon!
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('health')}
                  icon={<TrendingUp className="h-4 w-4" />}
                >
                  View Parts Health Status
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PartsHealthAnalyticsPage;