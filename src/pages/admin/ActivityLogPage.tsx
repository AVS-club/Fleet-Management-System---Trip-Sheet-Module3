import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout'; 
import { ChevronLeft, ActivitySquare, Calendar, User, Search, Filter } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import VehicleActivityLogTable from '../../components/admin/VehicleActivityLogTable';

const ActivityLogPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateRange, setDateRange] = useState('last7');
  const [actionType, setActionType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const refreshLogs = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <ActivitySquare className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Activity Logs</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">View system activity and audit logs</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Admin
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-4 justify-between border-l-2 border-blue-500 pl-2">
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                <Input
                  placeholder="Search logs..."
                  icon={<Search className="h-4 w-4" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="w-40">
                <Select
                  options={[
                    { value: '', label: 'All Actions' },
                    { value: 'created', label: 'Created' },
                    { value: 'updated', label: 'Updated' },
                    { value: 'deleted', label: 'Deleted' },
                    { value: 'archived', label: 'Archived' },
                    { value: 'assigned_driver', label: 'Assigned Driver' },
                    { value: 'login', label: 'User Login' }
                  ]}
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                />
              </div>
              
              <div className="w-40">
                <Select
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last7', label: 'Last 7 Days' },
                    { value: 'last30', label: 'Last 30 Days' },
                    { value: 'all', label: 'All Time' }
                  ]}
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Button
                variant="outline"
                onClick={refreshLogs}
                icon={<ActivitySquare className="h-4 w-4" />}
              >
                Refresh Logs
              </Button>
            </div>
          </div>
        </div>
        
        {/* Vehicle Activity Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ActivitySquare className="h-5 w-5 text-primary-600 mr-2" />
              Vehicle Activity Logs
            </h3>
          </div>
          
          <VehicleActivityLogTable refreshTrigger={refreshTrigger} />
        </div>
        
        {/* Other Log Sections - Coming Soon */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">User Activity Logs</h2>
          </div>
          <p className="text-gray-500 mb-4">
            View user login, logout, and system access events.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-700">
              This feature is coming soon. Check back later for updates.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ActivityLogPage;