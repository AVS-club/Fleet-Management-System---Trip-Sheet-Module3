import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ChevronRight, AlertTriangle, Clock, Calendar, ExternalLink } from 'lucide-react';
import { ReminderModule, ReminderItem, getRemindersFor } from '../../utils/reminders';
import Button from '../ui/Button';

interface NotificationsPanelProps {
  module: ReminderModule;
  onClose: () => void;
  maxItems?: number;
  scrollable?: boolean;
  height?: number;
  showViewAll?: boolean;
}

const NotificationsPanel = forwardRef<HTMLDivElement, NotificationsPanelProps>(
  ({ module, onClose, maxItems = 5, scrollable = true, height = 300, showViewAll = true }, ref) => {
    const [reminders, setReminders] = useState<ReminderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
      const fetchReminders = async () => {
        setLoading(true);
        try {
          const items = await getRemindersFor(module);
          setReminders(items);
        } catch (error) {
          console.error(`Error fetching ${module} reminders:`, error);
        } finally {
          setLoading(false);
        }
      };

      fetchReminders();
    }, [module]);

    const handleReminderClick = (reminder: ReminderItem) => {
      navigate(reminder.link);
      onClose();
    };

    const handleViewAll = () => {
      navigate('/notifications');
      onClose();
    };

    const getModuleTitle = () => {
      switch (module) {
        case 'vehicles':
          return 'Vehicle Notifications';
        case 'drivers':
          return 'Driver Notifications';
        case 'maintenance':
          return 'Maintenance Notifications';
        case 'trips':
          return 'Trip Notifications';
        default:
          return 'Notifications';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'critical':
          return <AlertTriangle className="h-4 w-4 text-error-500" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4 text-warning-500" />;
        default:
          return <Clock className="h-4 w-4 text-success-500" />;
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

    // Show only the top N most urgent reminders
    const displayedReminders = reminders.slice(0, maxItems);
    const hasMoreReminders = reminders.length > maxItems;

    return (
      <div
        ref={ref}
        className="absolute right-0 mt-2 w-full sm:w-[300px] max-w-xs bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <Bell className="h-4 w-4 text-primary-500 mr-2" />
            <h3 className="font-medium text-xs sm:text-sm text-gray-900">{getModuleTitle()}</h3>
            <span className="ml-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-gray-200 text-gray-700">
              {reminders.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div 
          className={`${scrollable ? `overflow-y-auto` : ''}`} 
          style={{ maxHeight: scrollable ? `${height}px` : 'auto' }}
        >
          {loading ? (
            <div className="flex justify-center items-center p-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-2 text-center">
              <Bell className="h-6 w-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-2 hover:bg-gray-50 cursor-pointer ${getStatusColor(reminder.status)}`}
                  onClick={() => handleReminderClick(reminder)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(reminder.status)}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs sm:text-sm font-medium break-words max-w-full truncate" title={reminder.title}>
                        {reminder.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 break-words max-w-full truncate" title={reminder.entityName}>
                        {reminder.entityName}
                      </p>
                      {reminder.dueDate && (
                        <div className="flex items-center mt-1 text-[10px] sm:text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="break-words max-w-full">
                            {new Date(reminder.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {showViewAll && (hasMoreReminders || reminders.length > 0) && (
          <div className="p-1.5 sm:p-2 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs sm:text-sm"
              onClick={handleViewAll}
              icon={<ExternalLink className="h-4 w-4" />}
            >
              View All {reminders.length > 0 ? `(${reminders.length})` : ''}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

NotificationsPanel.displayName = 'NotificationsPanel';

export default NotificationsPanel;