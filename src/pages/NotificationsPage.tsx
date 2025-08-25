import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ReminderItem, getRemindersForAll } from '../utils/reminders';
import { Bell, AlertTriangle, Clock, Calendar, ChevronRight, Filter, Search, ExternalLink } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const NotificationsPage: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    module: 'all'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReminders = async () => {
      setLoading(true);
      try {
        const items = await getRemindersForAll();
        setReminders(items);
      } catch (error) {
        console.error('Error fetching all reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  const handleReminderClick = (reminder: ReminderItem) => {
    navigate(reminder.link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-error-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      default:
        return <Clock className="h-5 w-5 text-success-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-error-50 border-error-200 text-error-800';
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800';
      default:
        return 'bg-success-50 border-success-200 text-success-800';
    }
  };

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'vehicles':
        return 'Vehicle';
      case 'drivers':
        return 'Driver';
      case 'maintenance':
        return 'Maintenance';
      case 'trips':
        return 'Trip';
      case 'ai_alerts':
        return 'AI Alerts';
      default:
        return 'Unknown';
    }
  };

  // Filter reminders based on search and filters
  const filteredReminders = reminders.filter(reminder => {
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchFields = [
        reminder.title,
        reminder.entityName,
        reminder.type,
        getModuleLabel(reminder.module)
      ].map(field => field?.toLowerCase());
      
      if (!searchFields.some(field => field?.includes(searchTerm))) {
        return false;
      }
    }
    
    // Filter by status
    if (filters.status !== 'all' && reminder.status !== filters.status) {
      return false;
    }
    
    // Filter by module
    if (filters.module !== 'all' && reminder.module !== filters.module) {
      return false;
    }
    
    return true;
  });

  // Group reminders by module
  const groupedReminders = filteredReminders.reduce((groups, reminder) => {
    const module = reminder.module;
    if (!groups[module]) {
      groups[module] = [];
    }
    groups[module].push(reminder);
    return groups;
  }, {} as Record<string, ReminderItem[]>);

  return (
    <Layout
      title="Notifications & Reminders"
      subtitle="View and manage all system notifications and reminders"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search notifications..."
                icon={<Search className="h-4 w-4" />}
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <div className="w-40">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'normal', label: 'Normal' }
                ]}
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
              />
            </div>
            
            <div className="w-40">
              <Select
                options={[
                  { value: 'all', label: 'All Modules' },
                  { value: 'vehicles', label: 'Vehicles' },
                  { value: 'drivers', label: 'Drivers' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'trips', label: 'Trips' },
                  { value: 'ai_alerts', label: 'AI Alerts' }
                ]}
                value={filters.module}
                onChange={e => setFilters({ ...filters, module: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading notifications...</span>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No notifications found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReminders).map(([module, moduleReminders]) => (
              <div key={module} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Bell className="h-5 w-5 text-primary-500 mr-2" />
                    {getModuleLabel(module)} Notifications ({moduleReminders.length})
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {moduleReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${getStatusColor(reminder.status)}`}
                      onClick={() => handleReminderClick(reminder)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(reminder.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{reminder.title}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {reminder.entityName}
                          </p>
                          {reminder.dueDate && (
                            <div className="flex items-center mt-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span>
                                {new Date(reminder.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            icon={<ExternalLink className="h-3 w-3" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReminderClick(reminder);
                            }}
                          >
                            Go to Record
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;