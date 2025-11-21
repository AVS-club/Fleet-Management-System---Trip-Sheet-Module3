import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Truck,
  Users,
  MapPin,
  FileText,
  Wrench,
  BarChart3,
  Settings,
  Bell,
  ShieldCheck
} from 'lucide-react';
import AvsAiButton from '../ui/AvsAiButton';
import { cn } from '../../utils/cn';
import { usePermissions } from '../../hooks/usePermissions';
import MobileNavSkeleton from './MobileNavSkeleton';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, loading } = usePermissions();

  // Comprehensive navigation items for mobile hamburger menu
  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Home, requiresPermission: 'canAccessDashboard' },
    { path: '/vehicles', label: 'Vehicles', icon: Truck },
    { path: '/drivers', label: 'Drivers', icon: Users },
    { path: '/trips', label: 'Trips', icon: MapPin },
    { path: '/trip-pnl-reports', label: 'Reports', icon: BarChart3, requiresPermission: 'canAccessReports' },
    { path: '/maintenance', label: 'Maintenance', icon: Wrench },
    { path: '/ai-alerts', label: 'AI Alerts', icon: Bell, customComponent: AvsAiButton, requiresPermission: 'canAccessAlerts' },
    { path: '/admin', label: 'Settings', icon: Settings, requiresPermission: 'canAccessAdmin' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'lg:hidden fixed top-4 left-3 z-[60] p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
          className
        )}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isOpen ? 'opacity-50' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel */}
        <div className={`absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Navigation</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto">
            {loading ? (
              <MobileNavSkeleton />
            ) : (
            <div className="py-4">
              {navigationItems.map((item) => {
                // Hide permission-restricted items by default while loading
                if (item.requiresPermission && loading) {
                  return null;
                }
                
                // Check if user has permission to view this nav item after loading
                if (item.requiresPermission && permissions && !(permissions as any)[item.requiresPermission]) {
                  return null;
                }

                // Special handling for custom components (like AI Alerts Button)
                if (item.customComponent) {
                  const CustomComponent = item.customComponent;
                  return (
                    <div key={item.path} className="px-4 py-2">
                      <CustomComponent
                        onClick={() => {
                          navigate(item.path);
                          setIsOpen(false);
                        }}
                        label={item.label}
                        variant="compact"
                        isActive={isActive(item.path)}
                        className="w-full"
                      />
                    </div>
                  );
                }

                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path, { replace: true });
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                      isActive(item.path)
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-3 border-blue-600 dark:border-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            )}
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Fleet Management System
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
