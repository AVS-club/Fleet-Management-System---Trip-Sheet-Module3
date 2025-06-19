import React, { useState, useEffect } from 'react';
import { Menu, X, Truck, User, BarChart2, FileText, Shield, AlertTriangle, PenTool as PenToolIcon, Settings, LogOut, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from '../ui/ThemeToggle';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        // This would be replaced with an actual API call in a real application
        // For now, we'll just set a placeholder value
        setNotificationCount(3);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    
    // Set up a polling interval to periodically check for new notifications
    const interval = setInterval(fetchNotificationCount, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <BarChart2 className="h-5 w-5" /> },
    { name: 'Trips', path: '/trips', icon: <FileText className="h-5 w-5" /> },
    { name: 'Maintenance', path: '/maintenance', icon: <PenToolIcon className="h-5 w-5" /> },
    { name: 'Vehicles', path: '/vehicles', icon: <Truck className="h-5 w-5" /> },
    { name: 'Drivers', path: '/drivers', icon: <User className="h-5 w-5" /> },
    { name: 'AI Alerts', path: '/alerts', icon: <AlertTriangle className="h-5 w-5" /> },
    { name: 'Admin', path: '/admin', icon: <Settings className="h-5 w-5" /> }
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${
        scrolled ? 'bg-white dark:bg-gray-900 shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="flex items-center">
                <img
                  src="/assets/logo.png"
                  alt="Auto Vital Solution Logo"
                  className="h-12 w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          <div className="hidden md:flex space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path || 
                  (link.path !== '/' && location.pathname.startsWith(link.path))
                    ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                    : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
            
            {/* Notifications */}
            <Link
              to="/notifications"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>
            
            <div className="flex items-center ml-4">
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden bg-white dark:bg-gray-900 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="container mx-auto px-4 py-2 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                location.pathname === link.path || 
                (link.path !== '/' && location.pathname.startsWith(link.path))
                  ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                  : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
          
          {/* Notifications for mobile */}
          <Link
            to="/notifications"
            className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </Link>
          
          <div className="flex items-center justify-between px-3 py-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;