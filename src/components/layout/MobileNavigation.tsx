import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  Truck, 
  Users, 
  FileText, 
  Wrench, 
  BarChart3,
  Settings,
  Bell
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/trips', label: 'Trips', icon: FileText },
    { path: '/vehicles', label: 'Vehicles', icon: Truck },
    { path: '/drivers', label: 'Drivers', icon: Users },
    { path: '/maintenance', label: 'Maintenance', icon: Wrench },
    { path: '/admin', label: 'Admin', icon: Settings },
    { path: '/notifications', label: 'Alerts', icon: Bell },
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
          'lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200',
          className
        )}
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6 text-gray-600" />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        isActive(item.path)
                          ? 'bg-primary-100 text-primary-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-center">
                Fleet Management System
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;
