import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, ChevronRight, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { ReminderItem, getRemindersForAll } from '../../utils/reminders';
import { getAIAlerts } from '../../utils/aiAnalytics';
import { AIAlert } from '../../types';
import Button from '../ui/Button';
import AlertTypeTag from '../alerts/AlertTypeTag';

// Define severity order for sorting
const SEVERITY_ORDER = {
  critical: 0,
  warning: 1,
  normal: 2,
};

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<(ReminderItem | (AIAlert & { isAIAlert: true }))[]>([]);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch all notifications when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchAllNotifications = async () => {
        setLoading(true);
        try {
          // Fetch reminders from all modules
          const reminders = await getRemindersForAll();
          
          // Fetch AI alerts
          const aiAlerts = await getAIAlerts();
          
          // Transform AI alerts to include a marker property
          const formattedAiAlerts = aiAlerts.map(alert => ({
            ...alert,
            isAIAlert: true as const,
            entityName: alert.affected_entity?.type === 'vehicle' ? 
              `Vehicle ${alert.affected_entity.id}` : 
              alert.affected_entity?.type === 'driver' ?
              `Driver ${alert.affected_entity.id}` :
              'Unknown',
            status: alert.severity === 'high' ? 'critical' : 
                   alert.severity === 'medium' ? 'warning' : 'normal',
            link: `/alerts`,
            type: alert.alert_type,
            module: 'alerts' as any
          }));
          
          // Combine and sort all notifications
          const allNotifications = [...reminders, ...formattedAiAlerts];
          
          // Sort by severity first, then by date
          const sortedNotifications = allNotifications.sort((a, b) => {
            // First sort by severity
            const severityA = SEVERITY_ORDER[a.status as keyof typeof SEVERITY_ORDER] || 999;
            const severityB = SEVERITY_ORDER[b.status as keyof typeof SEVERITY_ORDER] || 999;
            
            if (severityA !== severityB) {
              return severityA - severityB;
            }
            
            // Then by date (newest first)
            const dateA = a.dueDate || (a as any).created_at;
            const dateB = b.dueDate || (b as any).created_at;
            
            if (dateA && dateB) {
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            }
            
            return 0;
          });
          
          setNotifications(sortedNotifications);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAllNotifications();
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);
  
  // Focus trap for a11y
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Find all focusable elements
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length) {
        // Set focus on first element
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);
  
  // Function to handle notification click
  const handleNotificationClick = (notification: ReminderItem | (AIAlert & { isAIAlert: true })) => {
    if ('isAIAlert' in notification) {
      // Navigate to AI alerts page
      navigate(`/alerts`);
    } else {
      // Use link from the reminder item
      navigate(notification.link);
    }
    onClose();
  };
  
  // Function to get appropriate icon for notification
  const getNotificationIcon = (notification: ReminderItem | (AIAlert & { isAIAlert: true })) => {
    if ('isAIAlert' in notification) {
      return <AlertTypeTag type={notification.alert_type} />;
    }
    
    // For regular reminders
    switch (notification.status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-error-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning-500" />;
      default:
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500" />;
    }
  };
  
  // Function to get background color based on status
  const getNotificationBgColor = (notification: ReminderItem | (AIAlert & { isAIAlert: true })) => {
    switch (notification.status) {
      case 'critical':
        return 'bg-error-50 border-l-4 border-error-500';
      case 'warning':
        return 'bg-warning-50 border-l-4 border-warning-500';
      default:
        return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-3 sm:p-4">
          <h2 id="notification-modal-title" className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 mr-2" />
            Notifications & Alerts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 p-1 rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-6 sm:p-8">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-sm sm:text-base text-gray-600">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-6 sm:p-8">
              <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm sm:text-base text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.slice(0, 10).map((notification, index) => (
                <div 
                  key={index} 
                  className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 ${getNotificationBgColor(notification)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium text-sm sm:text-base text-gray-900 line-clamp-1">
                        {'isAIAlert' in notification ? notification.title : notification.title}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-1">
                        {notification.entityName}
                      </p>
                      {('dueDate' in notification && notification.dueDate) && (
                        <div className="flex items-center mt-1 sm:mt-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span>{new Date(notification.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {'description' in notification && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 self-center" />
                  </div>
                </div>
              ))}
              
              {notifications.length > 10 && (
                <div className="p-2 bg-gray-50 text-center text-xs sm:text-sm text-gray-500">
                  {notifications.length - 10} more notifications
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-3 sm:p-4 sticky bottom-0 bg-white">
          <Button
            variant="primary"
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
            className="w-full"
          >
            View All Notifications
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;