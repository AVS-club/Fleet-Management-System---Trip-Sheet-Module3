import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Truck, 
  Users, 
  Route,
  Bell,
  MoreHorizontal
} from 'lucide-react';

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    {
      path: '/dashboard',
      icon: Home,
      label: t('navigation.dashboard'),
      activePattern: /^\/dashboard/
    },
    {
      path: '/vehicles',
      icon: Truck,
      label: t('navigation.vehicles'),
      activePattern: /^\/vehicles/
    },
    {
      path: '/trips',
      icon: Route,
      label: t('navigation.trips'),
      activePattern: /^\/trips/
    },
    {
      path: '/alerts',
      icon: Bell,
      label: t('navigation.alerts'),
      activePattern: /^\/alerts/,
      badge: 5 // You can make this dynamic
    },
    {
      path: '/more',
      icon: MoreHorizontal,
      label: 'More',
      activePattern: /^\/more/
    }
  ];

  const isActive = (pattern: RegExp) => {
    return pattern.test(location.pathname);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden under the nav */}
      <div className="h-20 md:hidden" />
      
      {/* Fixed Bottom Navigation - Only visible on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 shadow-2xl z-50 md:hidden">
        <div className="flex justify-around items-center h-20 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.activePattern);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  active 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-2 right-1/4 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
                
                {/* Icon */}
                <Icon 
                  className={`h-7 w-7 mb-1 transition-all ${
                    active ? 'scale-110' : 'scale-100'
                  }`} 
                />
                
                {/* Label */}
                <span className={`text-xs font-medium ${
                  active ? 'font-bold' : 'font-normal'
                }`}>
                  {item.label}
                </span>
                
                {/* Active indicator */}
                {active && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-600 dark:bg-primary-400 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
