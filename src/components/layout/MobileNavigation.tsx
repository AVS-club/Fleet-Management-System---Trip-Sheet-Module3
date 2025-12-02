import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  LogOut,
  Globe,
  Moon,
  Sun
} from 'lucide-react';
import AvsAiButton from '../ui/AvsAiButton';
import { cn } from '../../utils/cn';
import { usePermissions } from '../../hooks/usePermissions';
import MobileNavSkeleton from './MobileNavSkeleton';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../utils/themeContext';

interface MobileNavigationProps {
  className?: string;
  onLogout?: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, loading } = usePermissions();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Animated language rotation
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const languages = ['हिंदी', 'தமிழ்', 'मराठी', 'తెలుగు'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLangIndex((prev) => (prev + 1) % languages.length);
    }, 2000); // Change every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // COLORFUL ICON COLORS - Apple-like
  const getIconColor = (path: string) => {
    const colors: Record<string, string> = {
      '/': 'text-blue-500',           // Dashboard - Blue
      '/vehicles': 'text-green-500',  // Vehicles - Green
      '/drivers': 'text-purple-500',  // Drivers - Purple
      '/trips': 'text-orange-500',    // Trips - Orange
      '/trip-pnl-reports': 'text-pink-500', // Reports - Pink
      '/maintenance': 'text-yellow-600',    // Maintenance - Yellow
      '/ai-alerts': 'text-cyan-500',        // AI Alerts - Cyan
      '/admin': 'text-gray-500',            // Settings - Gray
    };
    return colors[path] || 'text-gray-600';
  };

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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <>
      {/* Mobile Menu Button - HIGHER Z-INDEX */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'lg:hidden fixed top-4 left-3 z-[70] p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
          className
        )}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Mobile Menu Overlay - LOWER Z-INDEX */}
      <div className={`lg:hidden fixed inset-0 z-[60] ${isOpen ? '' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isOpen ? 'opacity-50' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel - PUSH TO RIGHT TO AVOID HAMBURGER OVERLAP */}
        <div className={`absolute left-12 top-0 h-full w-72 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 rounded-r-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Menu</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto pb-40">
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
                const iconColor = getIconColor(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path, { replace: true });
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 px-5 py-4 transition-colors text-left rounded-lg mx-2',
                      isActive(item.path)
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className={cn('h-7 w-7', isActive(item.path) ? '' : iconColor)} />
                    <span className="text-base font-medium">{item.label}</span>
                  </button>
                );
              })}

              {/* DIVIDER */}
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

              {/* APPEARANCE / THEME TOGGLE */}
              <button
                onClick={() => {
                  setTheme(theme === 'light' ? 'dark' : 'light');
                }}
                className="w-full flex items-center gap-4 px-5 py-4 transition-colors text-left rounded-lg mx-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {theme === 'light' ? (
                  <Moon className="h-7 w-7 text-indigo-500" />
                ) : (
                  <Sun className="h-7 w-7 text-amber-500" />
                )}
                <span className="text-base font-medium">
                  {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                </span>
              </button>

              {/* ANIMATED LANGUAGE SWITCHER */}
              <button
                onClick={toggleLanguage}
                className="w-full flex items-center gap-4 px-5 py-4 transition-colors text-left rounded-lg mx-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Globe className="h-7 w-7 text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-base font-medium">Language</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 animate-fade">
                    {languages[currentLangIndex]}
                  </span>
                </div>
              </button>
            </div>
            )}
          </nav>

          {/* Footer with Logout */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            {/* Logout Button */}
            <button
              onClick={() => {
                onLogout?.();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-4 px-5 py-4 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium rounded-lg mx-2"
            >
              <LogOut className="h-7 w-7" />
              <span className="text-base">{t('settings.logout') || 'Logout'}</span>
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3 border-t border-gray-200 dark:border-gray-700">
              Fleet Management System
            </p>
          </div>
        </div>
      </div>

      {/* ADD ANIMATION STYLES */}
      <style>{`
        @keyframes fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-fade {
          animation: fade 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default MobileNavigation;
